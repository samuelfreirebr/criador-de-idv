import { HttpError } from "./api";
import { env } from "./env";

/**
 * Cliente mínimo da OpenAI, por `fetch`.
 *
 * Sem SDK: o que este app usa da API cabe em duas funções, e uma dependência a
 * menos é uma superfície a menos para quebrar em atualização de versão.
 */

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/** Uma imagem anexada à mensagem, já em base64. */
export interface ImagemAnexada {
  mime: string;
  base64: string;
  legenda: string;
}

type ParteDeConteudo =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } };

interface Mensagem {
  role: "system" | "user" | "assistant";
  content: string | ParteDeConteudo[];
}

function exigirChave(): string {
  if (!env.temGeracao) {
    throw new HttpError(
      503,
      "A geração está desligada: falta configurar OPENAI_API_KEY no ambiente.",
    );
  }
  return env.openaiKey;
}

/**
 * Monta o conteúdo de uma mensagem de usuário com texto e imagens.
 *
 * A legenda vai como texto ANTES de cada imagem, e não depois: assim o modelo
 * já sabe o que procurar quando olha, em vez de ter de reconciliar a nota com
 * a imagem certa no fim de uma sequência de doze.
 */
export function conteudoComImagens(texto: string, imagens: ImagemAnexada[]): ParteDeConteudo[] {
  const partes: ParteDeConteudo[] = [{ type: "text", text: texto }];
  for (const imagem of imagens) {
    partes.push({ type: "text", text: imagem.legenda });
    partes.push({
      type: "image_url",
      image_url: {
        url: `data:${imagem.mime};base64,${imagem.base64}`,
        detail: "high",
      },
    });
  }
  return partes;
}

async function chamar(corpo: Record<string, unknown>): Promise<string> {
  const chave = exigirChave();

  let resposta: Response;
  try {
    resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({ model: env.openaiModel, ...corpo }),
    });
  } catch (erro) {
    console.error("[openai] falha de rede:", erro);
    throw new HttpError(502, "Não foi possível falar com a OpenAI. Tente de novo.");
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(`[openai] HTTP ${resposta.status}:`, detalhe.slice(0, 500));
    // A mensagem da OpenAI é útil (chave inválida, modelo inexistente, limite
    // atingido) e vai para a tela: esconder isso transformaria um erro de
    // configuração de dois minutos numa investigação de uma hora.
    let mensagem = `A OpenAI respondeu ${resposta.status}.`;
    try {
      const json = JSON.parse(detalhe) as { error?: { message?: string } };
      if (json.error?.message) mensagem = json.error.message;
    } catch {
      /* resposta não era JSON — fica a mensagem genérica */
    }
    throw new HttpError(502, mensagem);
  }

  const json = (await resposta.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const conteudo = json.choices?.[0]?.message?.content;
  if (!conteudo) throw new HttpError(502, "A OpenAI devolveu uma resposta vazia.");
  return conteudo;
}

/** Resposta em JSON, validada contra um JSON Schema pelo próprio modelo. */
export async function pedirJson(
  system: string,
  mensagens: Mensagem[],
  jsonSchema: { name: string; strict: boolean; schema: unknown },
): Promise<unknown> {
  const conteudo = await chamar({
    messages: [{ role: "system", content: system }, ...mensagens],
    response_format: { type: "json_schema", json_schema: jsonSchema },
  });

  try {
    return JSON.parse(conteudo);
  } catch {
    throw new HttpError(502, "A OpenAI devolveu um JSON inválido.");
  }
}

/** Resposta em texto corrido. */
export async function pedirTexto(system: string, mensagens: Mensagem[]): Promise<string> {
  return chamar({ messages: [{ role: "system", content: system }, ...mensagens] });
}
