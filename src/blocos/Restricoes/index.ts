import { comoTags, itens, linha, secao } from "../_shared/format";
import { defineBloco } from "../types";

type Dados = {
  simbolosProibidos: string[];
  estilosProibidos: string[];
  reproducao: string[];
  obrigatorio: string;
}

/**
 * O que evitar costuma ser mais decisivo que o que buscar.
 *
 * Sem esta lista todo briefing de mentoria vira lobo, coroa ou montanha — o
 * modelo devolve a média do que existe no mercado, que é exatamente o que uma
 * marca nova não pode ser.
 */
export default defineBloco<Dados>({
  id: "restricoes",
  label: "Restrições",
  description: "O que está proibido e onde a marca precisa sobreviver.",
  icon: "proibido",
  ordem: 60,

  fields: [
    {
      key: "simbolosProibidos",
      icon: "proibido",
      label: "Símbolos proibidos",
      type: "tags",
      suggestions: [
        "lobo",
        "leão",
        "águia",
        "coroa",
        "montanha",
        "seta ascendente",
        "troféu",
        "cifrão",
        "engrenagem",
        "lâmpada",
        "globo",
        "folha",
        "aperto de mão",
        "gráfico de barras",
      ],
    },
    {
      key: "estilosProibidos",
      icon: "proibido",
      label: "Estéticas proibidas",
      type: "tags",
      suggestions: [
        "estética de guru",
        "estética de startup",
        "motivacional",
        "cyberpunk",
        "neon",
        "3D brilhante",
        "cromado",
        "gradiente exagerado",
        "dourado brilhante",
        "vintage genérico",
        "mão livre",
      ],
    },
    {
      key: "reproducao",
      icon: "escala",
      label: "Precisa funcionar em",
      type: "tags",
      suggestions: [
        "favicon 16px",
        "monocromático",
        "bordado",
        "gravação em metal",
        "relevo seco",
        "fachada",
        "carimbo",
        "fundo escuro e claro",
        "vídeo",
      ],
      help: "Cada item aqui vira um teste que a ideia precisa passar.",
    },
    {
      key: "obrigatorio",
      icon: "check",
      label: "Obrigatoriedades",
      type: "textarea",
      rows: 2,
      placeholder: "A letra grega alpha precisa aparecer. O nome completo não pode ser abreviado.",
    },
  ],

  defaults: {
    simbolosProibidos: [],
    estilosProibidos: [],
    reproducao: [],
    obrigatorio: "",
  },

  summary: (data) => {
    const total =
      comoTags(data.simbolosProibidos).length + comoTags(data.estilosProibidos).length;
    return total > 0 ? `${total} ${total === 1 ? "restrição" : "restrições"}` : "";
  },

  toPrompt: (data) =>
    secao("Restrições", [
      linha("Obrigatório", data.obrigatorio),
      itens("Símbolos proibidos", comoTags(data.simbolosProibidos)),
      itens("Estéticas proibidas", comoTags(data.estilosProibidos)),
      itens("A marca precisa funcionar em", comoTags(data.reproducao)),
    ]),
});
