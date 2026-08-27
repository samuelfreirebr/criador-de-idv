import { comoRefs, itens, linha, secao } from "../_shared/format";
import { defineBloco } from "../types";

type Dados = {
  imagens: { assetId: string; nota: string }[];
  oQueBuscar: string;
}

/**
 * As imagens em si não entram no texto do briefing — vão anexadas à chamada,
 * porque o modelo enxerga. O que entra aqui é a leitura que o usuário faz de
 * cada uma: sem ela o modelo copia a referência inteira em vez do atributo que
 * interessava.
 */
export default defineBloco<Dados>({
  id: "referencias",
  label: "Referências",
  description: "Suba as imagens e diga, em uma linha, o que atrai você em cada uma.",
  icon: "imagem",
  ordem: 20,

  fields: [
    {
      key: "imagens",
      icon: "imagem",
      label: "Referências visuais",
      type: "images",
      itemLabel: "Referência",
      maxItems: 12,
      help: "Servem como nível de exigência e vocabulário formal — nunca como modelo a copiar.",
    },
    {
      key: "oQueBuscar",
      icon: "lupa",
      label: "O que buscar nelas, em geral",
      type: "textarea",
      rows: 2,
      placeholder: "O grau de customização das letras, não o estilo do desenho.",
    },
  ],

  defaults: { imagens: [], oQueBuscar: "" },

  summary: (data) => {
    const total = comoRefs(data.imagens).length;
    return total > 0 ? `${total} referência${total > 1 ? "s" : ""}` : "";
  },

  toPrompt: (data) => {
    const refs = comoRefs(data.imagens);
    return secao("Referências visuais", [
      refs.length > 0
        ? `${refs.length} imagem(ns) seguem anexadas a esta mensagem, na ordem abaixo.`
        : null,
      itens(
        "Leitura de cada referência",
        refs.map((ref, i) => `Referência ${i + 1}: ${ref.nota || "sem observação"}`),
      ),
      linha("O que buscar nelas", data.oQueBuscar),
      refs.length > 0
        ? "As referências definem o NÍVEL de originalidade e sofisticação esperado. Não reproduza nenhuma delas, nem seus elementos reconhecíveis."
        : null,
    ]);
  },
});
