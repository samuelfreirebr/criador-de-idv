"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/blocos/_shared/icons";
import { Modal } from "@/components/Modal";
import { Button, Spinner } from "@/components/ui";
import { AutoSaver } from "./AutoSaver";
import { PainelBriefing } from "./PainelBriefing";
import { PainelIdeias } from "./PainelIdeias";
import { useEditor, useEditorStore } from "./store";

const CHAVE_LARGURA = "idpro:largura-briefing";
/** Limites do arrasto: abaixo de 25% o briefing fica ilegível, acima de 70% as ideias somem. */
const MINIMO = 25;
const MAXIMO = 70;

const RECADO: Record<string, string> = {
  parado: "",
  pendente: "alterações pendentes",
  salvando: "salvando…",
  salvo: "salvo",
  erro: "falha ao salvar",
};

/**
 * Duas colunas, sem abas: briefing à esquerda, ideias à direita.
 *
 * A versão anterior tinha três abas — briefing, ideias, prompts. Trocar de aba
 * para conferir uma coisa e voltar é atrito puro num trabalho que é justamente
 * comparar o que se pediu com o que voltou. No celular as colunas viram uma
 * pilha, porque duas colunas em 375px não são duas colunas.
 */
export function Editor() {
  const store = useEditorStore();
  const nome = useEditor((estado) => estado.projeto.nome);
  const status = useEditor((estado) => estado.status);
  const projetoId = useEditor((estado) => estado.projeto.id);

  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(46);
  const [arrastando, setArrastando] = useState(false);

  // Lido depois da montagem: o servidor não conhece o localStorage, e ler
  // durante a renderização faria o HTML do servidor divergir do cliente.
  useEffect(() => {
    const guardado = Number(window.localStorage.getItem(CHAVE_LARGURA));
    if (Number.isFinite(guardado) && guardado >= MINIMO && guardado <= MAXIMO) {
      setLargura(guardado);
    }
  }, []);

  const mover = useCallback((clientX: number) => {
    const area = areaRef.current;
    if (!area) return;
    const caixa = area.getBoundingClientRect();
    const percentual = ((clientX - caixa.left) / caixa.width) * 100;
    setLargura(Math.min(MAXIMO, Math.max(MINIMO, percentual)));
  }, []);

  useEffect(() => {
    if (!arrastando) return;

    const aoMover = (evento: PointerEvent) => mover(evento.clientX);
    const aoSoltar = () => {
      setArrastando(false);
      // Gravado só no fim do arrasto: gravar a cada pixel encheria o
      // localStorage de escritas que ninguém lê.
      setLargura((atual) => {
        window.localStorage.setItem(CHAVE_LARGURA, String(Math.round(atual)));
        return atual;
      });
    };

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    // Sem isto o navegador seleciona o texto das duas colunas durante o arrasto.
    const anterior = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      document.body.style.userSelect = anterior;
      document.body.style.cursor = "";
    };
  }, [arrastando, mover]);

  async function excluir() {
    setExcluindo(true);
    await fetch(`/api/projetos/${projetoId}`, { method: "DELETE" });
    router.replace("/projetos");
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-screen">
      <AutoSaver />

      <header className="flex shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-950 px-4 py-3 lg:px-6">
        <Icon name="etiqueta" size={18} className="shrink-0 text-brand" />
        {/*
          O nome é um <input> sem moldura: renomear é frequente no começo de um
          projeto, e um clique a menos em algo frequente vale mais que a moldura
          que anunciaria o campo.
        */}
        <input
          value={nome}
          onChange={(evento) => store.getState().definirNome(evento.target.value)}
          aria-label="Nome da marca"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 font-display text-xl font-bold tracking-tight text-ink-50 outline-none transition hover:bg-ink-900 focus:bg-ink-900"
        />

        <span
          className={clsx(
            "hidden shrink-0 text-xs sm:block",
            status === "erro" ? "text-brand-hot" : "text-ink-500",
          )}
        >
          {RECADO[status]}
        </span>

        <button
          type="button"
          onClick={() => setConfirmando(true)}
          aria-label="Excluir projeto"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-900 hover:text-brand-hot"
        >
          <Icon name="lixo" size={16} />
        </button>
      </header>

      {/*
        `min-w-0` nos dois painéis não é enfeite: um item de flex nasce com
        `min-width: auto`, e uma palavra longa dentro de um card empurrava a
        coluna para além da tela, levando junto o resto da interface.

        A largura vai por variável CSS e só é aplicada no desktop — no celular o
        contêiner é uma coluna, e `flex-basis` ali controlaria a ALTURA.
      */}
      <div
        ref={areaRef}
        style={{ "--largura-briefing": `${largura}%` } as React.CSSProperties}
        className="flex flex-1 flex-col lg:min-h-0 lg:flex-row"
      >
        <div className="flex min-w-0 flex-col border-b border-ink-800 lg:min-h-0 lg:shrink-0 lg:grow-0 lg:basis-[var(--largura-briefing)] lg:border-b-0">
          <PainelBriefing />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Arraste para redimensionar as colunas"
          onPointerDown={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDoubleClick={() => {
            setLargura(46);
            window.localStorage.setItem(CHAVE_LARGURA, "46");
          }}
          className={clsx(
            "hidden w-1.5 shrink-0 cursor-col-resize border-x border-ink-800 transition lg:block",
            arrastando ? "bg-brand" : "bg-ink-900 hover:bg-ink-700",
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          <PainelIdeias />
        </div>
      </div>

      <Modal titulo="Excluir projeto" aberto={confirmando} aoFechar={() => setConfirmando(false)}>
        <p className="mb-6 text-sm leading-relaxed text-ink-300">
          Isto apaga o briefing, todas as rodadas de ideias e os prompts de{" "}
          <strong className="text-ink-50">{nome}</strong>. Não dá para desfazer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="fantasma" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
          <Button variant="perigo-solido" onClick={excluir} disabled={excluindo}>
            {excluindo ? <Spinner /> : null}
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
