"use client";

import { useRef, useState } from "react";
import { Icon } from "@/blocos/_shared/icons";
import type { RefVisual } from "@/blocos/_shared/format";
import type { FieldDef } from "@/blocos/types";
import { Aviso, Input, Spinner } from "@/components/ui";

/**
 * Referências visuais: a imagem e a linha que diz o que olhar nela.
 *
 * A nota fica ao lado da miniatura, e não numa tela separada, porque só se
 * sabe o que dizer olhando. Separá-las produziria notas genéricas — "gostei do
 * estilo" — que não ajudam o modelo a distinguir o atributo desejado do resto
 * do desenho.
 */
export function CampoImagens({
  field,
  valor,
  aoMudarItem,
  aoAdicionar,
  aoRemover,
}: {
  field: FieldDef;
  valor: RefVisual[];
  aoMudarItem: (indice: number, chave: string, novo: string) => void;
  aoAdicionar: (assetId: string) => void;
  aoRemover: (indice: number) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const limite = field.maxItems ?? 12;

  /** Mede a imagem no navegador — ela já foi carregada para exibir a miniatura. */
  function medir(arquivo: File): Promise<{ largura: number; altura: number }> {
    return new Promise((resolver) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolver({ largura: img.naturalWidth, altura: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolver({ largura: 0, altura: 0 });
      };
      img.src = url;
    });
  }

  async function enviarArquivos(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setErro(null);

    const espaco = limite - valor.length;
    const selecionados = Array.from(arquivos).slice(0, Math.max(0, espaco));
    if (selecionados.length === 0) {
      setErro(`Limite de ${limite} referências atingido.`);
      return;
    }

    setEnviando(selecionados.length);
    for (const arquivo of selecionados) {
      try {
        const { largura, altura } = await medir(arquivo);
        const form = new FormData();
        form.append("arquivo", arquivo);
        form.append("largura", String(largura));
        form.append("altura", String(altura));

        const resposta = await fetch("/api/assets", { method: "POST", body: form });
        const json = (await resposta.json()) as { id?: string; error?: string };
        if (!resposta.ok || !json.id) {
          setErro(json.error ?? "Não foi possível enviar a imagem.");
          continue;
        }
        aoAdicionar(json.id);
      } catch {
        setErro("Falha ao enviar a imagem.");
      } finally {
        setEnviando((atual) => atual - 1);
      }
    }

    if (entrada.current) entrada.current.value = "";
  }

  return (
    <div className="space-y-3">
      {valor.map((ref, indice) => (
        <div
          key={`${ref.assetId}-${indice}`}
          className="flex gap-3 rounded-lg border border-ink-800 bg-ink-950/60 p-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/assets/${ref.assetId}`}
            alt={`Referência ${indice + 1}`}
            className="h-20 w-20 shrink-0 rounded-md border border-ink-800 object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <Input
              value={ref.nota}
              onChange={(evento) => aoMudarItem(indice, "nota", evento.target.value)}
              placeholder="O que me atrai nela"
            />
            <span className="text-xs text-ink-500">Referência {indice + 1}</span>
          </div>
          <button
            type="button"
            onClick={() => aoRemover(indice)}
            aria-label="Remover referência"
            className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-md text-ink-500 transition hover:bg-ink-850 hover:text-brand-hot"
          >
            <Icon name="lixo" size={15} />
          </button>
        </div>
      ))}

      <input
        ref={entrada}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={(evento) => void enviarArquivos(evento.target.files)}
      />

      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={valor.length >= limite || enviando > 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-700 px-4 py-6 text-sm text-ink-400 transition hover:border-ink-500 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando > 0 ? <Spinner /> : <Icon name="imagem" size={16} />}
        {enviando > 0
          ? `Enviando ${enviando} imagem(ns)…`
          : valor.length === 0
            ? "Escolher imagens"
            : `Adicionar mais (${valor.length}/${limite})`}
      </button>

      {erro ? <Aviso>{erro}</Aviso> : null}
    </div>
  );
}
