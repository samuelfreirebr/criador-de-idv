import {
  comoEixo,
  comoTags,
  comoTexto,
  descreveEixo,
  itens,
  linha,
  secao,
  type ValorEixo,
} from "../_shared/format";
import { defineBloco, type FieldDef } from "../types";

type Dados = {
  fontes: string;
  serifa: ValorEixo;
  peso: ValorEixo;
  largura: ValorEixo;
  autoria: ValorEixo;
  transmite: string[];
  evitar: string;
}

const EIXOS: FieldDef[] = [
  { key: "serifa", label: "Desenho", type: "axis", left: "serifada", right: "sem serifa" },
  { key: "peso", label: "Peso", type: "axis", left: "leve", right: "encorpada" },
  { key: "largura", label: "Largura", type: "axis", left: "estreita", right: "larga" },
  { key: "autoria", label: "Autoria", type: "axis", left: "neutra", right: "autoral" },
];

export default defineBloco<Dados>({
  id: "tipografia",
  label: "Tipografia",
  description: "Se você já tem a fonte, informe. Se não, diga o que ela precisa transmitir.",
  icon: "tipografia",
  ordem: 40,

  fields: [
    {
      key: "fontes",
      icon: "tipografia",
      label: "Fontes que você já tem ou quer usar",
      type: "textarea",
      rows: 2,
      placeholder: "Neue Haas Grotesk Display, Canela Deck",
      help: "Deixe em branco se ainda não decidiu — as barras abaixo bastam.",
    },
    ...EIXOS,
    {
      key: "transmite",
      icon: "ondas",
      label: "A tipografia precisa transmitir",
      type: "tags",
      suggestions: [
        "autoridade",
        "precisão suíça",
        "elegância editorial",
        "calor humano",
        "modernidade",
        "tradição",
        "tecnologia",
        "artesanal",
        "discrição",
        "impacto",
      ],
    },
    {
      key: "evitar",
      icon: "proibido",
      label: "Tipografia a evitar",
      type: "text",
      placeholder: "Helvetica genérica, tipografia futurista, script",
    },
  ],

  defaults: {
    fontes: "",
    serifa: null,
    peso: null,
    largura: null,
    autoria: null,
    transmite: [],
    evitar: "",
  },

  summary: (data) => comoTexto(data.fontes) || comoTags(data.transmite).slice(0, 2).join(", "),

  toPrompt: (data) => {
    const eixos = EIXOS.map((eixo) => {
      const descricao = descreveEixo(
        eixo.left ?? "",
        eixo.right ?? "",
        comoEixo((data as Record<string, unknown>)[eixo.key]),
      );
      return descricao ? `${eixo.label}: ${descricao}` : null;
    }).filter(Boolean) as string[];

    return secao("Tipografia", [
      linha("Fontes disponíveis", data.fontes),
      eixos.length > 0 ? eixos.join("\n") : null,
      itens("Precisa transmitir", comoTags(data.transmite)),
      linha("Evitar", data.evitar),
      // Sem fonte declarada, a direção tipográfica passa a ser entregável.
      comoTexto(data.fontes)
        ? null
        : "Nenhuma fonte foi escolhida: proponha a direção tipográfica de cada ideia.",
    ]);
  },
});
