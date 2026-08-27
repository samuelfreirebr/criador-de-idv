"use client";

import clsx from "clsx";
import { useRef, useState, type DragEvent } from "react";
import { Icon } from "@/blocos/_shared/icons";
import type { FieldDef } from "@/blocos/types";
import { Aviso, Textarea } from "@/components/ui";

/** Extensões que abrimos como texto puro, sem depender de nenhum conversor. */
const EXTENSOES = [".txt", ".md", ".markdown", ".rtf", ".csv", ".json", ".text"];

function ehTexto(arquivo: File): boolean {
  if (arquivo.type.startsWith("text/")) return true;
  if (arquivo.type === "application/json") return true;
  const nome = arquivo.name.toLowerCase();
  return EXTENSOES.some((ext) => nome.endsWith(ext));
}

/**
 * O campo do briefing: uma caixa grande que também aceita arquivo.
 *
 * O arquivo é lido NO NAVEGADOR e o conteúdo vira texto no próprio campo, em
 * vez de virar um anexo. Assim o que a IA vai receber é exatamente o que está
 * na tela — dá para conferir e corrigir antes de gerar, o que não aconteceria
 * se o arquivo fosse embora fechado.
 */
export function CampoDocumento({
  field,
  valor,
  aoMudar,
}: {
  field: FieldDef;
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [sobrevoando, setSobrevoando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregado, setCarregado] = useState<string | null>(null);

  async function absorver(arquivos: FileList | File[] | null) {
    if (!arquivos || arquivos.length === 0) return;
    setErro(null);

    const partes: string[] = [];
    for (const arquivo of Array.from(arquivos)) {
      if (!ehTexto(arquivo)) {
        setErro(
          `“${arquivo.name}” não é um arquivo de texto. Abra o documento, copie o conteúdo e cole aqui.`,
        );
        continue;
      }
      partes.push(await arquivo.text());
      setCarregado(arquivo.name);
    }

    if (partes.length === 0) return;
    // Acrescenta em vez de substituir: carregar um segundo documento não pode
    // apagar o que já estava escrito.
    const novo = [valor.trim(), ...partes].filter(Boolean).join("\n\n---\n\n");
    aoMudar(novo);
    if (entrada.current) entrada.current.value = "";
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setSobrevoando(false);
    void absorver(evento.dataTransfer.files);
  }

  const palavras = valor.trim() ? valor.trim().split(/\s+/).length : 0;

  return (
    <div
      onDragOver={(evento) => {
        evento.preventDefault();
        setSobrevoando(true);
      }}
      onDragLeave={() => setSobrevoando(false)}
      onDrop={aoSoltar}
      className={clsx(
        "rounded-xl border-2 border-dashed p-1 transition",
        sobrevoando ? "border-brand bg-brand/5" : "border-transparent",
      )}
    >
      <Textarea
        rows={field.rows ?? 12}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={field.placeholder}
        className="min-h-[16rem] leading-relaxed"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          ref={entrada}
          type="file"
          accept=".txt,.md,.markdown,.rtf,.csv,.json,text/*"
          className="hidden"
          onChange={(evento) => void absorver(evento.target.files)}
        />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition hover:border-ink-500 hover:text-ink-50"
        >
          <Icon name="upload" size={14} />
          Carregar arquivo
        </button>

        <span className="text-xs text-ink-500">
          {carregado ? `${carregado} carregado · ` : ""}
          {palavras > 0 ? `${palavras} palavras` : "ou arraste o arquivo para cá"}
        </span>

        {valor.trim() ? (
          <button
            type="button"
            onClick={() => {
              aoMudar("");
              setCarregado(null);
            }}
            className="ml-auto text-xs text-ink-500 transition hover:text-brand-hot"
          >
            limpar
          </button>
        ) : null}
      </div>

      {erro ? (
        <div className="mt-2">
          <Aviso>{erro}</Aviso>
        </div>
      ) : null}
    </div>
  );
}
