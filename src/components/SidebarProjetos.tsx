"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/blocos/_shared/icons";
import type { ProjetoResumo } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";
import { Modal } from "./Modal";
import { Aviso, Button, Input, Label, Spinner } from "./ui";

export function SidebarProjetos({ projetos }: { projetos: ProjetoResumo[] }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCriando(true);
    try {
      const resposta = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      const json = (await resposta.json()) as { id?: string; error?: string };
      if (!resposta.ok || !json.id) {
        setErro(json.error ?? "Não foi possível criar o projeto.");
        return;
      }
      setAberto(false);
      setNome("");
      router.push(`/projetos/${json.id}`);
      router.refresh();
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <div className="p-3">
        <Button variant="primaria" className="w-full" onClick={() => setAberto(true)}>
          <Icon name="mais" size={16} />
          Criar nova marca
        </Button>
      </div>

      <nav className="rolagem-fina min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Projetos
        </p>
        {projetos.length === 0 ? (
          <p className="px-3 py-2 text-sm leading-relaxed text-ink-500">
            Nenhum projeto ainda.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {projetos.map((projeto) => (
              <li key={projeto.id}>
                <Link
                  href={`/projetos/${projeto.id}`}
                  className={clsx(
                    "block rounded-lg px-3 py-2.5 transition",
                    params?.id === projeto.id
                      ? "bg-ink-850 text-ink-50"
                      : "text-ink-200 hover:bg-ink-900 hover:text-ink-50",
                  )}
                >
                  <span className="block truncate text-sm font-medium">{projeto.nome}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {projeto.totalIdeias === 0
                      ? "Briefing"
                      : `${projeto.totalIdeias} ideia${projeto.totalIdeias > 1 ? "s" : ""}`}
                    {projeto.totalPrompts > 0 ? ` · ${projeto.totalPrompts} prompt${projeto.totalPrompts > 1 ? "s" : ""}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t border-ink-800 p-3">
        <LogoutButton />
      </div>

      <Modal titulo="Nova marca" aberto={aberto} aoFechar={() => setAberto(false)}>
        <form onSubmit={criar} className="space-y-4">
          <div>
            <Label hint="dá para mudar depois">Nome da marca</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Mentoria Alpha"
              autoFocus
              required
            />
          </div>
          {erro ? <Aviso>{erro}</Aviso> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primaria" disabled={criando || !nome.trim()}>
              {criando ? <Spinner /> : null}
              Criar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
