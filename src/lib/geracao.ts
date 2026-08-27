import { Prisma } from "@prisma/client";
import { montarBriefing, normalizeBlocoData, refsVisuaisDoProjeto } from "@/blocos/registry";
import { HttpError, naoEncontrado } from "./api";
import {
  ideiaComoTexto,
  jsonSchemaDasIdeias,
  normalizeIdeia,
  RespostaIdeiasSchema,
} from "./ideia";
import { conteudoComImagens, pedirJson, pedirTexto, type ImagemAnexada } from "./openai";
import { prisma } from "./prisma";
import { garantirBlocos } from "./queries";

/**
 * O motor: monta o contexto, chama o modelo e grava o resultado.
 *
 * Toda a diferença em relação a conversar no ChatGPT está aqui: o contexto de
 * cada chamada é MONTADO do banco, com tamanho previsível, em vez de arrastar
 * a conversa inteira. A rodada 9 recebe o mesmo briefing limpo que a rodada 1,
 * mais um resumo do que já saiu e do que foi aprovado ou descartado.
 */

const SYSTEM_IDEIAS = `Você é diretor de identidade visual de um estúdio internacional de branding, do nível dos estúdios que assinam identidades de marcas premium.

Você NÃO gera imagens. Você gera ideias em texto, descritas com precisão suficiente para que outra pessoa consiga desenhá-las.

Regras inegociáveis:

1. NADA DE CLICHÊ DE CATEGORIA. Antes de propor, pergunte-se: "isto já existe em dez concorrentes?". Se a resposta for sim, descarte e recomece. Lobo, coroa, montanha, seta ascendente, aperto de mão, engrenagem, lâmpada e globo estão proibidos por padrão, mesmo que o briefing não os cite.
2. DESCREVA O DESENHO, NÃO O SENTIMENTO. "Transmite confiança" não é uma ideia. "A haste do A é interrompida por um corte diagonal de 30 graus que reaparece no ponto do i" é uma ideia.
3. CADA IDEIA PRECISA SER DIFERENTE DAS OUTRAS EM ESTRUTURA, não em detalhe. Seis variações do mesmo símbolo contam como uma ideia só. Varie a origem: uma pode nascer da letra, outra do gesto do produto, outra da geometria do espaço negativo, outra da história do nome.
4. TODA IDEIA PRECISA SOBREVIVER AO TESTE DE REPRODUÇÃO declarado no briefing. Se precisa funcionar a 16px ou bordado, ideias com detalhe fino estão descartadas antes de serem escritas.
5. AS REFERÊNCIAS ENVIADAS DEFINEM O NÍVEL DE EXIGÊNCIA, NUNCA O DESENHO. É proibido reproduzir elementos reconhecíveis delas.
6. O QUE O BRIEFING NÃO DEFINIU É LIBERDADE, NÃO OMISSÃO. Varie entre as ideias em vez de escolher o meio-termo em todas.
7. NÃO REPITA nenhuma ideia já apresentada nas rodadas anteriores, nem versões levemente alteradas delas.
8. Escreva em português do Brasil, direto, sem adjetivos de vendedor.`;

