import { getBloco, normalizeBlocoData } from "@/blocos/registry";
import { HttpError, naoEncontrado, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { BlocoDTO } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Devolve ao projeto o briefing que originou este prompt.
 *
 * A fotografia é reescrita bloco a bloco, passando pela normalização: se um
 * bloco foi renomeado ou removido do registro desde que ela foi tirada, ele é
 * simplesmente ignorado em vez de ressuscitar um formato que o app já não sabe
 * desenhar.
 */
export const POST = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;

  const prompt = await prisma.prompt.findUnique({
    where: { id },
    include: { ideia: { select: { projetoId: true } } },
  });
  if (!prompt) throw naoEncontrado("Prompt");

  if (!Array.isArray(prompt.configuracao)) {
    throw new HttpError(
      422,
      "Este prompt foi criado antes desta funcionalidade e não guardou o briefing.",
    );
  }

  const projetoId = prompt.ideia.projetoId;
  const restaurados: BlocoDTO[] = [];

  for (const item of prompt.configuracao as { tipo?: unknown; data?: unknown }[]) {
    const tipo = typeof item?.tipo === "string" ? item.tipo : "";
    if (!tipo || !getBloco(tipo)) continue;

    const data = normalizeBlocoData(tipo, item.data);
    await prisma.bloco.upsert({
      where: { projetoId_tipo: { projetoId, tipo } },
      create: { projetoId, tipo, data: data as object },
      update: { data: data as object },
    });
    restaurados.push({ tipo, data });
  }

  await prisma.projeto.update({ where: { id: projetoId }, data: { updatedAt: new Date() } });

  return { blocos: restaurados };
});
