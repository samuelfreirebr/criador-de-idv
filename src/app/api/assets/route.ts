import { NextResponse } from "next/server";
import { HttpError, route } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** 8 MB por referência. Acima disso o base64 enviado ao modelo fica caro sem ganho. */
const TAMANHO_MAXIMO = 8 * 1024 * 1024;

const MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

export const POST = route(async ({ request }) => {
  const form = await request.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Envio inválido.");

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) throw new HttpError(400, "Nenhum arquivo enviado.");

  if (!MIMES.has(arquivo.type)) {
    throw new HttpError(415, "Formato não aceito. Use PNG, JPG, WebP, GIF ou AVIF.");
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new HttpError(413, "Imagem maior que 8 MB.");
  }

  // As dimensões vêm do cliente, que já carregou a imagem para exibir a
  // miniatura. Redecodificá-la no servidor só para medir custaria uma
  // dependência de processamento de imagem que nada mais neste app usa.
  const largura = Number(form.get("largura") ?? 0);
  const altura = Number(form.get("altura") ?? 0);

  const asset = await prisma.asset.create({
    data: {
      mime: arquivo.type,
      size: arquivo.size,
      largura: Number.isFinite(largura) ? Math.round(largura) : 0,
      altura: Number.isFinite(altura) ? Math.round(altura) : 0,
      data: Buffer.from(await arquivo.arrayBuffer()),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: asset.id }, { status: 201 });
});
