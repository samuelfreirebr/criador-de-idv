#!/usr/bin/env node
/**
 * Varre `src/blocos/<Pasta>/index.ts` e gera `src/blocos/registry.generated.ts`.
 *
 * É isto que torna verdadeira a regra da arquitetura: para acrescentar uma
 * seção ao briefing basta criar uma pasta. Nenhum arquivo existente é editado —
 * este script reescreve o registro antes de `dev` e de `build`.
 *
 * Pasta iniciada por `_` não é registrada: é assim que `_shared/` convive com
 * as pastas de bloco sem virar uma delas.
 */
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const blocosDir = join(root, "src", "blocos");
const outFile = join(blocosDir, "registry.generated.ts");

const pastas = readdirSync(blocosDir)
  .filter((nome) => {
    if (nome.startsWith("_")) return false;
    const completo = join(blocosDir, nome);
    if (!statSync(completo).isDirectory()) return false;
    return existsSync(join(completo, "index.ts")) || existsSync(join(completo, "index.tsx"));
  })
  .sort();

if (pastas.length === 0) {
  console.error("[blocos] nenhuma pasta de bloco encontrada em src/blocos");
  process.exit(1);
}

const imports = pastas.map((p, i) => `import bloco${i} from "./${p}";`).join("\n");
const lista = pastas.map((_, i) => `  bloco${i},`).join("\n");

const conteudo = `// ARQUIVO GERADO AUTOMATICAMENTE — NÃO EDITE.
// Regenerado por \`npm run blocos:sync\` (roda em predev e prebuild).
// Origem: pastas encontradas em src/blocos/
import type { BlocoDefinition } from "./types";

${imports}

export const blocosGerados: BlocoDefinition<never>[] = [
${lista}
] as unknown as BlocoDefinition<never>[];
`;

// Só reescreve quando muda, para não sujar o histórico do git a cada `npm run dev`.
const anterior = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
if (anterior !== conteudo) writeFileSync(outFile, conteudo, "utf8");

console.log(`[blocos] ${pastas.length} bloco(s) registrado(s): ${pastas.join(", ")}`);
