import { BLOCOS, normalizeBlocoData } from "@/blocos/registry";
import type { BlocoDefinition, FieldDef } from "@/blocos/types";
import { HttpError, naoEncontrado } from "./api";
import { pedirJson } from "./openai";
import { prisma } from "./prisma";
import { garantirBlocos } from "./queries";
import type { BlocoDTO } from "./types";

/**
 * "Deixe a IA decidir": lê o briefing e preenche as decisões estratégicas.
 *
 * O schema enviado ao modelo é DERIVADO DO REGISTRO DE BLOCOS, campo a campo.
 * Isso é o princípio da arquitetura levado até aqui: criar uma pasta nova não
 * torna esta função obsoleta — o campo novo entra no schema sozinho, e o modelo
 * passa a preenchê-lo sem que ninguém edite este arquivo.
 */

const SYSTEM = `Você é diretor de identidade visual de um estúdio internacional de branding.

Leia o briefing e tome as decisões estratégicas de marca que ele implica: temperamento, direção tipográfica, direção cromática, o que precisa ser evitado e o formato da entrega.

Regras:

1. DECIDA, não descreva. Cada campo é uma escolha sua, defendida pelo briefing. "Depende" não é resposta.
2. AS BARRAS VÃO DE -3 A 3. Use -3 e 3 quando o briefing for claro; use o meio quando ele pedir equilíbrio de verdade. Deixe em branco (null) só quando qualquer posição serviria igualmente bem — o que é raro.
3. AS PROIBIÇÕES SÃO O MAIS IMPORTANTE. Se o briefing diz que o público rejeita algo, essa rejeição vira item proibido, com o nome concreto do símbolo ou da estética.
4. PROPONHA SEMPRE UMA PALETA de 3 a 5 cores, com nome, código hexadecimal de verdade e o papel de cada uma (fundo, texto, acento). Devolver a paleta vazia é fugir da decisão: o usuário abriu este botão justamente para ver que cores você escolheria.
5. ESCREVA EM PORTUGUÊS DO BRASIL, em minúsculas nas listas de palavras, sem adjetivos de vendedor.`;

/**
 * Instrução extra da variação.
 *
 * Sem ela o modelo devolve praticamente a mesma leitura: o briefing é o mesmo,
 * e o caminho mais provável continua sendo o mais provável. Pedir explicitamente
 * uma direção diferente é o que transforma o botão numa segunda opinião em vez
 * de uma segunda cópia.
 */
const VARIACAO = `Uma leitura anterior deste mesmo briefing já foi feita e está reproduzida abaixo.

Proponha agora uma direção estratégica DIFERENTE e igualmente defensável. Mude o que puder ser mudado sem trair o briefing: se antes a marca era geométrica e silenciosa, experimente orgânica e expressiva; se a paleta era escura e dessaturada, experimente outra faixa.

O que NÃO pode mudar: as proibições que vêm do briefing (o que o público rejeita), as exigências de reprodução, e o tipo de entrega. Essas são fatos, não estilo.

Não explique a diferença — apenas devolva a nova leitura.`;

/** Campos que o modelo não tem como preencher: o próprio briefing e as imagens. */
function preenchivel(field: FieldDef): boolean {
  return field.type !== "documento" && field.type !== "images" && field.type !== "list";
}

