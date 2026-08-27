import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { garantirBlocos, listarProjetos } from "@/lib/queries";

export const GET = route(async () => listarProjetos());

const Novo = z.object({ nome: z.string().min(1).max(120) });

export const POST = route(async ({ request }) => {
  const { nome } = await parseBody(request, Novo);
  const projeto = await prisma.projeto.create({ data: { nome: nome.trim() } });
  // Os blocos nascem junto: um projeto sem blocos abriria o briefing vazio e
  // faria a primeira digitação depender de um PATCH que criasse o registro.
  await garantirBlocos(projeto.id);
  return { id: projeto.id };
});
