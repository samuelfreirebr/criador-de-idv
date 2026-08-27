#!/usr/bin/env node
/**
 * Banco de dados local, sem instalar nada no sistema.
 *
 * Em produção o Postgres é um container da stack do Portainer, com volume
 * próprio. Este script existe só para o desenvolvimento numa máquina sem
 * Docker: usa os binários que o pacote `embedded-postgres` traz para dentro de
 * node_modules e guarda os dados em `.banco-local/`, que é ignorado pelo git.
 *
 *   node scripts/banco-local.mjs iniciar
 *   node scripts/banco-local.mjs parar
 *   node scripts/banco-local.mjs status
 *
 * É a MESMA versão de Postgres do container, então o que funciona aqui
 * funciona lá — que é o motivo de não trocar por SQLite.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(raiz, "node_modules", "@embedded-postgres", "darwin-arm64", "native", "bin");
const dados = join(raiz, ".banco-local", "data");
const log = join(raiz, ".banco-local", "postgres.log");

const USUARIO = "idpro";
const PORTA = process.env.PORTA_BANCO ?? "5432";

function rodar(programa, argumentos) {
  const resultado = spawnSync(join(bin, programa), argumentos, {
    encoding: "utf8",
    // O `postgres` embutido carrega bibliotecas de `native/lib`; sem este
    // caminho ele não encontra o OpenSSL que veio junto.
    env: { ...process.env, DYLD_LIBRARY_PATH: join(bin, "..", "lib") },
  });
  return resultado;
}

function iniciar() {
  if (!existsSync(join(bin, "postgres"))) {
    console.error("[banco] binários não encontrados. Rode `npm install` primeiro.");
    process.exit(1);
  }

  if (!existsSync(dados)) {
    mkdirSync(dirname(dados), { recursive: true });
    console.log("[banco] criando o banco pela primeira vez…");
    // `trust`: qualquer conexão local entra sem senha. É seguro aqui porque o
    // servidor só escuta em localhost e os dados são descartáveis; em produção
    // quem manda é a senha da stack.
    const init = rodar("initdb", [
      "-D", dados,
      "-U", USUARIO,
      "--auth=trust",
      "--encoding=UTF8",
      "--locale=C",
    ]);
    if (init.status !== 0) {
      console.error(init.stderr || init.stdout);
      process.exit(1);
    }
  }

  const start = rodar("pg_ctl", [
    "-D", dados,
    "-l", log,
    "-o", `-p ${PORTA} -k /tmp`,
    "-w",
    "start",
  ]);

  if (start.status !== 0) {
    console.error(start.stderr || start.stdout);
    console.error(`[banco] veja o log em ${log}`);
    process.exit(1);
  }

  console.log(`[banco] de pé em localhost:${PORTA}`);
  console.log(`[banco] DATABASE_URL="postgresql://${USUARIO}@localhost:${PORTA}/postgres?schema=public"`);
}

function parar() {
  const resultado = rodar("pg_ctl", ["-D", dados, "-m", "fast", "stop"]);
  console.log(resultado.stdout || resultado.stderr || "[banco] parado.");
}

function status() {
  const resultado = rodar("pg_ctl", ["-D", dados, "status"]);
  console.log(resultado.stdout || resultado.stderr);
}

const comando = process.argv[2] ?? "iniciar";
if (comando === "iniciar") iniciar();
else if (comando === "parar") parar();
else if (comando === "status") status();
else {
  console.error(`[banco] comando desconhecido: ${comando}. Use iniciar, parar ou status.`);
  process.exit(1);
}
