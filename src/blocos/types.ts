import type { IconName } from "./_shared/icons";

/**
 * Contrato dos blocos do briefing.
 *
 * Um bloco descreve TRÊS coisas e nada mais:
 *   1. quais campos existem     -> `fields`
 *   2. qual o conteúdo inicial  -> `defaults`
 *   3. como vira briefing       -> `toPrompt`
 *
 * O formulário, a barra de progresso e o texto enviado à IA são todos gerados
 * a partir dessa descrição. Acrescentar uma pergunta ao briefing é criar uma
 * pasta em `src/blocos/` — nenhum arquivo existente precisa ser editado, e o
 * banco não muda porque o conteúdo vive numa coluna JSON.
 *
 * No sistema de referência o terceiro item era `Render` (desenhar a página).
 * Aqui a saída não é um documento, é texto para um modelo de linguagem — mas o
 * papel é o mesmo: o bloco é o único lugar que sabe traduzir os próprios campos.
 */

export type FieldType =
  | "text"
  | "textarea"
  /**
   * O briefing inteiro: uma caixa grande que aceita texto colado OU um arquivo
   * de texto arrastado para dentro. É o campo mais importante do app — na
   * prática o usuário já tem o briefing escrito e não quer redigitá-lo em
   * quinze perguntas separadas.
   */
  | "documento"
  | "select"
  /** Caixa de seleção. O valor guardado é booleano. */
  | "checkbox"
  /** Lista de sub-registros, definidos em `itemFields`. */
  | "list"
  /** Referências visuais: upload + a linha "o que me atrai nela". */
  | "images"
  /**
   * Barra de temperamento. O valor guardado é -3..3, ou `null` quando o
   * usuário não mexeu — e `null` significa liberdade criativa para a IA, não
   * ausência de resposta. Um eixo parado no meio (0) é uma decisão diferente:
   * pede equilíbrio explícito.
   */
  | "axis"
  /** Chips de múltipla escolha, com espaço para escrever os próprios. */
  | "tags"
  /** Paleta: lista de { hex, nome, uso }, com seletor de cor. */
  | "colors";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldDef {
  /** Chave dentro do JSON de dados do bloco. */
  key: string;
  label: string;
  type: FieldType;
  /** Ícone exibido ao lado do rótulo. A interface é lida em varredura, não em leitura. */
  icon?: IconName;
  placeholder?: string;
  /** Texto de apoio exibido abaixo do campo. */
  help?: string;
  /** Ocupa metade da largura. Dois campos seguidos assim partilham a linha. */
  half?: boolean;
  /** Apenas para `textarea`. */
  rows?: number;
  /** Apenas para `select`. */
  options?: SelectOption[];
  /** Apenas para `tags`: sugestões clicáveis. O usuário pode escrever outras. */
  suggestions?: string[];
  /** Apenas para `axis`: os dois extremos da barra. */
  left?: string;
  right?: string;
  /** Apenas para `list`. */
  itemFields?: FieldDef[];
  itemLabel?: string;
  itemDefaults?: Record<string, unknown>;
  maxItems?: number;
}

export type BlocoData = Record<string, unknown>;

export interface BlocoDefinition<TData extends BlocoData = BlocoData> {
  /** Identificador persistido em `blocos.tipo`. Nunca deve mudar. */
  id: string;
  label: string;
  description: string;
  icon: IconName;
  /**
   * Posição no briefing.
   *
   * Mora aqui, e não numa coluna do banco, porque o usuário não reordena
   * blocos: todo projeto tem todos, sempre na mesma sequência. Deixar a ordem
   * no registro significa que renumerar as seções não toca em nenhum projeto
   * já salvo.
   */
  ordem: number;
  fields: FieldDef[];
  /** Conteúdo de um bloco recém-criado. */
  defaults: TData;
  /** Resumo curto exibido na lista lateral do briefing. */
  summary?: (data: TData) => string;
  /**
   * Tradução dos campos para o texto que a IA lê.
   *
   * Devolver string vazia omite a seção inteira do briefing — é o que faz um
   * bloco em branco custar zero token e, mais importante, não sugerir à IA que
   * existe uma restrição onde não existe.
   */
  toPrompt: (data: TData) => string;
  /**
   * Conserta dados gravados por uma versão anterior deste bloco.
   * Roda antes da normalização, toda vez que o bloco é lido.
   */
  migrate?: (raw: BlocoData) => BlocoData;
}

/** Helper de tipagem: preserva o tipo dos dados ao declarar um bloco. */
export function defineBloco<TData extends BlocoData>(
  def: BlocoDefinition<TData>,
): BlocoDefinition<TData> {
  return def;
}
