"use client";

import clsx from "clsx";
import { useState, type KeyboardEvent } from "react";
import { Icon } from "@/blocos/_shared/icons";
import type { FieldDef } from "@/blocos/types";
import { Input } from "@/components/ui";

/**
 * Chips de múltipla escolha com entrada livre.
 *
 * As sugestões existem para que o preenchimento seja um clique, não uma
 * digitação — foi o pedido explícito do produto. Mas a lista nunca é fechada:
 * o vocabulário de uma marca específica sempre tem uma palavra que a lista não
 * previu, e obrigar a escolher entre as previstas empobreceria o briefing.
 */
export function CampoTags({
  field,
  valor,
  aoMudar,
}: {
  field: FieldDef;
  valor: string[];
  aoMudar: (valor: string[]) => void;
}) {
  const [rascunho, setRascunho] = useState("");
  const selecionadas = new Set(valor.map((item) => item.toLowerCase()));

  function alternar(tag: string) {
    const limpa = tag.trim();
    if (!limpa) return;
    aoMudar(
      selecionadas.has(limpa.toLowerCase())
        ? valor.filter((item) => item.toLowerCase() !== limpa.toLowerCase())
        : [...valor, limpa],
    );
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    // Vírgula também confirma: quem digita uma lista escreve "a, b, c" por
    // reflexo, e exigir Enter entre cada item quebraria o ritmo.
    if (evento.key !== "Enter" && evento.key !== ",") return;
    evento.preventDefault();
    alternar(rascunho);
    setRascunho("");
  }

  const sugestoes = (field.suggestions ?? []).filter(
    (sugestao) => !selecionadas.has(sugestao.toLowerCase()),
  );

  return (
    <div className="space-y-2.5">
      {valor.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {valor.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => alternar(tag)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 py-1 pl-3 pr-2 text-xs text-brand-hot transition hover:border-brand"
            >
              {tag}
              <Icon name="fechar" size={11} className="opacity-50 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={rascunho}
        onChange={(evento) => setRascunho(evento.target.value)}
        onKeyDown={aoTeclar}
        onBlur={() => {
          if (rascunho.trim()) {
            alternar(rascunho);
            setRascunho("");
          }
        }}
        placeholder="Escreva e pressione Enter"
      />

      {sugestoes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sugestoes.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              onClick={() => alternar(sugestao)}
              className={clsx(
                "rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-400 transition",
                "hover:border-ink-500 hover:text-ink-100",
              )}
            >
              {sugestao}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
