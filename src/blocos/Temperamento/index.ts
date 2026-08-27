import {
  comoEixo,
  comoTags,
  descreveEixo,
  itens,
  secao,
  type ValorEixo,
} from "../_shared/format";
import { defineBloco, type FieldDef } from "../types";

type Dados = {
  era: ValorEixo;
  densidade: ValorEixo;
  tom: ValorEixo;
  valor: ValorEixo;
  forma: ValorEixo;
  abstracao: ValorEixo;
  adjetivos: string[];
}

const EIXOS: FieldDef[] = [
  { key: "era", label: "Época", type: "axis", left: "clássico", right: "moderno" },
  { key: "densidade", label: "Densidade", type: "axis", left: "minimalista", right: "expressivo" },
  { key: "tom", label: "Tom", type: "axis", left: "sério", right: "divertido" },
  { key: "valor", label: "Valor percebido", type: "axis", left: "acessível", right: "luxuoso" },
  { key: "forma", label: "Forma", type: "axis", left: "geométrico", right: "orgânico" },
  { key: "abstracao", label: "Abstração", type: "axis", left: "abstrato", right: "figurativo" },
];

/**
 * As barras são a parte que substitui a conversa.
 *
 * Descrever tom em texto livre custa parágrafos e sai diferente a cada
 * projeto; seis barras dizem a mesma coisa em seis toques e com a mesma régua
 * todas as vezes — o que permite comparar duas marcas depois.
 */
export default defineBloco<Dados>({
  id: "temperamento",
  label: "Temperamento",
  description: "Seis barras. O que você não mexer, a IA decide.",
  icon: "barras",
  ordem: 30,

  fields: [
    ...EIXOS,
    {
      key: "adjetivos",
      icon: "etiqueta",
      label: "Adjetivos",
      type: "tags",
      help: "Clique nos que servem ou escreva os seus.",
      suggestions: [
        "sofisticado",
        "confiável",
        "ousado",
        "silencioso",
        "técnico",
        "artesanal",
        "editorial",
        "arquitetônico",
        "atemporal",
        "afiado",
        "acolhedor",
        "institucional",
      ],
    },
  ],

  defaults: {
    era: null,
    densidade: null,
    tom: null,
    valor: null,
    forma: null,
    abstracao: null,
    adjetivos: [],
  },

  summary: (data) => comoTags(data.adjetivos).slice(0, 3).join(", "),

  toPrompt: (data) => {
    const definidos: string[] = [];
    let indefinidos = 0;

    for (const eixo of EIXOS) {
      const descricao = descreveEixo(
        eixo.left ?? "",
        eixo.right ?? "",
        comoEixo((data as Record<string, unknown>)[eixo.key]),
      );
      if (descricao) definidos.push(`${eixo.label}: ${descricao}`);
      else indefinidos += 1;
    }

    return secao("Temperamento da marca", [
      definidos.length > 0 ? definidos.join("\n") : null,
      itens("Adjetivos", comoTags(data.adjetivos)),
      // Dizer que o resto é livre evita o modelo tratar silêncio como restrição
      // e produzir seis ideias todas no mesmo ponto médio.
      definidos.length > 0 && indefinidos > 0
        ? `As demais dimensões não foram definidas: escolha o que melhor serve à marca e varie entre as ideias.`
        : null,
    ]);
  },
});
