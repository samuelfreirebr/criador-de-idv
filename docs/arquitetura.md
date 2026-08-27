# IDPRO — arquitetura

Este documento descreve **como** o IDPRO foi construído. Não é a documentação do
produto: é a planta da estrutura, as decisões que se repetem e as armadilhas que
já custaram caro.

Deriva da planta do Sistema de Planejamentos Automáticos (Casa SW). O que foi
mantido, o que mudou e por quê está na seção 11.

---

## 1. O princípio central

> **O sistema não sabe o que existe. Ele descobre.**

Cada seção do briefing é uma **pasta** em `src/blocos/`. Um script varre essas
pastas antes de cada `dev` e de cada `build` e gera o registro. Nada mais precisa
saber que a pasta existe: o formulário, a barra de progresso, a normalização dos
dados e o texto enviado à IA são todos derivados da descrição que a pasta faz de
si mesma.

Três consequências:

1. **Acrescentar uma pergunta ao briefing é criar uma pasta.** Nenhum arquivo
   existente é editado.
2. **Nunca há migração de banco para conteúdo novo.** O que o usuário preenche
   vive numa coluna JSON.
3. **Não existem dois lugares para manter em sincronia.** O que descreve os
   campos é o mesmo que desenha o formulário e o mesmo que escreve o briefing.

---

## 2. Stack

| Camada | Escolha | Observação |
|---|---|---|
| Framework | Next.js 15, App Router, `output: standalone` | Server Components por padrão; `"use client"` só onde há estado |
| UI | React 19 + TypeScript strict | |
| Estilo | Tailwind CSS v4 com `@theme` | Sem arquivo de config; os tokens vivem no CSS |
| Banco | PostgreSQL + Prisma 6 | |
| Validação | Zod | Em toda entrada de API |
| Estado do editor | Zustand (store por instância, via contexto) | |
| Sessão | `jose` (JWT) + cookie httpOnly | Sem biblioteca de auth |
| Senhas | bcryptjs | |
| IA | OpenAI, via `fetch` | Sem SDK — o que se usa cabe em duas funções |
| Fontes | `next/font/google` (Inter + Archivo) | Baixadas no build, servidas pelo app |
| Runtime | Node 22 (bookworm-slim) | |
| Entrega | GitHub Actions → ghcr.io → Portainer / Docker Swarm | Traefik na frente |

Nada de biblioteca de componentes. A interface é Tailwind mais um punhado de
primitivas em `src/components/ui.tsx`.

---

## 3. Estrutura de pastas

```
src/
  app/
    (app)/                  Telas autenticadas, com a casca comum
    api/                    Handlers REST
    login/
    globals.css             Tokens do Tailwind
  components/
    editor/                 Store, autosave, painel de briefing, painel de ideias
    ui.tsx                  Primitivas de interface
    Logo.tsx                A marca do próprio app
  lib/
    api.ts                  Envelope das rotas: sessão + erros + Zod
    auth.ts                 JWT de sessão
    env.ts                  Leitura centralizada do ambiente
    prisma.ts               Cliente único
    queries.ts              Leituras compostas
    types.ts                DTOs entre servidor e cliente
    ideia.ts                >>> O contrato do card de ideia <<<
    openai.ts               Cliente da OpenAI
    geracao.ts              >>> O motor: contexto, prompts de sistema, chamadas <<<
    preenchimento.ts        "Deixe a IA decidir": schema derivado do registro
  blocos/                   >>> O CORAÇÃO <<<
    types.ts                O contrato
    registry.ts             Leitura do registro + normalização + montagem do briefing
    registry.generated.ts   GERADO — não editar
    _shared/format.ts       Puro: constantes e funções (SEM "use client")
    _shared/icons.tsx       Componentes de ícone
    <Nome>/index.ts         Uma seção do briefing
  middleware.ts             Proteção de rotas
scripts/sync-blocos.mjs     Gera o registro a partir das pastas
prisma/                     schema.prisma + migrations
docker/                     entrypoint.sh + criação do admin
```

**Pasta iniciada por `_` não é registrada.** É assim que `_shared/` convive com
as pastas de bloco sem virar uma delas.

---

## 4. O contrato de bloco

### 4.1 A definição

Um bloco declara **três coisas obrigatórias**:

