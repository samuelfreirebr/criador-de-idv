"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  titulo,
  aberto,
  aoFechar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-1000/80" onMouseDown={aoFechar} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-label={titulo}
        className="relative w-full max-w-md rounded-xl border border-ink-700 bg-ink-900 p-6 shadow-2xl"
      >
        <h2 className="mb-5 font-display text-lg font-semibold text-ink-50">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
