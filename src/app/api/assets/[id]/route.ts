import { NextResponse } from "next/server";
import { naoEncontrado, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async ({ context }) => {
  const { id } = await context.params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw naoEncontrado("Imagem");

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(asset.size),
      // O conteúdo de um id nunca muda: o cache pode ser longo e privado —
      // privado porque a resposta depende do cookie de sessão.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
