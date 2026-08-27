"use client";

import clsx from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** Primitivas de interface. Nenhuma biblioteca externa: ver docs/arquitetura.md. */

type Variante = "primaria" | "secundaria" | "fantasma" | "perigo" | "perigo-solido";

export function Button({
  variant = "secundaria",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primaria" && "bg-brand text-ink-50 hover:bg-brand-hot",
        variant === "secundaria" &&
          "border border-ink-700 bg-ink-900 text-ink-100 hover:border-ink-600 hover:bg-ink-850",
        variant === "fantasma" && "text-ink-300 hover:bg-ink-850 hover:text-ink-50",
        variant === "perigo" &&
          "border border-ink-700 bg-transparent text-ink-300 hover:border-brand-deep hover:text-brand-hot",
        variant === "perigo-solido" && "bg-brand-deep text-ink-50 hover:bg-brand",
        className,
      )}
    />
  );
}

const CAMPO =
  "w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 transition " +
  "placeholder:text-ink-500 focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-700";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(CAMPO, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(CAMPO, "resize-y leading-relaxed", className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(CAMPO, "appearance-none pr-8", className)} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300">
        {children}
      </span>
      {hint ? <span className="text-xs text-ink-500">{hint}</span> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-ink-700 bg-ink-900", className)}>{children}</div>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-700 px-8 py-16 text-center">
      <h3 className="mb-1.5 font-display text-base font-semibold text-ink-50">{titulo}</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-ink-300">{descricao}</p>
      {acao}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
      aria-hidden
    />
  );
}

/** Aviso de erro. Sempre com o texto que veio do servidor — nunca "algo deu errado". */
export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-brand-deep/50 bg-brand-deep/10 px-3 py-2 text-sm text-brand-hot">
      {children}
    </p>
  );
}