```ts
export interface BlocoDefinition<TData extends BlocoData = BlocoData> {
  id: string;          // persistido em `blocos.tipo`. Nunca deve mudar.
  label: string;
  description: string;
  icon: IconName;
  ordem: number;       // posição no briefing — mora aqui, não no banco

  fields: FieldDef[];               // 1. quais campos existem
  defaults: TData;                  // 2. o conteúdo inicial
  toPrompt: (data: TData) => string; // 3. como vira briefing

  summary?: (data: TData) => string;  // resumo na lista lateral
  migrate?: (raw: BlocoData) => BlocoData;  // conserta dados antigos
}
```

No sistema de referência o terceiro item era `Render` — desenhar a página. Aqui
a saída é texto para um modelo de linguagem, mas o papel é o mesmo: **o bloco é
o único lugar que sabe traduzir os próprios campos**.

`toPrompt` devolvendo string vazia omite a seção inteira. Isso importa mais do
que parece: um cabeçalho sem conteúdo faz o modelo ler "esta dimensão foi
considerada e não importa", que é o oposto do pretendido.

### 4.2 Os campos

Dez tipos: `documento`, `text`, `textarea`, `select`, `checkbox`, `list`,
`images`, `axis`, `tags`, `colors`.

**O formulário inteiro é gerado daí.** Nenhum bloco escreve HTML de formulário.
Para criar um tipo novo o trabalho é sempre o mesmo: acrescentar ao union em
`types.ts`, tratar em `CampoInput.tsx`, definir o valor vazio em `registry.ts`.

Três tipos merecem nota:

- **`documento`** — a caixa do briefing. Aceita texto colado ou um arquivo de
  texto solto sobre ela, e o arquivo é lido NO NAVEGADOR: o conteúdo vira texto
  visível no campo em vez de virar anexo. O que a IA recebe é exatamente o que
  está na tela, e dá para corrigir antes de gerar.

- **`axis`** — a barra de temperamento. O valor é `-3..3`, ou **`null` quando o
  usuário não mexeu**. Os dois estados são diferentes no briefing: `0` pede
  equilíbrio explícito, `null` autoriza o modelo a variar entre as ideias. Por
  isso existe o botão "limpar" — sem ele não haveria como voltar ao segundo
  estado depois de tocar na barra.
- **`tags`** — chips com sugestões clicáveis e entrada livre. As sugestões
  existem para que preencher seja um clique; a lista nunca é fechada porque toda
  marca tem uma palavra que a lista não previu.

### 4.3 A fronteira cliente/servidor — leia com atenção

Um módulo marcado com `"use client"` exporta **referências opacas** para o
servidor: uma constante importada de lá chega como `undefined` em código de
servidor, silenciosamente.

Por isso `_shared/` é dividido:

- **`format.ts`** — sem `"use client"`. Constantes, funções puras, regras de
  domínio. Lido dos dois lados.
- **`icons.tsx`** — componentes. As pastas de bloco importam apenas
  `type IconName`, e importação de tipo é apagada na compilação: declarar um
  ícone não arrasta React nenhum para dentro da definição.

O montador do briefing roda no servidor; o formulário roda no cliente. Tudo o
que os dois precisam conhecer mora em `format.ts`.

---

## 5. O pipeline de geração

> **O contexto é montado do banco a cada chamada, não acumulado numa conversa.**

```
   blocos/<Nome>/toPrompt()
              │
              ▼
   registry.montarBriefing()  +  refsVisuaisDoProjeto()
              │                          │
              ▼                          ▼
     texto do briefing            imagens em base64
              └────────────┬─────────────┘
                           ▼
              lib/geracao.ts  (+ histórico das rodadas)
                           ▼
                    lib/openai.ts
                           ▼
              ideias (JSON estruturado)  →  prompt em PT  →  JSON em inglês
```

As regras que sustentam isso:

1. **O histórico é resumido por veredito.** Ideia amada volta inteira — é dela
   que a próxima rodada precisa se aproximar. Descartada volta em uma linha, o
   bastante para não ser repetida. Sem isso a rodada 8 custaria oito vezes a
   rodada 1 e afogaria o briefing.
2. **O contrato do card mora em `lib/ideia.ts`.** A mesma lista gera o JSON
   Schema exigido do modelo, a validação Zod e os rótulos do card. A `descricao`
   de cada campo **é** a instrução que o modelo lê — assim ninguém acrescenta um
   campo e esquece de descrevê-lo.
3. **JSON estruturado com `strict`.** Todo campo obrigatório, nenhuma
   propriedade extra. O card nunca chega pela metade e o app não precisa de
   fallback para campo ausente.
4. **As legendas das referências vão ANTES de cada imagem.** Assim o modelo já
   sabe o que procurar quando olha, em vez de reconciliar nota e imagem no fim
   de uma sequência de doze.