const SYSTEM_PROMPT_FINAL = `Você escreve prompts para geradores de imagem de nível profissional, especializados em identidade visual.

A partir do briefing e de UMA ideia escolhida, escreva um prompt completo, em português do Brasil, que permita a um gerador de imagem produzir a apresentação da identidade.

Formato da saída: texto puro, organizado em seções com títulos em CAIXA ALTA separados por uma linha de traços. Sem markdown, sem asteriscos, sem numeração automática — o texto será colado inteiro em outra ferramenta.

Seções, nesta ordem:

TÍTULO — nome da marca e o que está sendo criado.
OBJETIVO — o que deve ser feito e, explicitamente, o que NÃO é para ser feito.
ATRIBUTOS — de 6 a 10 palavras, uma por linha, em caixa alta.
USO DAS REFERÊNCIAS — que as referências definem nível, não desenho, e que copiar é proibido.
IDEIA CENTRAL — a ideia escolhida, desenvolvida.
O SÍMBOLO — construção geométrica descrita em detalhe: curvas, cortes, terminações, espaço negativo, assimetria, proporções.
GESTO ASSINATURA — o detalhe que se repete, e onde ele reaparece.
LINGUAGEM TIPOGRÁFICA — o que é desenhado sob medida nas letras, característica por característica, numeradas.
LOCKUP — hierarquia entre nome, símbolo e complementos.
PRINCÍPIO VISUAL — a regra que resume a identidade em duas ou três linhas.
PALETA — cada cor com nome e código hexadecimal, mais o que evitar.
MATERIAIS — acabamentos e substratos.
DIREÇÃO DE ARTE — luz, fundo, composição, nível de realismo.
EVITAR ESTRITAMENTE — lista longa e específica, uma por linha, incluindo tudo o que o briefing proibiu.
OBJETIVO FINAL — o que o resultado precisa ser e o que ele não pode parecer.

Seções CONDICIONAIS, incluídas apenas se o briefing pedir:
PADRÃO PROPRIETÁRIO — se o briefing pedir padrão gráfico.
BOARD DE CONSTRUÇÃO — se o briefing pedir board de construção.
APLICAÇÕES — se o briefing pedir aplicações; descreva cada uma como uma cena concreta.

Regras:
- Seja concreto e visual. Nada de "elegante e sofisticado" sem dizer o que torna elegante.
- Densidade importa: um gerador de imagem obedece ao que está escrito e inventa o que não está.
- A seção EVITAR ESTRITAMENTE é a que mais protege o resultado. Não a economize.
- Não escreva nada antes do TÍTULO nem depois do OBJETIVO FINAL.`;

const SYSTEM_TRADUCAO = `You convert a Brazilian-Portuguese brand identity prompt into a structured English JSON prompt for image generation models.

Rules:
- Translate faithfully; do not add ideas that are not in the source, and do not drop constraints.
- Use the vocabulary image models respond to: concrete nouns, materials, lighting, composition, stroke and geometry terms.
- Keep every hex code exactly as written in the source.
- negative_prompt must contain every prohibition from the source, one item per entry, in English.
- Any section absent from the source becomes an empty string or an empty array. Never invent content to fill it.`;

const SCHEMA_TRADUCAO = {
  name: "brand_identity_prompt",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "objective",
      "attributes",
      "concept",
      "symbol",
      "signature_gesture",
      "typography",
      "lockup",
      "visual_principle",
      "palette",
      "pattern",
      "construction_board",
      "applications",
      "materials",
      "art_direction",
      "negative_prompt",
      "final_objective",
    ],
    properties: {
      title: { type: "string" },
      objective: { type: "string" },
      attributes: { type: "array", items: { type: "string" } },
      concept: { type: "string" },
      symbol: { type: "string" },
      signature_gesture: { type: "string" },
      typography: { type: "string" },
      lockup: { type: "string" },
      visual_principle: { type: "string" },
      palette: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "hex", "role"],
          properties: {
            name: { type: "string" },
            hex: { type: "string" },
            role: { type: "string" },
          },
        },
      },
      pattern: { type: "string" },
      construction_board: { type: "string" },
      applications: { type: "array", items: { type: "string" } },
      materials: { type: "array", items: { type: "string" } },
      art_direction: { type: "array", items: { type: "string" } },
      negative_prompt: { type: "array", items: { type: "string" } },
      final_objective: { type: "string" },
    },
  },
};

/** Teto de imagens enviadas numa chamada. Acima disso o custo cresce sem retorno. */
const MAX_IMAGENS = 12;

