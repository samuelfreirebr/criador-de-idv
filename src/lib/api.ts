import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import { getSessionUser, type SessionUser } from "./auth";

/** Erro de domínio com status HTTP — capturado por `route()`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const naoEncontrado = (o = "Recurso") => new HttpError(404, `${o} não encontrado.`);

/**
 * Envelopa um handler de rota: exige sessão, converte erros conhecidos em
 * respostas JSON e evita repetir try/catch em todas as rotas.
 */
export function route<TContext>(
  handler: (args: {
    user: SessionUser;
    context: TContext;
    request: Request;
  }) => Promise<unknown>,
) {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const user = await getSessionUser();
      if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

      const resultado = await handler({ user, context, request });
      if (resultado instanceof NextResponse) return resultado;
      return NextResponse.json(resultado ?? { ok: true });
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Dados inválidos.", issues: error.flatten().fieldErrors },
          { status: 422 },
        );
      }
      console.error("[api] erro não tratado:", error);
      return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
  };
}

// O genérico é o próprio schema para que `output<S>` preserve os `.default()`.
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<output<S>> {
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }
  return schema.parse(bruto);
}
