import { z } from "zod";

/**
 * O contrato do card de ideia.
 *
 * Esta lista é o único lugar onde os campos existem. Dela saem três coisas:
 *   1. o JSON Schema que a OpenAI é obrigada a respeitar na resposta;
 *   2. a validação Zod do que voltou;
 *   3. os rótulos e a ordem de exibição no card.
 *
 * A `descricao` de cada campo é literalmente a instrução que o modelo lê. Ter
 * a instrução colada ao campo é o que impede o caso clássico: alguém acrescenta
 * um campo, esquece de descrevê-lo no prompt, e o modelo devolve uma frase
 * genérica ali para sempre.
 */
export const CAMPOS_IDEIA = [
  {
    key: "nome",
    label: "Conceito",
    descricao:
      "Nome curto do conceito, em português, 1 a 3 palavras. Não é o nome da marca — é o apelido desta direção criativa.",
  },
  {
    key: "ideiaCentral",
    label: "Ideia central",
    descricao:
      "Uma única frase dizendo qual é a ideia. Se precisar de duas frases, a ideia ainda não está clara.",
  },
  {
    key: "simbolo",
    label: "O símbolo",
    descricao:
      "Descrição visual e concreta da forma: o que se vê, como é construída, que gesto a origina, como o espaço negativo participa. Descreva o desenho, não o sentimento.",
  },
  {
    key: "gesto",
    label: "Gesto assinatura",
    descricao:
      "O detalhe geométrico que se repete e vira a impressão digital da marca — um corte, uma curva, uma terminação. Precisa poder reaparecer nas letras e no padrão.",
  },
  {
    key: "tipografia",
    label: "Tipografia",
    descricao:
      "A direção tipográfica desta ideia e o que nela é desenhado sob medida. Se o briefing fixou fontes, trabalhe dentro delas.",
  },
  {
    key: "cores",
    label: "Cores",
    descricao:
      "A direção cromática desta ideia. Se o briefing fixou a paleta, use-a; se não, proponha cores com nome e código hexadecimal.",
  },
  {
    key: "porQue",
    label: "Por que funciona",
    descricao:
      "Por que esta ideia serve a ESTE briefing — ligue a um ponto específico do público, do posicionamento ou da origem do nome. Nada de elogio genérico.",
  },
] as const;

export type ChaveIdeia = (typeof CAMPOS_IDEIA)[number]["key"];

export type DadosIdeia = Record<ChaveIdeia, string>;

/** Validação do que voltou do modelo. */
export const IdeiaSchema = z.object(
  Object.fromEntries(
    CAMPOS_IDEIA.map((campo) => [campo.key, z.string().default("")]),
  ) as Record<ChaveIdeia, z.ZodDefault<z.ZodString>>,
);

export const RespostaIdeiasSchema = z.object({
  ideias: z.array(IdeiaSchema),
});

/**
 * JSON Schema para o modo estruturado da OpenAI.
 *
 * `strict` exige que todo campo seja obrigatório e que não haja propriedades
 * extras — é o que garante que o card nunca chegue pela metade e que o app não
 * precise de fallback para campo ausente.
 */
export function jsonSchemaDasIdeias(quantidade: number) {
  return {
    name: "ideias_de_identidade",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["ideias"],
      properties: {
        ideias: {
          type: "array",
          minItems: quantidade,
          maxItems: quantidade,
          items: {
            type: "object",
            additionalProperties: false,
            required: CAMPOS_IDEIA.map((campo) => campo.key),
            properties: Object.fromEntries(
              CAMPOS_IDEIA.map((campo) => [
                campo.key,
                { type: "string", description: campo.descricao },
              ]),
            ),
          },
        },
      },
    },
  };
}

/** Texto de uma ideia, usado ao montar o histórico das rodadas seguintes. */
export function ideiaComoTexto(data: DadosIdeia): string {
  return CAMPOS_IDEIA.map((campo) => `${campo.label}: ${data[campo.key] ?? ""}`).join("\n");
}

/** Normaliza o JSON salvo: campo novo entra vazio, campo removido é descartado. */
export function normalizeIdeia(raw: unknown): DadosIdeia {
  const fonte = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    CAMPOS_IDEIA.map((campo) => [
      campo.key,
      typeof fonte[campo.key] === "string" ? (fonte[campo.key] as string) : "",
    ]),
  ) as DadosIdeia;
}
