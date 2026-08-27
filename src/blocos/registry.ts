import { comoRefs, type RefVisual } from "./_shared/format";
import { blocosGerados } from "./registry.generated";
import type { BlocoData, BlocoDefinition, FieldDef } from "./types";

/**
 * Leitura do registro gerado e normalização dos dados.
 *
 * Ninguém importa uma pasta de bloco diretamente: tudo passa por aqui, e por
 * isso acrescentar uma pasta não obriga a editar arquivo nenhum.
 */

const blocos = (blocosGerados as unknown as BlocoDefinition[])
  .slice()
  .sort((a, b) => a.ordem - b.ordem);

const porId = new Map<string, BlocoDefinition>();
for (const bloco of blocos) {
  if (porId.has(bloco.id)) {
    throw new Error(
      `Bloco duplicado: "${bloco.id}". Cada pasta em src/blocos precisa de um id único.`,
    );
  }
  porId.set(bloco.id, bloco);
}

export const BLOCOS: readonly BlocoDefinition[] = blocos;

export function getBloco(id: string): BlocoDefinition | undefined {
  return porId.get(id);
}

/** Valor inicial de um campo, respeitando o tipo declarado. */
function valorVazio(field: FieldDef): unknown {
  switch (field.type) {
    case "list":
    case "images":
    case "colors":
    case "tags":
      return [];
    case "axis":
      // `null` e não `0`: não definido é diferente de "quero no meio".
      return null;
    case "checkbox":
      return false;
    default:
      // text, textarea, select, documento
      return "";
  }
}

function normalizaItem(fields: FieldDef[], fonte: unknown): BlocoData {
  const origem = (fonte && typeof fonte === "object" ? fonte : {}) as BlocoData;
  const saida: BlocoData = {};
  for (const sub of fields) {
    saida[sub.key] = origem[sub.key] ?? valorVazio(sub);
  }
  return saida;
}

const CAMPOS_REF: FieldDef[] = [
  { key: "assetId", label: "Imagem", type: "text" },
  { key: "nota", label: "O que me atrai nela", type: "text" },
];

const CAMPOS_COR: FieldDef[] = [
  { key: "hex", label: "Cor", type: "text" },
  { key: "nome", label: "Nome", type: "text" },
  { key: "uso", label: "Uso", type: "text" },
];

/**
 * Garante que os dados salvos tenham exatamente as chaves declaradas pelo bloco.
 *
 * Campo novo entra vazio, campo removido é descartado — um bloco evolui sem
 * quebrar projetos antigos e sem tocar no banco. `migrate` roda antes de tudo,
 * para que um campo que deixou de existir consiga passar o conteúdo a quem o
 * substituiu antes de o laço abaixo o jogar fora.
 */
export function normalizeBlocoData(tipo: string, raw: unknown): BlocoData {
  const bloco = getBloco(tipo);
  if (!bloco) return {};
  const bruto = (raw && typeof raw === "object" ? raw : {}) as BlocoData;
  const entrada = bloco.migrate ? bloco.migrate(bruto) : bruto;
  const saida: BlocoData = {};

  for (const field of bloco.fields) {
    const valor = entrada[field.key];

    switch (field.type) {
      case "list":
        saida[field.key] = (Array.isArray(valor) ? valor : []).map((item) =>
          normalizaItem(field.itemFields ?? [], item),
        );
        break;
      case "images":
        saida[field.key] = (Array.isArray(valor) ? valor : []).map((item) =>
          normalizaItem(CAMPOS_REF, item),
        );
        break;
      case "colors":
        saida[field.key] = (Array.isArray(valor) ? valor : []).map((item) =>
          normalizaItem(CAMPOS_COR, item),
        );
        break;
      case "tags":
        saida[field.key] = Array.isArray(valor)
          ? valor.filter((item): item is string => typeof item === "string")
          : [];
        break;
      case "axis":
        saida[field.key] =
          typeof valor === "number" && Number.isFinite(valor)
            ? Math.max(-3, Math.min(3, Math.round(valor)))
            : null;
        break;
      case "checkbox":
        saida[field.key] = valor === true;
        break;
      default:
        saida[field.key] = valor === undefined || valor === null ? valorVazio(field) : valor;
    }
  }

  return saida;
}

/** Cópia profunda dos defaults, para que blocos não compartilhem referências. */
export function createDefaultData(tipo: string): BlocoData {
  const bloco = getBloco(tipo);
  if (!bloco) return {};
  return structuredClone(bloco.defaults) as BlocoData;
}

/**
 * Quanto do bloco está preenchido, de 0 a 1.
 *
 * Calculado a partir dos campos declarados — nenhuma pasta precisa informar o
 * próprio peso. Um eixo não tocado conta como vazio de propósito: a barra de
 * progresso mede o quanto você disse, não o quanto o app consegue gerar.
 */
export function progressoDoBloco(tipo: string, data: BlocoData): number {
  const bloco = getBloco(tipo);
  if (!bloco || bloco.fields.length === 0) return 0;
  let preenchidos = 0;
  for (const field of bloco.fields) {
    const valor = data[field.key];
    const cheio =
      field.type === "axis"
        ? typeof valor === "number"
        : field.type === "checkbox"
          ? true // um booleano sempre tem resposta; não pesa contra o progresso
          : Array.isArray(valor)
            ? valor.length > 0
            : typeof valor === "string" && valor.trim().length > 0;
    if (cheio) preenchidos += 1;
  }
  return preenchidos / bloco.fields.length;
}

export interface BlocoSalvo {
  tipo: string;
  data: BlocoData;
}

/**
 * Monta o briefing completo que a IA lê.
 *
 * Cada bloco traduz os próprios campos; aqui só se junta o que não veio vazio,
 * na ordem declarada. Nenhuma regra de domínio mora nesta função — se ela
 * precisasse saber que "Cores" vem depois de "Tipografia", o contrato teria
 * furado.
 */
export function montarBriefing(salvos: BlocoSalvo[], nomeDaMarca: string): string {
  const porTipo = new Map(salvos.map((item) => [item.tipo, item.data]));
  const partes: string[] = [`# Briefing — ${nomeDaMarca || "marca sem nome"}`];

  for (const bloco of blocos) {
    const data = normalizeBlocoData(bloco.id, porTipo.get(bloco.id) ?? {});
    const texto = bloco.toPrompt(data as never).trim();
    if (texto) partes.push(texto);
  }

  return partes.join("\n\n");
}

/**
 * Todas as referências visuais do projeto, varrendo os campos do tipo `images`.
 *
 * Genérico de propósito: um bloco novo que declare um campo de imagem entra
 * automaticamente no payload enviado ao modelo, sem que esta função saiba que
 * ele existe.
 */
export function refsVisuaisDoProjeto(salvos: BlocoSalvo[]): RefVisual[] {
  const porTipo = new Map(salvos.map((item) => [item.tipo, item.data]));
  const refs: RefVisual[] = [];
  for (const bloco of blocos) {
    const data = porTipo.get(bloco.id);
    if (!data) continue;
    for (const field of bloco.fields) {
      if (field.type !== "images") continue;
      refs.push(...comoRefs(data[field.key]));
    }
  }
  return refs;
}
