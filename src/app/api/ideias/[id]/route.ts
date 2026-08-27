import { z } from "zod";
import { naoEncontrado, parseBody, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const Alteracao = z.object({
  veredito: z.enum(["neutro", "amei", "descartei"]).optional(),
  comentario: z.string().max(1000).optional(),
});

export const PATCH = route<Ctx>(async ({ request, context }) => {
  const { id } = await context.params;
  const alteracao = await parseBody(request, Alteracao);

  const ideia = await prisma.ideia.findUnique({ where: { id }, select: { id: true } });
  if (!ideia) throw naoEncontrado("Ideia");

  await prisma.ideia.update({ where: { id }, data: alteracao });
  return { ok: true };
});