5. **A mensagem de erro da OpenAI vai para a tela.** Chave inválida, modelo
   inexistente, limite atingido — esconder isso transformaria um problema de
   configuração de dois minutos numa investigação de uma hora.
6. **O schema de "Deixe a IA decidir" é derivado do registro de blocos**, campo
   a campo (`lib/preenchimento.ts`). É o princípio da arquitetura levado até o
   fim: criar uma pasta nova não torna essa função obsoleta — o campo novo entra
   no schema sozinho e o modelo passa a preenchê-lo, sem ninguém editar nada.
   O que o modelo devolve passa pela MESMA normalização de qualquer gravação;
   seria o único lugar do app onde dados entrariam sem passar pelo contrato.
7. **A variação recebe a leitura anterior e a instrução de se afastar dela.**
   Sem isso o modelo devolve quase a mesma resposta: o briefing é o mesmo, e o
   caminho mais provável continua sendo o mais provável. As proibições do
   briefing são declaradas imutáveis — elas são fato, não estilo.

---

## 6. Modelo de dados

```prisma
model Projeto {          // o agregado: uma marca a criar
  id, nome, status
  blocos   Bloco[]
  rodadas  Rodada[]
  ideias   Ideia[]
}

model Bloco {            // a unidade: uma seção do briefing
  id, projetoId
  tipo  String           // id do bloco registrado
  data  Json             // <<< o conteúdo, no formato do bloco
  @@unique([projetoId, tipo])
}

model Rodada { id, projetoId, numero, quantidade, instrucao }
model Ideia  { id, rodadaId, projetoId, ordem, data Json, veredito, comentario }
model Prompt { id, ideiaId @unique, titulo, texto, json Json?, ajuste, configuracao Json? }
```

**A coluna `data` é o motivo de nunca haver migração para conteúdo novo.**

Duas diferenças em relação ao sistema de referência:

- **Não há coluna de posição no `Bloco`.** O usuário não reordena seções: todo
  projeto tem todas, sempre na mesma sequência. A ordem vem do registro, então
  renumerar seções não toca em nenhum projeto salvo.
- **`Prompt.ideiaId` é único.** Regenerar sobrescreve em vez de criar um
  segundo. É a idempotência que evita duas versões concorrentes do mesmo
  conceito na tela.
- **`Prompt.configuracao` guarda o briefing inteiro no instante da geração.**
  O briefing é editado o tempo todo; um prompt bom escrito há três dias não teria
  como ser reproduzido depois que as barras mudaram. A fotografia é tirada ANTES
  da chamada ao modelo — tirá-la depois arriscaria gravar um briefing já alterado
  noutra aba enquanto o texto era escrito.

### 6.1 Normalização na leitura

`normalizeBlocoData(tipo, raw)` roda toda vez que um bloco é lido ou salvo:
campo novo entra com o valor vazio do seu tipo, campo removido é descartado, e
`migrate` roda antes de tudo. Um bloco evolui sem quebrar registros antigos.

**A normalização roda no servidor antes de gravar.** O cliente pode mandar
qualquer coisa; confiar no formato enviado pelo formulário deixaria o banco à
mercê de uma aba aberta com uma versão antiga do app.

### 6.2 Blocos que faltam

`garantirBlocos(projetoId)` cria os blocos ainda inexistentes toda vez que um
projeto é aberto. É o que mantém a promessa "criar uma pasta e pronto" válida
para projetos **antigos**: um bloco acrescentado hoje aparece amanhã em todo
projeto já salvo, vazio, sem script de correção.

### 6.3 Imagens

Ficam **no banco** (`model Asset`, coluna `Bytes`), não em disco: em Docker
Swarm a aplicação pode ter mais de uma réplica e um volume local não seria
compartilhado.

Ao contrário do sistema de referência, **a leitura também exige sessão**. Lá
`/api/assets` era público porque o Chromium que gerava o PDF precisava abrir as
imagens sem cookie. Aqui não há Chromium anônimo, então não há motivo para
abrir.

---

## 7. API

Todo handler passa pelo mesmo envelope:

```ts
export const POST = route(async ({ user, context, request }) => {
  const input = await parseBody(request, schema);   // Zod
  return { id };                                     // vira NextResponse.json
});
```

`route()` exige sessão (401), converte `HttpError` em resposta com status e
`ZodError` em 422 com os campos, e registra o que não foi tratado devolvendo 500
genérico.

**O servidor é a autoridade.** O número de uma rodada nova é decidido lá, não no
cliente: duas abas gerando ao mesmo tempo produziriam duas "Rodada 3".

---

## 8. Autenticação

