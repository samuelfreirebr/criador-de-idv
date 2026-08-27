import { naoEncontrado, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Apaga uma rodada inteira: as ideias e os prompts vão junto, por cascata.
 *
 * Não é o mesmo que descartar uma ideia. "Descartei" mantém o registro e
 * alimenta a rodada seguinte com o que evitar; apagar remove da história, e a
 * IA volta a poder propor aquele território.
 */
export const DELETE = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;
  await prisma.rodada.delete({ where: { id } }).catch(() => {
    throw naoEncontrado("Rodada");
  });
  return { ok: true };
});