async function contextoDoProjeto(projetoId: string) {
  const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } });
  if (!projeto) throw naoEncontrado("Projeto");

  await garantirBlocos(projetoId);
  const blocos = await prisma.bloco.findMany({ where: { projetoId } });
  const salvos = blocos.map((bloco) => ({
    tipo: bloco.tipo,
    data: (bloco.data ?? {}) as Record<string, unknown>,
  }));

  const briefing = montarBriefing(salvos, projeto.nome);
  const refs = refsVisuaisDoProjeto(salvos).slice(0, MAX_IMAGENS);

  const imagens: ImagemAnexada[] = [];
  if (refs.length > 0) {
    const assets = await prisma.asset.findMany({
      where: { id: { in: refs.map((ref) => ref.assetId) } },
      select: { id: true, mime: true, data: true },
    });
    const porId = new Map(assets.map((asset) => [asset.id, asset]));
    refs.forEach((ref, indice) => {
      const asset = porId.get(ref.assetId);
      if (!asset) return;
      imagens.push({
        mime: asset.mime,
        base64: Buffer.from(asset.data).toString("base64"),
        legenda: `Referência ${indice + 1}${ref.nota ? ` — ${ref.nota}` : ""}:`,
      });
    });
  }

  return { projeto, briefing, imagens };
}

/**
 * Resumo das rodadas anteriores.
 *
 * O detalhe é proporcional ao veredito, de propósito: uma ideia amada volta
 * inteira, porque é dela que a próxima rodada precisa se aproximar; uma
 * descartada volta em uma linha, o bastante para não ser repetida. Mandar tudo
 * inteiro faria a rodada 8 custar oito vezes a rodada 1 e afogar o briefing.
 */
async function historicoDoProjeto(projetoId: string): Promise<string> {
  const ideias = await prisma.ideia.findMany({
    where: { projetoId },
    orderBy: [{ rodada: { numero: "asc" } }, { ordem: "asc" }],
    include: { rodada: { select: { numero: true } } },
  });
  if (ideias.length === 0) return "";

  const amadas: string[] = [];
  const descartadas: string[] = [];
  const neutras: string[] = [];

  for (const ideia of ideias) {
    const data = normalizeIdeia(ideia.data);
    const rotulo = `[R${ideia.rodada.numero}] ${data.nome}`;
    const comentario = ideia.comentario.trim() ? ` (você comentou: "${ideia.comentario.trim()}")` : "";

    if (ideia.veredito === "amei") {
      amadas.push(`${rotulo}${comentario}\n${ideiaComoTexto(data)}`);
    } else if (ideia.veredito === "descartei") {
      descartadas.push(`${rotulo}: ${data.ideiaCentral}${comentario}`);
    } else {
      neutras.push(`${rotulo}: ${data.ideiaCentral}`);
    }
  }

  const partes = ["# O que já foi apresentado neste projeto"];
  if (amadas.length > 0) {
    partes.push(
      `## Aprovadas — aproxime-se destas, sem repeti-las\n\n${amadas.join("\n\n")}`,
    );
  }
  if (descartadas.length > 0) {
    partes.push(
      `## Descartadas — não volte a este território\n${descartadas.map((d) => `- ${d}`).join("\n")}`,
    );
  }
  if (neutras.length > 0) {
    partes.push(
      `## Já apresentadas, sem veredito — não repita\n${neutras.map((n) => `- ${n}`).join("\n")}`,
    );
  }
  return partes.join("\n\n");
}

