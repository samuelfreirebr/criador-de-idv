import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { gerarPrompt } from "@/lib/geracao";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// O corpo é opcional: a primeira geração não tem ajuste nenhum.
const Pedido = z.object({ ajuste: z.string().max(1000).default("") });

export const POST = route<Ctx>(async ({ context, request }) => {
  const { id } = await context.params;

  const corpo = await request
    .clone()
    .json()
    .then((bruto) => Pedido.parse(bruto))
    .catch(() => ({ ajuste: "" }));

  const promptId = await gerarPrompt(id, corpo.ajuste);
  const prompt = await prisma.prompt.findUniqueOrThrow({ where: { id: promptId } });

  return {
    id: prompt.id,
    titulo: prompt.titulo,
    texto: prompt.texto,
    ajuste: prompt.ajuste,
    temConfiguracao: prompt.configuracao !== null,
    json: prompt.json ?? null,
    atualizadoEm: prompt.updatedAt.toISOString(),
  };
});
