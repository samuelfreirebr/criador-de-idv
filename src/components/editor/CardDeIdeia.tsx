"use client";

import clsx from "clsx";
import { useState } from "react";
import { Icon, type IconName } from "@/blocos/_shared/icons";
import { Modal } from "@/components/Modal";
import { Aviso, Button, Input, Spinner, Textarea } from "@/components/ui";
import { CAMPOS_IDEIA, type ChaveIdeia } from "@/lib/ideia";
import type { BlocoDTO, IdeiaDTO, PromptDTO } from "@/lib/types";
import { useEditor, useEditorStore } from "./store";

/** Um ícone por campo do card: a leitura é de varredura, não linha a linha. */
const ICONES: Record<ChaveIdeia, IconName> = {
  nome: "conceito",
  ideiaCentral: "faisca",
  simbolo: "simbolo",
  gesto: "curva",
  tipografia: "tipografia",
  cores: "paleta",
  porQue: "alvo",
};

/**
 * Um card de ideia — fechado por padrão.
 *
 * Aberto, cada card ocupava mais de uma tela: gerar seis significava rolar seis
 * telas para saber o que havia saído, e comparar ficava impossível. Fechado ele
 * mostra só o nome e a ideia central, que é exatamente o que se usa para
 * decidir se vale abrir. Três ou quatro cabem na tela de uma vez.
 *
 * `min-w-0` aparece em toda a cadeia de propósito: um item de flex tem
 * `min-width: auto`, e um texto longo sem espaços empurra a coluna para além da
 * tela em vez de quebrar linha — foi o que deformou a interface inteira.
 */
export function CardDeIdeia({ ideia }: { ideia: IdeiaDTO }) {
  const store = useEditorStore();
  const gerandoIdeias = useEditor((estado) => estado.gerando);

  const [aberto, setAberto] = useState(false);
  const [comentando, setComentando] = useState(false);
  const [gerandoPrompt, setGerandoPrompt] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Copiar sem abrir nada.
   *
   * Copiar o prompt é a última coisa que se faz com um card e a mais repetida —
   * exigir dois cliques (abrir a seção, depois copiar) para a ação final era o
   * atrito mais caro da tela.
   */
  async function copiarPrompt() {
    if (!ideia.prompt) return;
    try {
      await navigator.clipboard.writeText(ideia.prompt.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro("O navegador bloqueou a cópia. Abra o prompt e copie à mão.");
    }
  }

  async function gerarPrompt(ajuste = "") {
    setGerandoPrompt(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/ideias/${ideia.id}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ajuste }),
      });
      const json = (await resposta.json()) as Partial<PromptDTO> & { error?: string };
      if (!resposta.ok || !json.id) {
        setErro(json.error ?? "Não foi possível gerar o prompt.");
        return;
      }
      store.getState().definirPrompt(ideia.id, json as PromptDTO);
      setAberto(true);
    } catch {
      setErro("Falha de conexão ao gerar o prompt.");
    } finally {
      setGerandoPrompt(false);
    }
  }

  return (
    <article
      className={clsx(
        "min-w-0 overflow-hidden rounded-xl border bg-ink-900 transition",
        ideia.veredito === "amei" && "border-brand/60",
        ideia.veredito === "descartei" && "border-ink-800 opacity-45",
        ideia.veredito === "neutro" && "border-ink-700",
      )}
    >
      {/* Cabeçalho: o card inteiro fechado. Clicar em qualquer lugar abre. */}
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full min-w-0 items-start gap-2.5 p-4 text-left transition hover:bg-ink-850/50"
      >
        <Icon name="conceito" size={16} className="mt-1 shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 break-words font-display text-base font-bold leading-tight tracking-tight text-ink-50">
              {ideia.data.nome}
            </span>
            {ideia.prompt ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-50">
                <Icon name="check" size={10} />
                prompt
              </span>
            ) : null}
          </span>
          <span
            className={clsx(
              "mt-1 block break-words text-sm leading-relaxed text-ink-300",
              !aberto && "line-clamp-2",
            )}
          >
            {ideia.data.ideiaCentral}
          </span>
        </span>
        <Icon
          name="chevron"
          size={15}
          className={clsx(
            "mt-1 shrink-0 text-ink-500 transition-transform",
            aberto ? "rotate-90" : "",
          )}
        />
      </button>

      {aberto ? (
        <div className="min-w-0 space-y-3.5 border-t border-ink-800 px-4 py-4">
          {CAMPOS_IDEIA.filter(
            (campo) => campo.key !== "nome" && campo.key !== "ideiaCentral",
          ).map((campo) => (
            <div key={campo.key} className="flex min-w-0 gap-2.5">
              <Icon
                name={ICONES[campo.key]}
                size={14}
                className="mt-0.5 shrink-0 text-ink-500"
              />
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                  {campo.label}
                </span>
                <p className="mt-0.5 break-words text-sm leading-relaxed text-ink-100">
                  {ideia.data[campo.key]}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="min-w-0 space-y-3 border-t border-ink-800 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => store.getState().definirVeredito(ideia.id, "amei")}
            aria-pressed={ideia.veredito === "amei"}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              ideia.veredito === "amei"
                ? "border-brand bg-brand/15 text-brand-hot"
                : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-50",
            )}
          >
            <Icon name="coracao" size={13} />
            Amei
          </button>

          <button
            type="button"
            onClick={() => store.getState().definirVeredito(ideia.id, "descartei")}
            aria-pressed={ideia.veredito === "descartei"}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              ideia.veredito === "descartei"
                ? "border-ink-500 bg-ink-850 text-ink-100"
                : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-50",
            )}
          >
            <Icon name="descartar" size={13} />
            Descartei
          </button>

          <button
            type="button"
            onClick={() => setComentando((atual) => !atual)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-500 hover:text-ink-50"
          >
            <Icon name="nota" size={13} />
            Nota
          </button>

          {ideia.prompt ? (
            <button
              type="button"
              onClick={copiarPrompt}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-ink-50 transition hover:bg-brand-hot"
            >
              <Icon name={copiado ? "check" : "copiar"} size={13} />
              {copiado ? "Copiado" : "Copiar prompt"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => gerarPrompt()}
              disabled={gerandoPrompt || gerandoIdeias}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-ink-50 transition hover:bg-brand-hot disabled:opacity-40"
            >
              {gerandoPrompt ? <Spinner className="h-3 w-3" /> : <Icon name="documento" size={13} />}
              {gerandoPrompt ? "Escrevendo…" : "Gerar prompt"}
            </button>
          )}
        </div>

        {comentando ? (
          <Textarea
            rows={2}
            value={ideia.comentario}
            onChange={(evento) =>
              store.getState().definirComentario(ideia.id, evento.target.value)
            }
            placeholder="O corte diagonal é ótimo, mas o símbolo está complexo demais."
          />
        ) : null}

        {erro ? <Aviso>{erro}</Aviso> : null}
      </div>

      {ideia.prompt ? (
        <PromptEmbutido
          prompt={ideia.prompt}
          aoRefazer={gerarPrompt}
          refazendo={gerandoPrompt}
        />
      ) : null}
    </article>
  );
}

