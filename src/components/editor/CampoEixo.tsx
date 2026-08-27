"use client";

import { rotuloDoNivel, type ValorEixo } from "@/blocos/_shared/format";
import type { FieldDef } from "@/blocos/types";

/**
 * Barra de temperamento.
 *
 * O estado inicial não é "meio": é "não definido", e o app diz isso com todas
 * as letras ("a IA decide"). A diferença importa — um eixo no centro pede
 * equilíbrio explícito ao modelo, um eixo não definido o autoriza a variar
 * entre as ideias. Sem o botão de limpar, não haveria como voltar ao segundo
 * estado depois de tocar na barra uma vez.
 */
export function CampoEixo({
  field,
  valor,
  aoMudar,
}: {
  field: FieldDef;
  valor: ValorEixo;
  aoMudar: (valor: ValorEixo) => void;
}) {
  const definido = typeof valor === "number";
  const esquerda = field.left ?? "";
  const direita = field.right ?? "";

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300">
          {field.label}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={definido ? "text-xs text-brand" : "text-xs text-ink-500"}
          >
            {rotuloDoNivel(esquerda, direita, valor)}
          </span>
          {definido ? (
            <button
              type="button"
              onClick={() => aoMudar(null)}
              className="text-xs text-ink-500 underline decoration-ink-700 underline-offset-2 transition hover:text-ink-200"
            >
              limpar
            </button>
          ) : null}
        </span>
      </div>

      <input
        type="range"
        min={-3}
        max={3}
        step={1}
        value={definido ? valor : 0}
        data-definido={definido ? "sim" : "nao"}
        onChange={(evento) => aoMudar(Number(evento.target.value))}
        aria-label={`${field.label}: de ${esquerda} a ${direita}`}
        className="eixo"
      />

      <div className="mt-2 flex justify-between text-xs text-ink-500">
        <span>{esquerda}</span>
        <span>{direita}</span>
      </div>
    </div>
  );
}
