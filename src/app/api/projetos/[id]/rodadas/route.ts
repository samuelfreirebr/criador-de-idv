import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { gerarIdeias } from "@/lib/geracao";
import { prisma } from "@/lib/prisma";
import { carregarRodada } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

const Pedido = z.object({
  quantidade: z.number().int().min(1).max(12).default(6),
  instrucao: z.string().max(1000).default(""),
});

export const POST = route<Ctx>(async ({ request, context }) => {
  const { id } = await context.params;
  const { quantidade, instrucao } = await parseBody(request, Pedido);
  const rodadaId = await gerarIdeias(id, quantidade, instrucao);
  // Devolve a rodada inteira, e não só o id: o painel a insere no estado sem
  // uma segunda ida ao servidor — que apareceria como um piscar depois de uma
  // espera que já foi longa.
  return { rodada: await carregarRodada(rodadaId) };
});

/**
 * Zera as ideias do projeto: todas as rodadas, ideias e prompts.
 *
 * O briefing não é tocado — quem quer recomeçar as ideias raramente quer
 * reescrever o briefing também. E como isto apaga os prompts, apaga junto as
 * fotografias de briefing que eles guardavam: a tela avisa antes.
 */
export const DELETE = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;
  const { count } = await prisma.rodada.deleteMany({ where: { projetoId: id } });
  await prisma.projeto.update({ where: { id }, data: { status: "rascunho" } });
  return { rodadasApagadas: count };
});
