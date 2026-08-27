import {
  comoCores,
  comoEixo,
  comoTags,
  descreveEixo,
  itens,
  linha,
  secao,
  type ValorEixo,
} from "../_shared/format";
import { defineBloco, type FieldDef } from "../types";

type Dados = {
  paleta: { hex: string; nome: string; uso: string }[];
  temperatura: ValorEixo;
  saturacao: ValorEixo;
  luminosidade: ValorEixo;
  amplitude: ValorEixo;
  transmite: string[];
  evitar: string;
}

const EIXOS: FieldDef[] = [
  { key: "temperatura", label: "Temperatura", type: "axis", left: "fria", right: "quente" },
  { key: "saturacao", label: "Saturação", type: "axis", left: "dessaturada", right: "vibrante" },
  { key: "luminosidade", label: "Luminosidade", type: "axis", left: "clara", right: "escura" },
  {
    key: "amplitude",
    label: "Amplitude",
    type: "axis",
    left: "monocromática",
    right: "multicolorida",
  },
];

export default defineBloco<Dados>({
  id: "cores",
  label: "Cores",
  description: "Se a paleta já existe, informe. Se não, ajuste o temperamento.",
  icon: "paleta",
  ordem: 50,

  fields: [
    {
      key: "paleta",
      icon: "paleta",
      label: "Paleta já definida",
      type: "colors",
      itemLabel: "Cor",
      maxItems: 8,
      help: "Deixe vazio se a paleta ainda está em aberto.",
    },
    ...EIXOS,
    {
      key: "transmite",
      icon: "ondas",
      label: "A cor precisa transmitir",
      type: "tags",
      suggestions: [
        "sobriedade",
        "energia",
        "confiança",
        "exclusividade",
        "natureza",
        "tecnologia",
        "calor",
        "silêncio",
        "urgência",
        "tradição",
      ],
    },
    {
      key: "evitar",
      icon: "proibido",
      label: "Cores a evitar",
      type: "text",
      placeholder: "Dourado brilhante, azul corporativo, neon",
    },
  ],

  defaults: {
    paleta: [],
    temperatura: null,
    saturacao: null,
    luminosidade: null,
    amplitude: null,
    transmite: [],
    evitar: "",
  },

  summary: (data) => {
    const paleta = comoCores(data.paleta);
    if (paleta.length > 0) return paleta.map((cor) => cor.hex).join(" ");
    return comoTags(data.transmite).slice(0, 2).join(", ");
  },

  toPrompt: (data) => {
    const paleta = comoCores(data.paleta);
    const eixos = EIXOS.map((eixo) => {
      const descricao = descreveEixo(
        eixo.left ?? "",
        eixo.right ?? "",
        comoEixo((data as Record<string, unknown>)[eixo.key]),
      );
      return descricao ? `${eixo.label}: ${descricao}` : null;
    }).filter(Boolean) as string[];

    return secao("Cores", [
      itens(
        "Paleta definida",
        paleta.map((cor) =>
          [cor.hex, cor.nome, cor.uso].filter(Boolean).join(" — "),
        ),
      ),
      eixos.length > 0 ? eixos.join("\n") : null,
      itens("Precisa transmitir", comoTags(data.transmite)),
      linha("Evitar", data.evitar),
      paleta.length > 0
        ? "Use exatamente estas cores; não invente outras."
        : "Nenhuma paleta foi definida: proponha uma para cada ideia, com nome e código hexadecimal.",
    ]);
  },
});