export async function gerarIdeias(
  projetoId: string,
  quantidade: number,
  instrucao: string,
): Promise<string> {
  const { projeto, briefing, imagens } = await contextoDoProjeto(projetoId);
  const historico = await historicoDoProjeto(projetoId);

  const pedido = [
    briefing,
    historico,
    instrucao.trim() ? `# Ajuste para esta rodada\n${instrucao.trim()}` : "",
    `# Tarefa\nApresente ${quantidade} ideia(s) de identidade visual para "${projeto.nome}". Cada uma com origem estrutural diferente das outras.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const bruto = await pedirJson(
    SYSTEM_IDEIAS,
    [{ role: "user", content: conteudoComImagens(pedido, imagens) }],
    jsonSchemaDasIdeias(quantidade),
  );

  const resposta = RespostaIdeiasSchema.parse(bruto);
  if (resposta.ideias.length === 0) {
    throw new HttpError(502, "A OpenAI não devolveu nenhuma ideia. Tente de novo.");
  }

  // O número da rodada é decidido aqui, no servidor, e não no cliente: duas
  // abas gerando ao mesmo tempo produziriam duas "Rodada 3".
  const ultima = await prisma.rodada.findFirst({
    where: { projetoId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const rodada = await prisma.rodada.create({
    data: {
      projetoId,
      numero: (ultima?.numero ?? 0) + 1,
      quantidade,
      instrucao: instrucao.trim(),
      ideias: {
        create: resposta.ideias.map((ideia, ordem) => ({
          projetoId,
          ordem,
          data: ideia as object,
        })),
      },
    },
  });

  await prisma.projeto.update({
    where: { id: projetoId },
    data: { status: "gerado" },
  });

  return rodada.id;
}

/**
 * Escreve (ou reescreve) o prompt de uma ideia.
 *
 * O `ajuste` é a correção pedida na tela — "troque só a cor para verde
 * escuro", "tira as aplicações". Ele entra como uma instrução que vence o
 * briefing em caso de conflito, e fica gravado: sem isso, reabrir o projeto
 * mostraria um prompt cuja forma ninguém consegue mais explicar.
 */
export async function gerarPrompt(ideiaId: string, ajuste = ""): Promise<string> {
  const ideia = await prisma.ideia.findUnique({
    where: { id: ideiaId },
    include: { projeto: { select: { id: true, nome: true } } },
  });
  if (!ideia) throw naoEncontrado("Ideia");

  const { briefing, imagens } = await contextoDoProjeto(ideia.projeto.id);
  const dados = normalizeIdeia(ideia.data);

  // A fotografia é tirada ANTES da chamada ao modelo, do estado que originou o
  // pedido. Tirá-la depois correria o risco de gravar um briefing já alterado
  // noutra aba enquanto o prompt era escrito.
  const blocos = await prisma.bloco.findMany({
    where: { projetoId: ideia.projeto.id },
    select: { tipo: true, data: true },
  });
  const configuracao = blocos.map((bloco) => ({
    tipo: bloco.tipo,
    data: normalizeBlocoData(bloco.tipo, bloco.data),
  }));

  const pedido = [
    briefing,
    `# Ideia escolhida\n${ideiaComoTexto(dados)}`,
    ideia.comentario.trim() ? `# Observação sobre a ideia\n${ideia.comentario.trim()}` : "",
    ajuste.trim()
      ? `# Ajuste pedido\nEste prompt já foi escrito antes e precisa ser refeito com a seguinte correção. Ela tem prioridade sobre o briefing em caso de conflito; mantenha todo o resto igual.\n${ajuste.trim()}`
      : "",
    `# Tarefa\nEscreva o prompt completo para "${ideia.projeto.nome}" a partir da ideia escolhida acima.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const texto = await pedirTexto(SYSTEM_PROMPT_FINAL, [
    { role: "user", content: conteudoComImagens(pedido, imagens) },
  ]);

  const titulo = `${ideia.projeto.nome} — ${dados.nome}`;

  // Regenerar sobrescreve o prompt da mesma ideia em vez de criar um segundo:
  // a chave única em `ideiaId` é a idempotência que evita duas versões
  // concorrentes do mesmo conceito na tela.
  const prompt = await prisma.prompt.upsert({
    where: { ideiaId },
    create: {
      ideiaId,
      titulo,
      texto,
      ajuste: ajuste.trim(),
      configuracao: configuracao as object,
    },
    // `json: null` de propósito: a tradução anterior descrevia o texto antigo.
    update: {
      titulo,
      texto,
      ajuste: ajuste.trim(),
      json: Prisma.DbNull,
      configuracao: configuracao as object,
    },
  });

  await prisma.projeto.update({
    where: { id: ideia.projeto.id },
    data: { status: "pronto" },
  });

  return prompt.id;
}

export async function traduzirPrompt(promptId: string): Promise<unknown> {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw naoEncontrado("Prompt");

  const json = await pedirJson(
    SYSTEM_TRADUCAO,
    [{ role: "user", content: prompt.texto }],
    SCHEMA_TRADUCAO,
  );

  await prisma.prompt.update({
    where: { id: promptId },
    data: { json: json as object },
  });

  return json;
}
