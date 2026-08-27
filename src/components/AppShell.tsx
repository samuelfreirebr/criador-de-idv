"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/blocos/_shared/icons";
import { Logo } from "./Logo";

const CHAVE = "idpro:barra-recolhida";

/**
 * Casca das telas autenticadas.
 *
 * No desktop a lista de projetos recolhe para um trilho de 52px. O editor usa
 * as duas colunas inteiras — briefing e ideias — e 280px de navegação
 * permanente sairiam do espaço de leitura, que é o que o trabalho exige. A
 * escolha fica guardada no navegador: recolher a cada visita seria pior que
 * não ter o botão.
 *
 * No celular a barra vira gaveta, porque lá ela não cabe de jeito nenhum.
 */
export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  const pathname = usePathname();

  // Lido depois da montagem: o servidor não conhece o localStorage, e ler
  // durante a renderização faria o HTML do servidor divergir do cliente.
  useEffect(() => {
    setRecolhida(window.localStorage.getItem(CHAVE) === "sim");
  }, []);

  function alternarRecolhida() {
    setRecolhida((atual) => {
      const proxima = !atual;
      window.localStorage.setItem(CHAVE, proxima ? "sim" : "nao");
      return proxima;
    });
  }

  useEffect(() => setAberta(false), [pathname]);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberta(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  return (
    <div className="sem-rolagem-lateral flex min-h-[100dvh] flex-col lg:flex-row">
      {/* Barra superior: só no celular */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-950 px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir lista de projetos"
          aria-expanded={aberta}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-300 transition hover:bg-ink-850"
        >
          <Icon name="menu" size={20} />
        </button>
        <Link href="/projetos">
          <Logo tamanho="sm" />
        </Link>
      </header>

      {aberta ? (
        <div
          className="fixed inset-0 z-40 bg-ink-1000/70 lg:hidden"
          onMouseDown={() => setAberta(false)}
          aria-hidden
        />
      ) : null}

      {/* Trilho recolhido — só no desktop */}
      {recolhida ? (
        <div className="hidden w-[52px] shrink-0 flex-col items-center gap-2 border-r border-ink-800 bg-ink-950 py-4 lg:flex">
          <button
            type="button"
            onClick={alternarRecolhida}
            aria-label="Expandir lista de projetos"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-850 hover:text-ink-50"
          >
            <Icon name="menu" size={18} />
          </button>
          <Link
            href="/projetos"
            aria-label="Projetos"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-850 hover:text-ink-50"
          >
            <Icon name="pasta" size={18} />
          </Link>
        </div>
      ) : null}

      <aside
        className={clsx(
          "flex w-[280px] shrink-0 flex-col border-r border-ink-800 bg-ink-950",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 lg:transition-none",
          aberta ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          recolhida ? "lg:hidden" : "",
        )}
      >
        <div className="flex items-center justify-between border-b border-ink-800 px-4 py-4">
          <Link href="/projetos">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setAberta(false)}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-850 lg:hidden"
          >
            <Icon name="fechar" size={18} />
          </button>
          <button
            type="button"
            onClick={alternarRecolhida}
            aria-label="Recolher lista de projetos"
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-850 hover:text-ink-50 lg:flex"
          >
            <Icon name="recolher" size={17} />
          </button>
        </div>

        {sidebar}
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
