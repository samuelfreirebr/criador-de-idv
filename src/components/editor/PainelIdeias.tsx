"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon } from "@/blocos/_shared/icons";
import { Modal } from "@/components/Modal";
import { Aviso, Button, Input, Spinner } from "@/components/ui";
import type { RodadaDTO } from "@/lib/types";
import { CardDeIdeia } from "./CardDeIdeia";
import { useEditor, useEditorStore } from "./store";

const QUANTIDADES = [3, 6, 10];

/**
 * As ideias, sempre visíveis ao lado do briefing.
 *
 * A barra de geração é fixa no topo: ela é usada muitas vezes seguidas, e
 * rolar até o topo a cada rodada seria o gesto mais repetido do app.
 */
export function PainelIdeias() {
  const store = useEditorStore();
  const rodadas = useEditor((estado) => estado.projeto.rodadas);
  const gerando = useEditor((estado) => estado.gerando);
  const erro = useEditor((estado) => estado.erro);
  const projetoId = useEditor((estado) => estado.projeto.id);
  // Olha o bloco do briefing especificamente, e não "algum bloco preenchido":
  // Entrega nasce com valores padrão, então a condição genérica era sempre
  // verdadeira e o aviso nunca dizia o que realmente faltava.
  const temBriefing = useEditor((estado) => {
    const briefing = estado.projeto.blocos.find((bloco) => bloco.tipo === "briefing");
    return typeof briefing?.data.texto === "string" && briefing.data.texto.trim().length > 0;
  });

  const [quantidade, setQuantidade] = useState(6);
  const [instrucao, setInstrucao] = useState("");
  /** Guarda o que está para ser apagado: uma rodada, ou tudo. */
  const [apagando, setApagando] = useState<{ tipo: "rodada" | "tudo"; id?: string } | null>(
    null,
  );
  const [removendo, setRemovendo] = useState(false);

  async function confirmarRemocao() {
    if (!apagando) return;
    setRemovendo(true);
    store.getState().setErro(null);
    try {
      const url =
        apagando.tipo === "tudo"
          ? `/api/projetos/${projetoId}/rodadas`
          : `/api/rodadas/${apagando.id}`;
      const resposta = await fetch(url, { method: "DELETE" });
      if (!resposta.ok) {
        const json = (await resposta.json().catch(() => ({}))) as { error?: string };
        store.getState().setErro(json.error ?? "Não foi possível apagar.");
        return;
      }
      if (apagando.tipo === "tudo") store.getState().limparRodadas();
      else store.getState().removerRodada(apagando.id!);
      setApagando(null);
    } catch {
      store.getState().setErro("Falha de conexão ao apagar.");
    } finally {
      setRemovendo(false);
    }
  }

  const amadas = rodadas
    .flatMap((rodada) => rodada.ideias)
    .filter((ideia) => ideia.veredito === "amei").length;

  async function gerar() {
    store.getState().setGerando(true);
    store.getState().setErro(null);
    try {
      const resposta = await fetch(`/api/projetos/${projetoId}/rodadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade, instrucao }),
      });
      const json = (await resposta.json()) as { rodada?: RodadaDTO; error?: string };
      if (!resposta.ok || !json.rodada) {
        store.getState().setErro(json.error ?? "Não foi possível gerar as ideias.");
        return;
      }
      store.getState().adicionarRodada(json.rodada);
      setInstrucao("");
    } catch {
      store.getState().setErro("Falha de conexão. As ideias não foram geradas.");
    } finally {
      store.getState().setGerando(false);
    }
  }

  // `@container`: as colunas reagem à largura DESTE painel, não à da janela.
  // Como a divisória é arrastável, uma media query olharia para a coisa errada —
  // a janela pode ter 1600px enquanto este painel tem 400.
  return (
    <div className="rolagem-fina @container flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-ink-800 bg-ink-950/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-ink-700 p-1">
            {QUANTIDADES.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setQuantidade(valor)}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  quantidade === valor
                    ? "bg-ink-800 text-ink-50"
                    : "text-ink-400 hover:text-ink-100",
                )}
              >
                {valor}
              </button>
            ))}
          </div>

          <div className="min-w-[10rem] flex-1">
            <Input
              value={instrucao}
              onChange={(evento) => setInstrucao(evento.target.value)}
              placeholder={
                rodadas.length === 0
                  ? "Ajuste opcional para esta rodada"
                  : "Mais geométrico, esquece a ideia do triângulo…"
              }
              disabled={gerando}
            />
          </div>

          <Button variant="primaria" className="shrink-0" onClick={gerar} disabled={gerando}>
            {gerando ? <Spinner /> : <Icon name="faisca" size={16} />}
            {gerando ? "Gerando…" : rodadas.length === 0 ? "Gerar ideias" : "Gerar mais"}
          </Button>
        </div>

        {rodadas.length > 0 ? (
          <div className="mt-2.5 flex items-start gap-3">
            <p className="flex min-w-0 flex-1 items-start gap-1.5 text-xs leading-relaxed text-ink-500">
              <Icon name="coracao" size={12} className="mt-0.5 shrink-0" />
              {amadas > 0
                ? `${amadas} ${amadas > 1 ? "ideias marcadas" : "ideia marcada"} — a próxima rodada vai se aproximar ${amadas > 1 ? "delas" : "dela"} e evitar as descartadas.`
                : "Marque as que gostou: é o que direciona a próxima rodada."}
            </p>
            <button
              type="button"
              onClick={() => setApagando({ tipo: "tudo" })}
              disabled={gerando}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-500 transition hover:text-brand-hot disabled:opacity-40"
            >
              <Icon name="lixo" size={12} />
              Zerar tudo
            </button>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 px-5 py-5">
        {erro ? (
          <div className="mb-4">
            <Aviso>{erro}</Aviso>
          </div>
        ) : null}

        {gerando && rodadas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-700 px-6 py-16 text-center">
            <Spinner className="text-brand" />
            <p className="mt-3 text-sm text-ink-400">
              Lendo o briefing e desenhando as primeiras direções…
            </p>
          </div>
        ) : null}

        {rodadas.length === 0 && !gerando ? (
          <div className="rounded-xl border border-dashed border-ink-700 px-6 py-16 text-center">
            <Icon name="faisca" size={24} className="mx-auto mb-3 text-ink-600" />
            <h2 className="font-display text-base font-semibold text-ink-50">
              As ideias aparecem aqui
            </h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-400">
              {temBriefing
                ? "Escolha quantas quer e clique em Gerar ideias."
                : "Cole o briefing ao lado — basta ele para começar."}
            </p>
          </div>
        ) : null}

        {rodadas.map((rodada) => (
          <section key={rodada.id} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="shrink-0 font-display text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                Rodada {rodada.numero}
              </h2>
              {rodada.instrucao ? (
                <span className="min-w-0 flex-1 truncate text-xs text-ink-500">
                  “{rodada.instrucao}”
                </span>
              ) : (
                <span className="flex-1" />
              )}
              <button
                type="button"
                onClick={() => setApagando({ tipo: "rodada", id: rodada.id })}
                aria-label={`Apagar rodada ${rodada.numero}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-600 transition hover:bg-ink-900 hover:text-brand-hot"
              >
                <Icon name="lixo" size={13} />
              </button>
            </div>

            {/* 46rem = duas colunas de ~355px, que é onde o texto do card ainda se lê
                 sem varrer a linha inteira. Acima disso ficava uma coluna só numa
                 tela de 1440px, que era o problema. */}
            <div className="grid min-w-0 gap-3 @min-[46rem]:grid-cols-2">
              {rodada.ideias.map((ideia) => (
                <CardDeIdeia key={ideia.id} ideia={ideia} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal
        titulo={apagando?.tipo === "tudo" ? "Zerar todas as ideias" : "Apagar esta rodada"}
        aberto={apagando !== null}
        aoFechar={() => setApagando(null)}
      >
        <p className="mb-4 text-sm leading-relaxed text-ink-300">
          {apagando?.tipo === "tudo"
            ? "Apaga todas as rodadas, ideias e prompts deste projeto. O briefing à esquerda continua intacto."
            : "Apaga as ideias desta rodada e os prompts que saíram delas. As outras rodadas continuam."}
        </p>
        {/*
          O aviso não é formalidade: junto com os prompts vão as fotografias de
          briefing que eles guardavam, e é isso que torna a ação irreversível de
          um jeito que ninguém adivinha só de ler "apagar".
        */}
        <p className="mb-6 text-sm leading-relaxed text-ink-400">
          Junto vão as configurações que cada prompt guardava — depois disso não
          dá mais para usar “Recriar briefing” neles.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="fantasma" onClick={() => setApagando(null)}>
            Cancelar
          </Button>
          <Button variant="perigo-solido" onClick={confirmarRemocao} disabled={removendo}>
            {removendo ? <Spinner /> : <Icon name="lixo" size={15} />}
            {apagando?.tipo === "tudo" ? "Zerar tudo" : "Apagar rodada"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
