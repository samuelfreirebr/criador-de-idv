import { comoTexto, secao } from "../_shared/format";
import { defineBloco } from "../types";

type Dados = {
  texto: string;
};

/**
 * O briefing inteiro num campo só.
 *
 * A primeira versão do app quebrava isto em nove perguntas — o que é a marca, o
 * público, a promessa, o diferencial. Na prática o briefing já existe escrito
 * antes de o projeto começar, e responder de novo, em pedaços, é redigitar. Pior:
 * mais de metade dessas perguntas não tem resposta no início, e um formulário
 * cheio de campos vazios sugere que o trabalho está incompleto quando não está.
 *
 * Uma caixa grande resolve os dois problemas: cola-se o que existe, seja qual
 * for o formato, e o que não existe simplesmente não é escrito.
 */
export default defineBloco<Dados>({
  id: "briefing",
  label: "Briefing",
  description: "Cole o briefing da marca ou carregue um arquivo de texto.",
  icon: "documento",
  ordem: 10,

  fields: [
    {
      key: "texto",
      label: "Briefing completo",
      type: "documento",
      icon: "documento",
      placeholder:
        "Cole aqui tudo o que você tem sobre a marca: o que é, para quem, o que promete, o que a diferencia, de onde veio o nome, como quer ser percebida…",
      help: "Quanto mais texto, menos genéricas as ideias. Não precisa organizar — pode colar bruto.",
    },
  ],

  defaults: { texto: "" },

  summary: (data) => {
    const texto = comoTexto(data.texto);
    if (!texto) return "";
    const palavras = texto.split(/\s+/).length;
    return `${palavras} palavras`;
  },

  toPrompt: (data) => secao("Briefing da marca", [comoTexto(data.texto)]),
});
