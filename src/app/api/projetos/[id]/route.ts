import { z } from "zod";
import { naoEncontrado, parseBody, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const Alteracao = z.object({ nome: z.string().min(1).max(120) });

export const PATCH = route<Ctx>(async ({ request, context }) => {
  const { id } = await context.params;
  const { nome } = await parseBody(request, Alteracao);
  const projeto = await prisma.projeto.findUnique({ where: { id }, select: { id: true } });
  if (!projeto) throw naoEncontrado("Projeto");

  await prisma.projeto.update({ where: { id }, data: { nome: nome.trim() } });
  return { ok: true };
});

export const DELETE = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;
  await prisma.projeto.delete({ where: { id } }).catch(() => {
    throw naoEncontrado("Projeto");
  });
  return { ok: true };
});