JWT assinado com `jose`, cookie `httpOnly`, `sameSite: lax`, 7 dias. Sem
biblioteca de auth.

`src/middleware.ts` protege tudo, com duas exceções: `/login` e
`/api/auth/login`.

**O `matcher` precisa excluir os arquivos estáticos — inclusive as fontes.** Um
`.woff2` que passa pelo middleware é redirecionado para o login.

---

## 9. O editor

**Duas colunas, sem abas**: briefing à esquerda, ideias à direita. Um store
Zustand por instância, entregue por contexto; os dois painéis leem do mesmo
store, e o prompt de cada ideia abre dentro do próprio card.

A primeira versão tinha três abas e uma coluna de navegação com nove seções de
briefing. Duas coisas mataram esse desenho:

- **Trocar de aba para comparar o que se pediu com o que voltou é atrito puro** —
  e comparar é literalmente o trabalho que se faz ali.
- **Um formulário de nove seções sugere que o trabalho está incompleto quando
  não está.** Mais da metade das perguntas não tem resposta no início de um
  projeto, e o briefing normalmente já existe escrito. Uma caixa grande que
  aceita o documento inteiro substituiu as seções de marca, negócio e público.

No celular as colunas viram pilha: duas colunas em 375px não são duas colunas.

A lista de projetos recolhe para um trilho de 52px, e a divisória entre as duas
colunas é arrastável — as duas escolhas ficam guardadas no navegador. A largura
vai por variável CSS aplicada só no desktop: no celular o contêiner é uma coluna,
e `flex-basis` ali controlaria a ALTURA.

Os cards de ideia nascem fechados, mostrando só nome e ideia central. Abertos,
cada um passava de uma tela: gerar seis significava rolar seis telas para saber
o que havia saído, e comparar — que é o trabalho — ficava impossível.

**As colunas de ideias reagem à largura do PAINEL, não da janela.** Como a
divisória é arrastável, uma media query olharia para a coisa errada: a janela
pode ter 1600px enquanto o painel tem 400. A solução é uma container query —
`@container` no painel e `@min-[46rem]:grid-cols-2` na grade. 46rem porque é
onde duas colunas ainda dão ~355px cada, largura em que a frase se lê sem varrer
a linha inteira.

**Um card com prompt se anuncia em três lugares:** o selo laranja ao lado do
nome, o botão "Copiar prompt" no rodapé e a faixa do prompt com fundo da marca.
Copiar é a última coisa que se faz com um card e a mais repetida — escondê-la
atrás de "abrir a seção primeiro" era o atrito mais caro da tela.

**Apagar não é o mesmo que descartar.** "Descartei" mantém o registro e alimenta
a rodada seguinte com o território a evitar; apagar remove da história, e a IA
volta a poder propor aquilo. São dois gestos com efeitos opostos sobre a próxima
geração, e a interface os separa: o veredito fica no card, a lixeira fica no
cabeçalho da rodada.

### 9.1 Salvamento

Não existe botão "Salvar". O store marca o que está sujo, o `AutoSaver` observa
e envia depois de 700 ms de pausa. `beforeunload` avisa se ainda há pendência.

**Falha não vira tempestade de requisições.** Duas regras, e as duas foram
escritas depois de ver o problema acontecer:

- **Erro 4xx (exceto 408 e 429) para o ciclo.** Sessão expirada, projeto apagado
  noutra aba, payload rejeitado: reenviar o mesmo corpo produz exatamente a
  mesma resposta. A alteração continua pendente e a próxima edição reabre o
  ciclo.
- **Erro 5xx ou de rede recua exponencialmente**, de 1,4 s até um teto de 30 s.
  Uma edição nova zera o recuo — o usuário mexeu, vale tentar já.

Sem isso, um servidor fora do ar recebia uma requisição a cada 700 ms,
indefinidamente. Foi medido: centenas de PATCH idênticos em segundos.

### 9.2 O que já foi salvo fica salvo

O envio confirma item a item, fora do `try`. Uma falha no fim da fila não pode
fazer reenviar o que já tinha dado certo.

---

## 10. Armadilhas que custaram caro

