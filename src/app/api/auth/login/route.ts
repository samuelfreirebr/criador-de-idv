import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

/**
 * Fora do envelope `route()` de propósito: é a única rota que não pode exigir
 * sessão, porque é ela que a cria.
 */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = Schema.safeParse(corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 422 });
  }

  let user: { id: string; email: string; name: string; passwordHash: string } | null;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });
  } catch (erro) {
    // Sem este bloco, um banco fora do ar virava exceção não tratada: o Next
    // respondia com uma página de erro em HTML, o formulário não conseguia
    // ler JSON e mostrava "falha de conexão" — apontando para a rede, que
    // estava perfeita. A causa real precisa chegar à tela.
    console.error("[login] banco indisponível:", erro);
    return NextResponse.json(
      { error: "O banco de dados não respondeu. Confira se o Postgres está de pé e se DATABASE_URL está correta." },
      { status: 503 },
    );
  }

  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entrega ao atacante a lista de e-mails válidos.
  const senhaCorreta = user
    ? await bcrypt.compare(parsed.data.senha, user.passwordHash)
    : false;

  if (!user || !senhaCorreta) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  await setSessionCookie(
    await createSessionToken({ id: user.id, email: user.email, name: user.name }),
  );

  return NextResponse.json({ ok: true });
}
