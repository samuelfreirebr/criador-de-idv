import { z } from "zod";
import { route } from "@/lib/api";
import { preencherBlocos } from "@/lib/preenchimento";

type Ctx = { params: Promise<{ id: string }> };

// Corpo opcional: a primeira leitura não é variação de nada.
const Pedido = z.object({ variacao: z.boolean().default(false) });

export const POST = route<Ctx>(async ({ context, request }) => {
  const { id } = await context.params;

  const corpo = await request
    .clone()
    .json()
    .then((bruto) => Pedido.parse(bruto))
    .catch(() => ({ variacao: false }));

  return { blocos: await preencherBlocos(id, corpo.variacao) };
});
