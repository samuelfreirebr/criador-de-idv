# Projeto CRIADOR DE IDV (IDPRO)

App IDPRO isolado: gera ideias e prompts de identidade visual a partir do briefing de uma marca. Next.js + Prisma + Docker. Existe uma cópia independente dentro de `../HUB-DE-LANCAMENTOS`.

## Onde ficam as coisas

- **Projeto no Mac:** `~/Documents/PROJETOS/criador-de-idv` (fora do Google Drive; o Drive sincronizando o `.git` corrompe o repositório).
- **GitHub:** https://github.com/samuelfreirebr/criador-de-idv
- **Privados (fora do GitHub):** `Meu Drive/ARQUIVOS-PRIVADOS/CRIADOR-DE-IDV`, pelo atalho `_PRIVADOS/` nesta pasta.
- **Senhas:** `.env` / `.env.local` ficam só aqui e no cofre de senhas. Nunca no Drive nem no GitHub.
- A pasta antiga do Drive foi arquivada em `Meu Drive/90-ARQUIVO/CRIADOR-DE-IDV-ANTIGO-2026-11-07`.

## Contexto e documentação principal

Ler o que for relevante para a tarefa antes de executar:

- `README.md` — o que o app faz.
- `docs/arquitetura.md` — arquitetura técnica.

Regras gerais do Matheus (idioma, etapas, nunca apagar, padrão visual) estão no `CLAUDE.md` global e valem aqui.

## Regras do projeto

- Projeto de código com `.git`: commits só quando o Matheus pedir.
- Mexer aqui não altera a cópia do IDPRO no Hub de Lançamentos, e vice-versa.
- Identidade visual do app: ⚠️ a confirmar. Não inventar cores nem fontes.

## Delegação e modelos

- Escolher sempre o modelo mais barato/rápido que faça a tarefa com qualidade suficiente. Não usar o mais forte para tudo.
- **Opus 5.5 (padrão):** desenvolvimento e design — criação de sites, páginas, criativos, código/HTML/CSS — e também arquitetura, bugs complexos, decisões importantes e revisão crítica.
- **Sonnet 5.5 (intermediário):** tarefas do meio que não são criação — organizar arquivos e pastas, documentação, atualizar fichas e tarefas do vault, processar o inbox, ajustes pequenos de texto.
- **Haiku 5.5 (rápido):** pesquisas simples, resumos, classificação, tarefas repetitivas.
- **Fable 5.1 (mais caro):** só com o ok do Matheus, quando o Opus não der conta.
- Se o ambiente já tiver um modelo configurado, respeitar.
- Subagentes só quando reduzem trabalho, tempo ou contexto. Tarefas independentes em paralelo; dependentes na ordem certa. Especificar o modelo em cada chamada. Nada de vários agentes para uma tarefa simples.

## Economia de contexto e tokens

- Trabalhar com o menor contexto que resolva corretamente: identificar o problema → os arquivos prováveis → ler só o necessário → resolver → verificar de forma objetiva.
- Buscar mais contexto aos poucos, só se precisar. Não abrir dezenas de arquivos "por garantia", não ler arquivos enormes para achar um trecho, não reanalisar o que não tem relação com a tarefa.
- Não repetir informação já conhecida, não rodar comandos para confirmar o óbvio, não gerar explicação longa quando uma curta resolve, não criar documentação desnecessária.
- Antes de criar algo, ver se já existe (arquivo, peça, componente, documentação, Skill) e reutilizar.

## Skills e ferramentas

- Quando uma Skill existente puder resolver ou acelerar a tarefa, procurar com `find-skills`, avaliar se se aplica e usar. Não instalar Skills desnecessárias nem procurar Skill para tarefa trivial.
- **Ponytail** (`/ponytail`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-help`): só se o trabalho envolver código (ex.: HTML/CSS de página). Não usar em tarefas de design, texto ou organização.
- YAGNI: fazer o que foi pedido, sem extras "para o futuro".

## Segurança e preservação

- **Nunca apagar** nem sobrescrever arquivos do projeto. Versão nova = arquivo novo; o original fica intacto. Antes de qualquer operação destrutiva ou irreversível, confirmar com o Matheus.
- Atenção especial com: originais e arquivos editáveis (PSD, AI, Figma, SVG), fotos, contratos e documentos de `ADMIN`, backups, configurações e credenciais.
- **Não inventar** dados, números, depoimentos, clientes, produtos, funcionalidades, requisitos ou resultados. Informação que falta fica marcada com ⚠️ para confirmar.

## Fluxo de trabalho

- Trabalhar por etapas e não avançar para a próxima sem o ok do Matheus.
- Tarefa normal: entender → achar os arquivos relevantes → consultar a documentação necessária → escolher o modelo → ver se há Skill útil → (se for código) considerar abordagem mínima → executar → conferir o resultado (peça visual é conferida visualmente antes da entrega).
- Tarefa complexa: plano curto, arquivos envolvidos, executar, validar. Tarefa simples: direto ao ponto, sem burocracia.
- Ao terminar: o que foi alterado, quais arquivos, decisões importantes e o que precisa de atenção. Sem colar arquivos inteiros.
- Regra de ouro: **menor contexto + modelo adequado + menor complexidade + máxima correção.**
- Este arquivo complementa a documentação do projeto. Regra específica do projeto prevalece sobre regra genérica; em dúvida real, perguntar.
