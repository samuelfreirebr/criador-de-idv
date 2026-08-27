/**
 * Leitura centralizada das variáveis de ambiente.
 *
 * Regra herdada da arquitetura de referência: variável vazia = recurso
 * desligado. Nada quebra num ambiente que não configurou a chave da OpenAI —
 * o app sobe, o briefing é editável, e só a geração avisa que falta a chave.
 */

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return valor;
}

export const env = {
  get authSecret(): string {
    return obrigatoria("AUTH_SECRET");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  /** Chave da OpenAI. Vazia = geração desligada. */
  get openaiKey(): string {
    return (process.env.OPENAI_API_KEY ?? "").trim();
  },
  /**
   * Modelo usado na geração.
   *
   * Sai de variável de ambiente porque a escolha envelhece mais rápido que o
   * código: trocar de modelo não deve exigir build. Precisa aceitar imagens na
   * entrada e resposta em JSON estruturado.
   */
  get openaiModel(): string {
    return (process.env.OPENAI_MODEL ?? "gpt-4o").trim();
  },
  get temGeracao(): boolean {
    return this.openaiKey.length > 0;
  },
};
