import Link from "next/link";
import { Icon } from "@/blocos/_shared/icons";
import { listarProjetos } from "@/lib/queries";

const FORMATO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function ProjetosPage() {
  const projetos = await listarProjetos();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 lg:py-16">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50">Projetos</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          Cada projeto é uma marca: o briefing, as rodadas de ideias e os prompts que saíram delas.
        </p>
      </header>

      {projetos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 px-8 py-20 text-center">
          <h2 className="font-display text-lg font-semibold text-ink-50">
            Comece pela primeira marca
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-400">
            Use “Criar nova marca” na barra lateral. Você preenche o briefing, gera ideias em
            rodadas e transforma as que gostar em prompts prontos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projetos.map((projeto) => (
            <li key={projeto.id}>
              <Link
                href={`/projetos/${projeto.id}`}
                className="group flex h-full flex-col rounded-xl border border-ink-700 bg-ink-900 p-5 transition hover:border-ink-500"
              >
                <span className="font-display text-base font-semibold text-ink-50">
                  {projeto.nome}
                </span>
                <span className="mt-1 text-xs text-ink-500">
                  atualizado {FORMATO.format(new Date(projeto.atualizadoEm))}
                </span>
                <span className="mt-6 flex items-center gap-4 text-xs text-ink-400">
                  <span className="flex items-center gap-1.5">
                    <Icon name="faisca" size={14} />
                    {projeto.totalIdeias} ideia{projeto.totalIdeias === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="documento" size={14} />
                    {projeto.totalPrompts} prompt{projeto.totalPrompts === 1 ? "" : "s"}
                  </span>
                  <Icon
                    name="chevron"
                    size={14}
                    className="ml-auto text-ink-600 transition group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