function PromptEmbutido({
  prompt,
  aoRefazer,
  refazendo,
}: {
  prompt: PromptDTO;
  aoRefazer: (ajuste: string) => void;
  refazendo: boolean;
}) {
  const store = useEditorStore();
  const [aberto, setAberto] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [vendoJson, setVendoJson] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ajuste, setAjuste] = useState(prompt.ajuste);
  const [confirmandoRestauro, setConfirmandoRestauro] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  /**
   * Devolve à coluna da esquerda o briefing que gerou este prompt.
   *
   * Passa por confirmação porque SOBRESCREVE o que estiver na tela agora, e
   * quem clica costuma estar a meio de outra configuração. É uma troca, não
   * uma soma.
   */
  async function restaurar() {
    setRestaurando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/prompts/${prompt.id}/restaurar`, { method: "POST" });
      const json = (await resposta.json()) as { blocos?: BlocoDTO[]; error?: string };
      if (!resposta.ok || !json.blocos) {
        setErro(json.error ?? "Não foi possível recriar o briefing.");
        return;
      }
      store.getState().substituirBlocos(json.blocos);
      setConfirmandoRestauro(false);
    } catch {
      setErro("Falha de conexão ao recriar o briefing.");
    } finally {
      setRestaurando(false);
    }
  }

  const jsonTexto = prompt.json ? JSON.stringify(prompt.json, null, 2) : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(vendoJson ? jsonTexto : prompt.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setErro("O navegador bloqueou a cópia. Selecione o texto e copie à mão.");
    }
  }

  async function converter() {
    // Traduzido uma vez, fica guardado: o botão passa a só alternar a exibição.
    if (prompt.json) {
      setVendoJson(true);
      return;
    }
    setConvertendo(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/prompts/${prompt.id}/ingles`, { method: "POST" });
      const json = (await resposta.json()) as { json?: unknown; error?: string };
      if (!resposta.ok || json.json === undefined) {
        setErro(json.error ?? "Não foi possível converter.");
        return;
      }
      store.getState().definirJsonDoPrompt(prompt.id, json.json);
      setVendoJson(true);
    } catch {
      setErro("Falha de conexão ao converter.");
    } finally {
      setConvertendo(false);
    }
  }

  return (
    <div className="min-w-0 border-t border-brand/30 bg-brand/[0.07]">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-brand-hot transition hover:bg-brand/10"
      >
        <Icon name="documento" size={13} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          Prompt completo
          {prompt.ajuste ? <span className="text-ink-400"> · ajustado</span> : null}
        </span>
        <Icon
          name="chevron"
          size={13}
          className={clsx("shrink-0 transition-transform", aberto ? "rotate-90" : "")}
        />
      </button>

      {aberto ? (
        <div className="min-w-0 px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 transition hover:border-ink-500 hover:text-ink-50"
            >
              <Icon name={copiado ? "check" : "copiar"} size={13} />
              {copiado ? "Copiado" : "Copiar"}
            </button>

            <button
              type="button"
              onClick={() => (vendoJson ? setVendoJson(false) : void converter())}
              disabled={convertendo}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:opacity-40",
                vendoJson
                  ? "border-brand bg-brand/15 text-brand-hot"
                  : "border-ink-700 text-ink-200 hover:border-ink-500 hover:text-ink-50",
              )}
            >
              {convertendo ? <Spinner className="h-3 w-3" /> : <Icon name="traduzir" size={13} />}
              {vendoJson ? "Português" : "JSON em inglês"}
            </button>

            <button
              type="button"
              onClick={() => setConfirmandoRestauro(true)}
              disabled={!prompt.temConfiguracao}
              title={
                prompt.temConfiguracao
                  ? "Devolve ao briefing as configurações que geraram este prompt"
                  : "Prompt criado antes desta funcionalidade — não guardou o briefing"
              }
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-200 transition hover:border-ink-500 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="historico" size={13} />
              Recriar briefing
            </button>
          </div>

          {erro ? (
            <div className="mb-3">
              <Aviso>{erro}</Aviso>
            </div>
          ) : null}

          {vendoJson ? (
            <pre className="rolagem-fina max-h-[24rem] overflow-auto rounded-lg border border-ink-800 bg-ink-1000 p-3 text-xs leading-relaxed text-ink-100">
              {jsonTexto}
            </pre>
          ) : (
            <div className="texto-prompt rolagem-fina max-h-[24rem] overflow-y-auto rounded-lg border border-ink-800 bg-ink-1000 p-3 text-sm leading-relaxed text-ink-100">
              {prompt.texto}
            </div>
          )}

          {/*
            O ajuste fica junto do prompt, e não numa tela de edição: a correção
            nasce da leitura ("essa cor não", "tira os mockups") e escrevê-la a
            três cliques de distância do texto faria perder o que se ia dizer.
          */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <Icon name="faisca" size={12} />
              Ajuste
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[10rem] flex-1">
                <Input
                  value={ajuste}
                  onChange={(evento) => setAjuste(evento.target.value)}
                  placeholder="Troque só a paleta para verde escuro e marfim."
                  disabled={refazendo}
                />
              </div>
              <Button
                variant="secundaria"
                className="shrink-0 px-3 py-2 text-xs"
                onClick={() => aoRefazer(ajuste)}
                disabled={refazendo || !ajuste.trim()}
              >
                {refazendo ? <Spinner className="h-3 w-3" /> : <Icon name="faisca" size={13} />}
                {refazendo ? "Refazendo…" : "Refazer"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
              Reescreve este prompt mantendo o resto igual. A ideia não muda.
            </p>
          </div>
        </div>
      ) : null}

      <Modal
        titulo="Recriar o briefing deste prompt"
        aberto={confirmandoRestauro}
        aoFechar={() => setConfirmandoRestauro(false)}
      >
        <p className="mb-6 text-sm leading-relaxed text-ink-300">
          Isto devolve à coluna da esquerda o briefing, as barras de temperamento
          e as restrições exatamente como estavam quando este prompt foi escrito —
          e <strong className="text-ink-50">substitui o que está lá agora</strong>.
          As ideias e os prompts já gerados não são afetados.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="fantasma" onClick={() => setConfirmandoRestauro(false)}>
            Cancelar
          </Button>
          <Button variant="primaria" onClick={restaurar} disabled={restaurando}>
            {restaurando ? <Spinner /> : <Icon name="historico" size={15} />}
            Recriar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
