import { route } from "@/lib/api";
import { traduzirPrompt } from "@/lib/geracao";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;
  return { json: await traduzirPrompt(id) };
});