function esquemaDoCampo(field: FieldDef): Record<string, unknown> {
  const descricao = [field.label, field.help].filter(Boolean).join(" — ");

  switch (field.type) {
    case "axis":
      return {
        type: ["integer", "null"],
        description: `${field.label}: -3 = muito ${field.left}, 0 = equilíbrio, 3 = muito ${field.right}. null = tanto faz.`,
      };
    case "checkbox":
      return { type: "boolean", description: descricao };
    case "select":
      return {
        type: "string",
        enum: (field.options ?? []).map((opcao) => opcao.value),
        description: descricao,
      };
    case "tags":
      return {
        type: "array",
        items: { type: "string" },
        description: [
          descricao,
          field.suggestions?.length
            ? `Valores frequentes (pode usar outros): ${field.suggestions.join(", ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "colors":
      return {
        type: "array",
        description: descricao,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["hex", "nome", "uso"],
          properties: {
            hex: { type: "string", description: "Código hexadecimal, ex.: #101010" },
            nome: { type: "string", description: "Nome da cor, ex.: obsidiana" },
            uso: { type: "string", description: "Papel: fundo, texto, acento…" },
          },
        },
      };
    default:
      return { type: "string", description: descricao };
  }
}

/** Blocos que têm ao menos um campo preenchível pelo modelo. */
function blocosPreenchiveis(): BlocoDefinition[] {
  return BLOCOS.filter((bloco) => bloco.fields.some(preenchivel));
}

function jsonSchemaDosBlocos() {
  const propriedades: Record<string, unknown> = {};

  for (const bloco of blocosPreenchiveis()) {
    const campos = bloco.fields.filter(preenchivel);
    propriedades[bloco.id] = {
      type: "object",
      additionalProperties: false,
      // `strict` exige todo campo em `required`: o modelo não pode devolver a
      // seção pela metade e a tela nunca fica com metade dos controles parada.
      required: campos.map((field) => field.key),
      properties: Object.fromEntries(
        campos.map((field) => [field.key, esquemaDoCampo(field)]),
      ),
      description: `${bloco.label} — ${bloco.description}`,
    };
  }

  return {
    name: "decisoes_de_marca",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: Object.keys(propriedades),
      properties: propriedades,
    },
  };
}

/**
 * Preenche os blocos a partir do briefing e grava.
 *
 * O que o modelo devolve passa pela MESMA normalização de qualquer gravação:
 * chave desconhecida é descartada, campo faltante entra vazio. Confiar na
 * resposta do modelo para escrever direto no banco seria o único lugar do app
 * onde os dados entrariam sem passar pelo contrato.
 */
export async function preencherBlocos(
  projetoId: string,
  variacao = false,
): Promise<BlocoDTO[]> {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) throw naoEncontrado("Projeto");

  await garantirBlocos(projetoId);
  const salvos = await prisma.bloco.findMany({ where: { projetoId } });

  const briefing = salvos.find((bloco) => bloco.tipo === "briefing");
  const texto =
    briefing && typeof (briefing.data as Record<string, unknown>)?.texto === "string"
      ? ((briefing.data as Record<string, unknown>).texto as string).trim()
      : "";

  if (texto.length < 40) {
    throw new HttpError(
      422,
      "Escreva o briefing antes: sem ele a IA preencheria os campos no chute.",
    );
  }

  // Na variação, a leitura atual vai junto para o modelo saber de que se
  // afastar. Só os blocos preenchíveis entram: mandar o briefing de volta
  // duplicado não ajudaria em nada.
  const anteriorParaVariar = variacao
    ? blocosPreenchiveis()
        .map((bloco) => {
          const data = salvos.find((item) => item.tipo === bloco.id)?.data ?? {};
          return `${bloco.label}: ${JSON.stringify(normalizeBlocoData(bloco.id, data))}`;
        })
        .join("\n")
    : "";

  const pedido = [
    `# Briefing de "${projeto.nome}"\n${texto}`,
    variacao ? `# Leitura anterior\n${anteriorParaVariar}\n\n${VARIACAO}` : "",
    `# Tarefa\nPreencha todas as decisões de marca a partir deste briefing.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const bruto = (await pedirJson(
    SYSTEM,
    [{ role: "user", content: pedido }],
    jsonSchemaDosBlocos(),
  )) as Record<string, unknown>;

  const resultado: BlocoDTO[] = [];

  for (const bloco of blocosPreenchiveis()) {
    const devolvido = bruto[bloco.id];
    if (!devolvido || typeof devolvido !== "object") continue;

    // O briefing e as referências que já estavam preenchidos são preservados:
    // o modelo não recebeu esses campos e não pode apagá-los.
    const anterior = (salvos.find((item) => item.tipo === bloco.id)?.data ?? {}) as Record<
      string,
      unknown
    >;
    const data = normalizeBlocoData(bloco.id, {
      ...anterior,
      ...(devolvido as Record<string, unknown>),
    });

    await prisma.bloco.upsert({
      where: { projetoId_tipo: { projetoId, tipo: bloco.id } },
      create: { projetoId, tipo: bloco.id, data: data as object },
      update: { data: data as object },
    });

    resultado.push({ tipo: bloco.id, data });
  }

  await prisma.projeto.update({ where: { id: projetoId }, data: { updatedAt: new Date() } });

  return resultado;
}
