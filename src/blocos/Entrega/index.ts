import { comoTags, comoTexto, itens, linha, secao } from "../_shared/format";
import { defineBloco } from "../types";

type Dados = {
  tipo: string;
  aplicacoes: string[];
  incluirConstrucao: boolean;
  incluirPadrao: boolean;
  incluirAplicacoes: boolean;
}

export const TIPOS_DE_MARCA: Record<string, string> = {
  simbolo: "símbolo isolado, sem letras",
  wordmark: "wordmark: o nome desenhado, sem símbolo separado",
  combinado: "símbolo + wordmark, funcionando juntos e separados",
  monograma: "monograma construído a partir das iniciais",
  lettermark: "lettermark: uma única letra como símbolo",
};

/**
 * Define o formato do prompt final, não o conteúdo da marca.
 *
 * As três caixas controlam quais seções o prompt terá. Ficam aqui, e não numa
 * tela de configuração, porque a decisão muda de projeto para projeto: um
 * cliente que só quer testar o símbolo não precisa de quatro mockups
 * fotorrealistas no meio do prompt disputando a atenção do gerador de imagem.
 */
export default defineBloco<Dados>({
  id: "entrega",
  label: "Entrega",
  description: "Que tipo de marca é, e o que o prompt final precisa conter.",
  icon: "caixa",
  ordem: 70,

  fields: [
    {
      key: "tipo",
      icon: "caixa",
      label: "Tipo de marca",
      type: "select",
      options: [
        { value: "combinado", label: "Símbolo + wordmark" },
        { value: "simbolo", label: "Só o símbolo" },
        { value: "wordmark", label: "Só o wordmark" },
        { value: "monograma", label: "Monograma" },
        { value: "lettermark", label: "Lettermark (uma letra)" },
      ],
    },
    {
      key: "incluirConstrucao",
      label: "Incluir o board de construção (grade, eixos, anotações)",
      type: "checkbox",
    },
    {
      key: "incluirPadrao",
      label: "Incluir um padrão gráfico derivado do símbolo",
      type: "checkbox",
    },
    {
      key: "incluirAplicacoes",
      label: "Incluir aplicações fotorrealistas",
      type: "checkbox",
    },
    {
      key: "aplicacoes",
      icon: "grade",
      label: "Quais aplicações",
      type: "tags",
      suggestions: [
        "cartão de visita",
        "caixa de boas-vindas",
        "dossiê impresso",
        "cartão de membro",
        "fachada",
        "embalagem",
        "papelaria",
        "camiseta",
        "ambiente",
        "tela de aplicativo",
      ],
      help: "Quatro costumam ser o limite antes de o gerador de imagem perder a mão.",
    },
  ],

  defaults: {
    tipo: "combinado",
    aplicacoes: [],
    incluirConstrucao: true,
    incluirPadrao: true,
    incluirAplicacoes: true,
  },

  summary: (data) => TIPOS_DE_MARCA[comoTexto(data.tipo)] ?? "",

  toPrompt: (data) =>
    secao("Formato da entrega", [
      linha("Tipo de marca", TIPOS_DE_MARCA[comoTexto(data.tipo)]),
      data.incluirConstrucao ? "Incluir board de construção com grade e anotações." : null,
      data.incluirPadrao ? "Incluir um padrão gráfico derivado do símbolo." : null,
      data.incluirAplicacoes ? "Incluir aplicações fotorrealistas." : null,
      data.incluirAplicacoes ? itens("Aplicações desejadas", comoTags(data.aplicacoes)) : null,
    ]),
});
