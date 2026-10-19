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
        /*
         * `low` custa 85 tokens fixos por imagem; `high` custa de 1.100 a
         * 2.800, e doze referências sozinhas passavam de 20.000 — dois terços
         * do limite por minuto de uma conta comum, antes de o briefing entrar.
         * Referência existe para mostrar cor, composição e clima, e isso o
         * quadrado de 512px carrega. Para detalhe fino de tipografia, trocar
         * aqui por "high" e mandar menos imagens.
         */
        detail: "low",
      },
    });
  }
  return partes;
}

/**
 * Quantas vezes esperar e tentar de novo quando o limite de uso é atingido.
 *
 * Não é resiliência genérica: é o caso concreto de escrever uma página de dez
 * seções. Cada seção manda o plano de negócio inteiro, e três delas seguidas
 * já passam do limite por minuto de uma conta comum. Sem isto, o trabalho
 * parava no meio e as seções escritas ficavam misturadas com as vazias.
 */
const TENTATIVAS = 4;

/** O pedido não cabe no limite nem com a janela vazia: repetir não adianta. */
function pedidoMaiorQueOLimite(detalhe: string): boolean {
  const pedido = Number(detalhe.match(/Requested (\d+)/)?.[1]);
  const limite = Number(detalhe.match(/Limit (\d+)/)?.[1]);
  return Number.isFinite(pedido) && Number.isFinite(limite) && pedido > limite;
}

/** Saldo zerado — a OpenAI manda isso com o mesmo 429 do limite por minuto. */
function semCredito(detalhe: string): boolean {
  return /insufficient_quota|exceeded your current quota|billing/i.test(detalhe);
}

/** A própria OpenAI diz quanto esperar. Obedecer é melhor do que chutar. */
function esperaSugerida(detalhe: string, tentativa: number): number {
  const achado = detalhe.match(/try again in ([\d.]+)(ms|s)/i);
  if (achado) {
    const valor = Number(achado[1]);
    const ms = achado[2].toLowerCase() === "ms" ? valor : valor * 1000;
    // Uma folga por cima: o limite é por janela móvel, e voltar no instante
    // exato costuma reencontrar a mesma parede.
    return Math.min(ms + 800, 30000);
  }
  return Math.min(2000 * 2 ** tentativa, 30000);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Quanto ainda cabe no minuto, segundo a última resposta da OpenAI.
 *
 * Escrever uma página são dez chamadas seguidas; sozinhas elas cabem no
 * limite, juntas no mesmo minuto não. Em vez de colecionar 429 e esperar
 * depois, o pedido seguinte espera a janela reabrir ANTES de sair. Os números
 * vêm dos cabeçalhos da resposta: ninguém precisa contar tokens.
 *
 * Vale por processo. Com mais de uma réplica cada uma tem a sua conta, e o
 * 429 com repetição continua sendo a rede de segurança.
 */
let janela: { restantes: number; limite: number; reabreEm: number } | null = null;

/** "6ms", "1.5s", "1m30s" — a OpenAI mistura as unidades. */
function duracaoEmMs(texto: string | null): number {
  if (!texto) return 0;
  let total = 0;
  for (const [, valor, unidade] of texto.matchAll(/([\d.]+)(ms|s|m|h)/g)) {
    const n = Number(valor);
    total += unidade === "ms" ? n : unidade === "s" ? n * 1000 : unidade === "m" ? n * 60000 : n * 3600000;
  }
  return total;
}

function anotarJanela(resposta: Response): void {
  const limite = Number(resposta.headers.get("x-ratelimit-limit-tokens"));
  const restantes = Number(resposta.headers.get("x-ratelimit-remaining-tokens"));
  if (!Number.isFinite(limite) || !Number.isFinite(restantes) || limite <= 0) return;
  janela = {
    limite,
    restantes,
    reabreEm: Date.now() + duracaoEmMs(resposta.headers.get("x-ratelimit-reset-tokens")),
  };
}

/**
 * Espera a janela reabrir quando o que sobrou não dá para um pedido inteiro.
 *
 * O corte é um terço do limite porque é a ordem de grandeza de uma chamada
 * daqui (briefing + referências, ou uma seção de página com o plano junto).
 */
async function esperarJanela(): Promise<void> {
  if (!janela || janela.restantes > janela.limite / 3) return;
  const falta = janela.reabreEm - Date.now();
  janela = null;
  if (falta > 0) {
    console.warn(`[openai] pouco espaço no minuto — esperando ${falta}ms antes do próximo pedido`);
    await dormir(Math.min(falta + 500, 60000));
  }
}

async function chamar(corpo: Record<string, unknown>, tentativa = 0): Promise<string> {
  const chave = exigirChave();
  await esperarJanela();

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

  /*
   * 429 é fila, não erro: o pedido está certo e só chegou cedo demais.
   * 500-503 são a OpenAI passando mal, e passam. Os dois pedem espera; todo o
   * resto (chave errada, modelo inexistente) não melhora com repetição.
   */
  if ((resposta.status === 429 || resposta.status >= 500) && tentativa < TENTATIVAS) {
    const detalhe = await resposta.text().catch(() => "");
    /*
     * Crédito acabado também volta 429, e esperar não cria crédito. Sem esta
     * saída, uma conta sem saldo gastava um minuto repetindo para terminar
     * dizendo "limite por minuto atingido" — a única causa que NÃO era.
     */
    if (semCredito(detalhe)) {
      console.error("[openai] sem crédito:", detalhe.slice(0, 500));
      throw new HttpError(
        402,
        "A conta da OpenAI está sem crédito. Adicione saldo em platform.openai.com " +
          "(Settings → Billing) e tente de novo.",
      );
    }
    const espera = esperaSugerida(detalhe, tentativa);
    console.warn(
      `[openai] ${resposta.status} — esperando ${espera}ms (tentativa ${tentativa + 1}/${TENTATIVAS})`,
    );
    await dormir(espera);
    return chamar(corpo, tentativa + 1);
  }

  anotarJanela(resposta);

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
    if (resposta.status === 429 && semCredito(detalhe)) {
      mensagem =
        "A conta da OpenAI está sem crédito. Adicione saldo em platform.openai.com " +
        "(Settings → Billing) e tente de novo.";
    } else if (resposta.status === 429 && pedidoMaiorQueOLimite(detalhe)) {
      mensagem =
        "Este pedido sozinho passa do limite por minuto da sua conta OpenAI, então esperar não " +
        "resolve. Reduza as referências visuais ou o tamanho do briefing, ou aumente o limite " +
        "em platform.openai.com.";
    } else if (resposta.status === 429) {
      mensagem =
        "O limite de uso por minuto da sua conta OpenAI foi atingido, mesmo depois de esperar. " +
        "Gere menos ideias de uma vez, ou aumente o limite em platform.openai.com.";
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
