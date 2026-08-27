/**
 * Primitivas puras dos blocos — constantes, funções e regras de domínio.
 *
 * ATENÇÃO: este arquivo NÃO pode ganhar `"use client"`.
 *
 * Um módulo marcado como cliente exporta referências opacas para o servidor: a
 * constante importada de lá chega como `undefined` em código de servidor, sem
 * erro nenhum. Como o montador do briefing roda no servidor e o formulário roda
 * no cliente, tudo o que os dois precisam conhecer mora aqui, e só os
 * componentes React ficam em `campos.tsx`.
 */

/** Valor de uma barra de temperamento. `null` = não definido pelo usuário. */
export type ValorEixo = number | null;

/** Uma referência visual: a imagem enviada e o que atrai o usuário nela. */
export interface RefVisual {
  /** Id do Asset, devolvido por POST /api/assets. */
  assetId: string;
  nota: string;
}

/** Uma cor da paleta informada no briefing. */
export interface CorDefinida {
  hex: string;
  nome: string;
  uso: string;
}

/**
 * Rótulos dos sete níveis da barra, do extremo esquerdo ao direito.
 *
 * Sete e não cem: a diferença entre 61% e 67% de "moderno" não existe na
 * cabeça de quem preenche nem na leitura do modelo, mas obrigaria a arrastar
 * com precisão. Sete posições se escolhem com um toque.
 */
export const NIVEIS_EIXO = [-3, -2, -1, 0, 1, 2, 3] as const;

/** Descrição textual de um eixo, já no formato que entra no briefing. */
export function descreveEixo(
  esquerda: string,
  direita: string,
  valor: ValorEixo,
): string | null {
  if (valor === null || valor === undefined) return null;
  switch (Math.max(-3, Math.min(3, Math.round(valor)))) {
    case -3:
      return `muito ${esquerda}`;
    case -2:
      return `bastante ${esquerda}`;
    case -1:
      return `levemente ${esquerda}`;
    case 0:
      return `equilíbrio entre ${esquerda} e ${direita}`;
    case 1:
      return `levemente ${direita}`;
    case 2:
      return `bastante ${direita}`;
    default:
      return `muito ${direita}`;
  }
}

/** Rótulo curto do nível, exibido embaixo da barra no formulário. */
export function rotuloDoNivel(
  esquerda: string,
  direita: string,
  valor: ValorEixo,
): string {
  if (valor === null || valor === undefined) return "a IA decide";
  const descricao = descreveEixo(esquerda, direita, valor);
  return descricao ? descricao.charAt(0).toUpperCase() + descricao.slice(1) : "";
}

export function comoTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export function comoEixo(valor: unknown): ValorEixo {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export function comoLista(valor: unknown): Record<string, unknown>[] {
  return Array.isArray(valor) ? (valor as Record<string, unknown>[]) : [];
}

export function comoTags(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.map(comoTexto).filter(Boolean);
}

export function comoRefs(valor: unknown): RefVisual[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => {
      const fonte = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return { assetId: comoTexto(fonte.assetId), nota: comoTexto(fonte.nota) };
    })
    .filter((ref) => ref.assetId.length > 0);
}

export function comoCores(valor: unknown): CorDefinida[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => {
      const fonte = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        hex: comoTexto(fonte.hex),
        nome: comoTexto(fonte.nome),
        uso: comoTexto(fonte.uso),
      };
    })
    .filter((cor) => cor.hex.length > 0);
}

/** `Rótulo: valor` — ou nada, quando o valor está vazio. */
export function linha(rotulo: string, valor: unknown): string | null {
  const texto = comoTexto(valor);
  return texto ? `${rotulo}: ${texto}` : null;
}

/**
 * Monta uma seção do briefing.
 *
 * Devolve string vazia quando não sobrou nenhuma linha — é isso que faz um
 * bloco em branco desaparecer do briefing em vez de virar um cabeçalho oco.
 * Um cabeçalho sem conteúdo é pior que a ausência dele: o modelo lê como
 * "esta dimensão foi considerada e não importa".
 */
export function secao(titulo: string, linhas: (string | null | undefined)[]): string {
  const uteis = linhas.filter((item): item is string => Boolean(item && item.trim()));
  if (uteis.length === 0) return "";
  return `## ${titulo}\n${uteis.join("\n")}`;
}

/** Lista com marcadores, para itens repetidos dentro de uma seção. */
export function itens(rotulo: string, valores: string[]): string | null {
  const uteis = valores.map((v) => v.trim()).filter(Boolean);
  if (uteis.length === 0) return null;
  return `${rotulo}:\n${uteis.map((v) => `- ${v}`).join("\n")}`;
}
