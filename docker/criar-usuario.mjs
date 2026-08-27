#!/usr/bin/env node
/**
 * Cria ou atualiza o administrador a partir das variáveis da stack.
 *
 * Roda a cada boot de propósito: é assim que se troca a senha do admin sem
 * abrir o banco — muda-se a variável no Portainer e reimplanta. Sem
 * ADMIN_EMAIL e ADMIN_PASSWORD o script sai em silêncio, para que o container
 * suba normalmente num ambiente que já tenha usuários.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const senha = process.env.ADMIN_PASSWORD ?? "";
const nome = (process.env.ADMIN_NAME ?? "Administrador").trim();

if (!email || !senha) {
  console.log("[admin] ADMIN_EMAIL/ADMIN_PASSWORD ausentes — nada a fazer.");
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: nome, passwordHash },
    update: { name: nome, passwordHash },
  });
  console.log(`[admin] usuário garantido: ${email}`);
} catch (erro) {
  console.error("[admin] falha ao criar o usuário:", erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
