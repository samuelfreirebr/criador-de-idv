# IDPRO

Gerador de ideias e prompts de identidade visual.

Você cola o briefing da marca — ou carrega o arquivo —, ajusta o temperamento
em barras, e a IA devolve ideias em texto: símbolo, gesto assinatura,
tipografia, cor e a justificativa. Você marca as que gostou e cada uma vira um
prompt completo, pronto para colar num gerador de imagem.

Tudo numa tela só: briefing à esquerda, ideias à direita, com uma divisória
arrastável entre as duas. Sem abas.

**Deixe a IA decidir.** Um botão lê o briefing e preenche sozinho temperamento,
tipografia, cores, restrições e entrega — é a leitura estratégica do modelo,
exposta em controles que você pode discordar e mexer. O botão ao lado pede uma
segunda leitura, deliberadamente diferente, mantendo intactas as proibições que
vieram do briefing.

**Cada prompt guarda o briefing que o gerou.** Se você mexeu em tudo desde
então e quer voltar àquela configuração, "Recriar briefing" devolve o estado
exato à coluna da esquerda. E o campo de ajuste reescreve um prompt específico
("troque só a paleta para verde escuro") sem tocar na ideia.

O que o app resolve, em relação a fazer isso no ChatGPT: **o contexto é montado
do banco a cada chamada**, com tamanho controlado. A rodada 9 recebe o mesmo
briefing limpo que a rodada 1, mais um resumo do que já saiu e do que você
aprovou ou descartou. A conversa nunca cresce, então nunca se perde.

---

## Rodar localmente

Com Docker (não exige nada instalado além dele):

```bash
docker compose up --build
```

Sem Docker, com um Postgres já disponível:

```bash
cp .env.example .env   # preencha DATABASE_URL, AUTH_SECRET e OPENAI_API_KEY
npm install
npx prisma migrate deploy
npm run dev
```

Sem Docker E sem Postgres instalado, o projeto traz o seu próprio banco:

```bash
npm run banco:iniciar   # sobe um Postgres em .banco-local/, sem instalar nada
npm run banco:parar
```

O app sobe em `http://localhost:3000`. Para criar o primeiro usuário sem subir o
container:

```bash
ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD=suasenha node docker/criar-usuario.mjs
```

---

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Postgres. Obrigatória. |
| `AUTH_SECRET` | Assina o JWT da sessão. Obrigatória. `openssl rand -base64 32` |
| `OPENAI_API_KEY` | **Vazia = geração desligada.** O app sobe, o briefing funciona, e só o botão de gerar avisa que falta a chave. |
| `OPENAI_MODEL` | Modelo usado. Padrão `gpt-4o`. Precisa aceitar imagens na entrada e resposta em JSON estruturado. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Administrador criado ou atualizado a cada boot do container. Trocar a senha é trocar a variável e reimplantar. |

> **Sobre o modelo:** `OPENAI_MODEL` sai de variável de ambiente porque essa
> escolha envelhece mais rápido que o código. Troque para o modelo que você
> quiser sem rebuild. Se o nome não existir, a própria mensagem de erro da
> OpenAI aparece na tela.

---

## Acrescentar uma pergunta ao briefing

Crie uma pasta em `src/blocos/`, com um `index.ts`:

```ts
import { linha, secao } from "../_shared/format";
import { defineBloco } from "../types";

type Dados = { canal: string };

export default defineBloco<Dados>({
  id: "distribuicao",          // nunca deve mudar: é o que fica no banco
  label: "Distribuição",
  description: "Onde a marca vai aparecer.",
  icon: "entrega",
  ordem: 85,                   // posição no briefing

  fields: [{ key: "canal", label: "Canais", type: "text" }],
  defaults: { canal: "" },
  toPrompt: (data) => secao("Distribuição", [linha("Canais", data.canal)]),
});
```

E pronto. O formulário, a barra de progresso, a normalização dos dados e o texto
enviado à IA são derivados daí. **Nenhum arquivo existente é editado e não há
migração de banco** — o conteúdo vive numa coluna JSON, e projetos já salvos
ganham o bloco novo, vazio, na próxima vez que forem abertos.

Tipos de campo disponíveis: `documento` (caixa grande que aceita arquivo de
texto), `text`, `textarea`, `select`, `checkbox`, `list`, `images`, `axis`
(barra de temperamento), `tags` (chips) e `colors` (paleta).

---

## Publicar

`push` na `main` → GitHub Actions constrói a imagem → `ghcr.io/<owner>/idpro`
com as tags `latest` e a hash do commit.

No Portainer: **Stacks → Update the stack**, com *Re-pull image* marcado. O
`docker-stack.yml` já traz as labels do Traefik para
`idpro.samuelfreire.com.br`.

---

## Documentação

[`docs/arquitetura.md`](docs/arquitetura.md) — como o sistema é construído: o
contrato dos blocos, o pipeline de geração, as armadilhas já encontradas.
