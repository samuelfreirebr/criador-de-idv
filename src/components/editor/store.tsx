"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { BlocoData } from "@/blocos/types";
import type {
  BlocoDTO,
  IdeiaDTO,
  ProjetoDetalhe,
  PromptDTO,
  RodadaDTO,
  Veredito,
} from "@/lib/types";

/**
 * Estado do editor.
 *
 * O formulário do briefing, o painel de ideias e o de prompts leem deste mesmo
 * store. A persistência é assíncrona e desacoplada: `dirty*` registra o que
 * ainda precisa ir para o banco e o AutoSaver cuida do envio — não existe botão
 * "Salvar" em lugar nenhum do app.
 */

export type StatusSalvamento = "parado" | "pendente" | "salvando" | "salvo" | "erro";

export interface EstadoEditor {
  projeto: ProjetoDetalhe;

  dirtyBlocos: Record<string, true>;
  dirtyIdeias: Record<string, true>;
  projetoDirty: boolean;
  status: StatusSalvamento;

  /** Geração em curso. Trava os botões e mostra o estado na tela. */
  gerando: boolean;
  erro: string | null;

  setStatus: (status: StatusSalvamento) => void;
  setGerando: (gerando: boolean) => void;
  setErro: (erro: string | null) => void;
  marcarSalvo: (blocos: string[], ideias: string[], projetoSalvo: boolean) => void;
  marcarFalha: () => void;

  definirNome: (nome: string) => void;
  atualizarCampo: (tipo: string, key: string, valor: unknown) => void;
  atualizarItem: (
    tipo: string,
    key: string,
    indice: number,
    itemKey: string,
    valor: unknown,
  ) => void;
  adicionarItem: (tipo: string, key: string, item: Record<string, unknown>) => void;
  /** Troca o conteúdo de vários blocos de uma vez, já persistido pelo servidor. */
  substituirBlocos: (blocos: BlocoDTO[]) => void;
  removerItem: (tipo: string, key: string, indice: number) => void;

  adicionarRodada: (rodada: RodadaDTO) => void;
  removerRodada: (rodadaId: string) => void;
  limparRodadas: () => void;
  definirVeredito: (ideiaId: string, veredito: Veredito) => void;
  definirComentario: (ideiaId: string, comentario: string) => void;
  definirPrompt: (ideiaId: string, prompt: PromptDTO) => void;
  definirJsonDoPrompt: (promptId: string, json: unknown) => void;
}

type Store = StoreApi<EstadoEditor>;

function itensDe(valor: unknown): Record<string, unknown>[] {
  return Array.isArray(valor) ? (valor as Record<string, unknown>[]) : [];
}