| Armadilha | Sintoma | Solução |
|---|---|---|
| `"use client"` num módulo de constantes | Constante chega `undefined` no servidor, sem erro | Separar puro (`format.ts`) de componentes (`icons.tsx`) |
| Autosave que repete indefinidamente ao falhar | Centenas de requisições idênticas; a causa some no meio delas | 4xx encerra o ciclo; 5xx recua exponencialmente |
| Largura passada por `className` a uma primitiva que já tem `w-full` | O campo colapsa para zero, sem erro nenhum | A largura vive no contêiner, não na primitiva |
| Condição "algum bloco preenchido" | Sempre verdadeira, porque há bloco com valor padrão | Perguntar pelo campo que realmente importa |
| Item de flex sem `min-w-0` | Texto longo empurra a coluna para fora da tela e deforma a interface inteira | `min-w-0` em toda a cadeia + `break-words` no texto |
| `npm run build` com o `next dev` rodando | Dezenas de `Cannot find module` no dev | Os dois compartilham `.next`; nunca rodar juntos |
| `prisma generate` sem reiniciar o dev | `PrismaClientValidationError` em coluna que existe | O processo guarda o client antigo em memória |
| Apagar um componente com o `next dev` rodando | Build error apontando um arquivo que não existe mais | Reiniciar o servidor; o cache de módulos não acompanha remoção |
| Página autenticada sem `dynamic = "force-dynamic"` | O build tenta pré-renderizar e falha por não ter banco | Declarar o segmento como dinâmico |
| `useSearchParams` sem fronteira de Suspense | Erro de build na página de login | Envolver o componente em `<Suspense>` |
| Fontes atrás do middleware | Redirecionadas para o login | Excluir `woff2?\|ttf\|otf` do `matcher` |
| `depends_on` no Swarm | Container reinicia em laço no boot | Esperar o banco no entrypoint |
| Copiar `node_modules/prisma` do build | A CLI de migração não roda: faltam pacotes da raiz | Instalar a CLI limpa num estágio próprio |
| Nome de imagem com maiúscula | `docker push` falha no CI | Forçar minúsculas no workflow |

---

## 11. O que veio da planta original, e o que mudou

**Mantido sem alteração:**

- O contrato de módulo por pasta + registro gerado por script em `predev`/`prebuild`
- `_shared/` dividido entre puro e componentes
- `lib/api.ts` — o envelope das rotas
- `lib/auth.ts` + `middleware.ts`
- O store do editor + autosave sem botão "Salvar"
- O modelo `Agregado → Módulo(tipo, data JSON)`
- Dockerfile de quatro estágios, entrypoint com espera do banco, fluxo de publicação

**Mudou:**

| Original | Aqui | Por quê |
|---|---|---|
| `Planning` / `Session` | `Projeto` / `Bloco` | Outro domínio |
| `Render` (desenha a página) | `toPrompt` (escreve o briefing) | A saída é texto para um modelo, não um documento |
| `Session.order` no banco | `ordem` no registro | O usuário não reordena seções do briefing |
| `toExport` (webhook) | — | Não há integração externa; a saída é o prompt na tela |
| `lib/pdf.ts`, `/print/[id]`, geometria 1080×1920 | removidos | Não há PDF |
| `/api/assets` público | protegido | Não há Chromium anônimo para servir |
| Chaves reservadas `_escala`, `_enquadramento` | — | Não há apresentação a ajustar |
| Interface clara | Interface escura | O app existe para olhar referências visuais; um fundo branco entra na leitura de cada imagem |
| Editor em três colunas | Duas colunas, sem abas | A comparação entre briefing e ideias é o trabalho; navegar entre telas para fazê-la é atrito |

---

### 9.3 Ícones: o nome descreve o significado, não o desenho

`IconName` é a união literal das chaves de `CAMINHOS` — sem anotação de tipo no
objeto, de propósito. Com `Record<string, string>` qualquer string passava, e um
ícone renomeado só aparecia como um espaço em branco na tela.

Os nomes descrevem o que o ícone quer dizer (`escala`, `proibido`, `curva`), não
o que ele parece. Um nome genérico convida a reaproveitar o mesmo desenho em
lugares sem relação: um ícone chamado `marca` acabou servindo de nome de
projeto, de título de conceito e de símbolo — três coisas diferentes com o mesmo
escudo ao lado.

---

## 12. Convenções de código

**Comentários explicam o porquê, não o quê.** O código já diz o que faz; o
comentário registra a decisão e, quando vale, a alternativa recusada.

**Idioma.** Comentários, nomes internos e textos de interface em português.
Chaves que atravessam a fronteira do framework ou de uma API externa (`fields`,
`type`, `data`, `key`) ficam em inglês. Não misture dentro de um mesmo escopo.

**Verificar rodando, não olhando.** Toda alteração é conferida com a aplicação
de pé e um navegador percorrendo o fluxo real. Ler o diff não pega um campo que
colapsa para zero de largura, nem um autosave que repete para sempre — os dois
foram encontrados assim.
