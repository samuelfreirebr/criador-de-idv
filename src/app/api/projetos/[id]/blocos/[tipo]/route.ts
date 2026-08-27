import { z } from "zod";
import { getBloco, normalizeBlocoData } from "@/blocos/registry";
import { HttpError, naoEncontrado, parseBody, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string; tipo: string }> };

const Alteracao = z.object({ data: z.record(z.unknown()) });

/**
 * Destino do autosave.
 *
 * A normalização roda no SERVIDOR antes de gravar: o cliente pode mandar
 * qualquer coisa, e é aqui que os dados passam a ter exatamente as chaves que
 * o bloco declara. Confiar no formato enviado pelo formulário deixaria o banco
 * à mercê de uma aba aberta com uma versão antiga do app.
 */
export const PATCH = route<Ctx>(async ({ request, context }) => {
  const { id, tipo } = await context.params;
  if (!getBloco(tipo)) throw new HttpError(400, `Bloco desconhecido: "${tipo}".`);

  const { data } = await parseBody(request, Alteracao);
  const projeto = await prisma.projeto.findUnique({ where: { id }, select: { id: true } });
  if (!projeto) throw naoEncontrado("Projeto");

  const normalizado = normalizeBlocoData(tipo, data);

  await prisma.bloco.upsert({
    where: { projetoId_tipo: { projetoId: id, tipo } },
    create: { projetoId: id, tipo, data: normalizado as object },
    update: { data: normalizado as object },
  });

  // Mexer no briefing atualiza o projeto: é o que mantém a lista ordenada por
  // "onde eu estava trabalhando".
  await prisma.projeto.update({ where: { id }, data: { updatedAt: new Date() } });

  return { ok: true };
});