function criarStore(inicial: ProjetoDetalhe): Store {
  return createStore<EstadoEditor>((set) => {
    /** Altera o conteúdo de um bloco e o marca como pendente. */
    const editarBloco = (tipo: string, transformar: (data: BlocoData) => BlocoData) =>
      set((estado) => ({
        projeto: {
          ...estado.projeto,
          blocos: estado.projeto.blocos.map((bloco) =>
            bloco.tipo === tipo ? { ...bloco, data: transformar(bloco.data) } : bloco,
          ),
        },
        dirtyBlocos: { ...estado.dirtyBlocos, [tipo]: true },
        status: "pendente",
      }));

    /** Altera uma ideia dentro da rodada a que ela pertence. */
    const editarIdeia = (
      ideiaId: string,
      transformar: (ideia: IdeiaDTO) => IdeiaDTO,
      sujar: boolean,
    ) =>
      set((estado) => ({
        projeto: {
          ...estado.projeto,
          rodadas: estado.projeto.rodadas.map((rodada) => ({
            ...rodada,
            ideias: rodada.ideias.map((ideia) =>
              ideia.id === ideiaId ? transformar(ideia) : ideia,
            ),
          })),
        },
        dirtyIdeias: sujar ? { ...estado.dirtyIdeias, [ideiaId]: true } : estado.dirtyIdeias,
        status: sujar ? "pendente" : estado.status,
      }));

    return {
      projeto: inicial,
      dirtyBlocos: {},
      dirtyIdeias: {},
      projetoDirty: false,
      status: "parado",
      gerando: false,
      erro: null,

      setStatus: (status) => set({ status }),
      setGerando: (gerando) => set({ gerando }),
      setErro: (erro) => set({ erro }),

      marcarSalvo: (blocos, ideias, projetoSalvo) =>
        set((estado) => {
          const dirtyBlocos = { ...estado.dirtyBlocos };
          for (const tipo of blocos) delete dirtyBlocos[tipo];
          const dirtyIdeias = { ...estado.dirtyIdeias };
          for (const id of ideias) delete dirtyIdeias[id];
          const projetoDirty = projetoSalvo ? false : estado.projetoDirty;
          const aindaSujo =
            Object.keys(dirtyBlocos).length > 0 ||
            Object.keys(dirtyIdeias).length > 0 ||
            projetoDirty;
          return {
            dirtyBlocos,
            dirtyIdeias,
            projetoDirty,
            status: aindaSujo ? "pendente" : "salvo",
          };
        }),

      marcarFalha: () => set({ status: "erro" }),

      definirNome: (nome) =>
        set((estado) => ({
          projeto: { ...estado.projeto, nome },
          projetoDirty: true,
          status: "pendente",
        })),

      atualizarCampo: (tipo, key, valor) =>
        editarBloco(tipo, (data) => ({ ...data, [key]: valor })),

      atualizarItem: (tipo, key, indice, itemKey, valor) =>
        editarBloco(tipo, (data) => {
          const itens = itensDe(data[key]).slice();
          if (!itens[indice]) return data;
          itens[indice] = { ...itens[indice], [itemKey]: valor };
          return { ...data, [key]: itens };
        }),

      adicionarItem: (tipo, key, item) =>
        editarBloco(tipo, (data) => ({ ...data, [key]: [...itensDe(data[key]), { ...item }] })),

      removerItem: (tipo, key, indice) =>
        editarBloco(tipo, (data) => ({
          ...data,
          [key]: itensDe(data[key]).filter((_, i) => i !== indice),
        })),

      substituirBlocos: (novos) =>
        set((estado) => {
          const porTipo = new Map(novos.map((bloco) => [bloco.tipo, bloco.data]));
          const dirtyBlocos = { ...estado.dirtyBlocos };
          // O servidor já gravou: manter estes blocos sujos faria o autosave
          // reenviar em seguida e sobrescrever o que a IA acabou de escrever
          // com o que estava na tela um instante antes.
          for (const bloco of novos) delete dirtyBlocos[bloco.tipo];
          return {
            projeto: {
              ...estado.projeto,
              blocos: estado.projeto.blocos.map((bloco) =>
                porTipo.has(bloco.tipo)
                  ? { ...bloco, data: porTipo.get(bloco.tipo)! }
                  : bloco,
              ),
            },
            dirtyBlocos,
          };
        }),

      adicionarRodada: (rodada) =>
        set((estado) => ({
          // Rodada nova entra no topo: é o que se quer ver, e empurrar a lista
          // para baixo evita rolar até o fim a cada geração.
          projeto: { ...estado.projeto, rodadas: [rodada, ...estado.projeto.rodadas] },
        })),

      removerRodada: (rodadaId) =>
        set((estado) => ({
          projeto: {
            ...estado.projeto,
            rodadas: estado.projeto.rodadas.filter((rodada) => rodada.id !== rodadaId),
          },
        })),

      limparRodadas: () =>
        set((estado) => ({
          projeto: { ...estado.projeto, rodadas: [] },
          // As ideias sujas deixaram de existir: manter os ids pendentes faria
          // o autosave tentar salvar vereditos de linhas já apagadas.
          dirtyIdeias: {},
        })),

      definirVeredito: (ideiaId, veredito) =>
        editarIdeia(
          ideiaId,
          (ideia) => ({
            ...ideia,
            // Clicar de novo no mesmo veredito desfaz. Sem isso, um toque
            // errado em "descartei" só se corrigiria escolhendo "amei".
            veredito: ideia.veredito === veredito ? "neutro" : veredito,
          }),
          true,
        ),

      definirComentario: (ideiaId, comentario) =>
        editarIdeia(ideiaId, (ideia) => ({ ...ideia, comentario }), true),

      definirPrompt: (ideiaId, prompt) =>
        editarIdeia(ideiaId, (ideia) => ({ ...ideia, prompt }), false),

      definirJsonDoPrompt: (promptId, json) =>
        set((estado) => ({
          projeto: {
            ...estado.projeto,
            rodadas: estado.projeto.rodadas.map((rodada) => ({
              ...rodada,
              ideias: rodada.ideias.map((ideia) =>
                ideia.prompt?.id === promptId
                  ? { ...ideia, prompt: { ...ideia.prompt, json } }
                  : ideia,
              ),
            })),
          },
        })),
    };
  });
}

const ContextoEditor = createContext<Store | null>(null);

export function EditorProvider({
  projeto,
  children,
}: {
  projeto: ProjetoDetalhe;
  children: ReactNode;
}) {
  // Criado uma única vez por montagem: recriá-lo a cada render descartaria
  // edições ainda não salvas.
  const ref = useRef<Store>(null);
  ref.current ??= criarStore(projeto);

  return <ContextoEditor.Provider value={ref.current}>{children}</ContextoEditor.Provider>;
}

export function useEditor<T>(seletor: (estado: EstadoEditor) => T): T {
  const store = useContext(ContextoEditor);
  if (!store) throw new Error("useEditor precisa estar dentro de <EditorProvider>.");
  return useStore(store, seletor);
}

export function useEditorStore(): Store {
  const store = useContext(ContextoEditor);
  if (!store) throw new Error("useEditorStore precisa estar dentro de <EditorProvider>.");
  return store;
}
