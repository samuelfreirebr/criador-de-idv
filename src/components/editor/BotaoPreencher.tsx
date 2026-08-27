"use client";

import { useState } from "react";
import { Icon } from "@/blocos/_shared/icons";
import { Aviso, Spinner } from "@/components/ui";
import type { BlocoDTO } from "@/lib/types";
import { useEditor, useEditorStore } from "./store";

/**
 * "Deixe a IA decidir": lê o briefing e preenche todos os campos abaixo.
 *
 * Não é atalho para pular o preenchimento — é a leitura estratégica que o
 * modelo faz do briefing, exposta em controles que dá para discordar e mexer.
 * Ver a barra em "muito luxuoso" e discordar é mais rápido do que escrever do
 * zero o que a marca deveria ser.
 *
 * O segundo botão pede outra leitura, deliberadamente diferente. Existe porque
 * a primeira resposta de um modelo é a mais provável, não a única boa — e ver
 * duas direções defensáveis lado a lado é o que revela qual delas você
 * realmente quer.
 */
export function BotaoPreencher() {
  const store = useEditorStore();
  const projetoId = useEditor((estado) => estado.projeto.id);

  const temBriefing = useEditor((estado) => {
    const briefing = estado.projeto.blocos.find((bloco) => bloco.tipo === "briefing");
    const texto = briefing?.data.texto;
    return typeof texto === "string" && texto.trim().length >= 40;
  });

  // Já existe uma leitura para variar? Uma barra mexida basta como prova.
  const jaPreenchido = useEditor((estado) => {
    const temperamento = estado.projeto.blocos.find(
      (bloco) => bloco.tipo === "temperamento",
    );
    if (!temperamento) return false;
    return Object.values(temperamento.data).some((valor) => typeof valor === "number");
  });

  const [ocupado, setOcupado] = useState<"leitura" | "variacao" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<"leitura" | "variacao" | null>(null);

  async function preencher(variacao: boolean) {
    setOcupado(variacao ? "variacao" : "leitura");
    setErro(null);
    setPronto(null);
    try {
      const resposta = await fetch(`/api/projetos/${projetoId}/preencher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variacao }),
      });
      const json = (await resposta.json()) as { blocos?: BlocoDTO[]; error?: string };
      if (!resposta.ok || !json.blocos) {
        setErro(json.error ?? "Não foi possível preencher.");
        return;
      }
      store.getState().substituirBlocos(json.blocos);
      setPronto(variacao ? "variacao" : "leitura");
      setTimeout(() => setPronto(null), 5000);
    } catch {
      setErro("Falha de conexão ao preencher.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/60 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => preencher(false)}
          disabled={ocupado !== null || !temBriefing}
          className="flex min-w-[12rem] flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-ink-50 transition hover:bg-brand-hot disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ocupado === "leitura" ? <Spinner /> : <Icon name="faisca" size={16} />}
          {ocupado === "leitura" ? "Lendo o briefing…" : "Deixe a IA decidir o resto"}
        </button>

        <button
          type="button"
          onClick={() => preencher(true)}
          disabled={ocupado !== null || !temBriefing || !jaPreenchido}
          title={
            jaPreenchido
              ? "Outra direção estratégica para o mesmo briefing"
              : "Gere a primeira leitura antes de pedir uma variação"
          }
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-ink-700 px-3 py-2.5 text-sm text-ink-200 transition hover:border-ink-500 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ocupado === "variacao" ? <Spinner className="h-4 w-4" /> : <Icon name="atualizar" size={15} />}
          {ocupado === "variacao" ? "Variando…" : "Outra variação"}
        </button>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-ink-500">
        {temBriefing
          ? "Lê o briefing acima e preenche temperamento, tipografia, cores, restrições e entrega. Tudo continua editável — é a leitura da IA, não a palavra final."
          : "Escreva o briefing acima primeiro. Sem ele a IA preencheria no chute."}
      </p>

      {pronto ? (
        <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-brand-hot">
          <Icon name="check" size={13} className="mt-0.5 shrink-0" />
          {pronto === "variacao"
            ? "Nova direção aplicada. As proibições do briefing foram mantidas — só o estilo mudou."
            : "Campos preenchidos. Role para baixo e ajuste o que discordar."}
        </p>
      ) : null}

      {erro ? (
        <div className="mt-2.5">
          <Aviso>{erro}</Aviso>
        </div>
      ) : null}
    </div>
  );
}
