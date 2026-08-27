"use client";

import { Icon } from "@/blocos/_shared/icons";
import type { CorDefinida } from "@/blocos/_shared/format";
import type { FieldDef } from "@/blocos/types";
import { Button, Input } from "@/components/ui";

/**
 * Paleta já definida pelo cliente.
 *
 * O `uso` de cada cor ("fundo", "acento", "texto") vai junto porque uma lista
 * de hexadecimais sem hierarquia faz o modelo distribuí-los por conta própria —
 * e ele escolhe o acento como fundo com frequência desconfortável.
 */
export function CampoCores({
  field,
  valor,
  aoMudarItem,
  aoAdicionar,
  aoRemover,
}: {
  field: FieldDef;
  valor: CorDefinida[];
  aoMudarItem: (indice: number, chave: string, novo: string) => void;
  aoAdicionar: () => void;
  aoRemover: (indice: number) => void;
}) {
  const noLimite = valor.length >= (field.maxItems ?? 8);

  return (
    <div className="space-y-2">
      {valor.map((cor, indice) => (
        <div
          key={indice}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/60 p-2"
        >
          <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-ink-700">
            <span
              className="block h-full w-full"
              style={{ background: /^#[0-9a-f]{3,8}$/i.test(cor.hex) ? cor.hex : "#333333" }}
            />
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(cor.hex) ? cor.hex : "#333333"}
              onChange={(evento) => aoMudarItem(indice, "hex", evento.target.value.toUpperCase())}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={`Cor ${indice + 1}`}
            />
          </label>

          {/*
            A largura vive no contêiner, e não numa classe passada ao <Input>:
            a primitiva já declara `w-full`, e duas utilitárias de largura na
            mesma classe são desempatadas pela ordem do CSS gerado, não pela
            ordem em que foram escritas. O campo do meio sumia por causa disso.
          */}
          <div className="w-28 shrink-0">
            <Input
              value={cor.hex}
              onChange={(evento) => aoMudarItem(indice, "hex", evento.target.value)}
              placeholder="#E85002"
              className="font-mono text-xs uppercase"
            />
          </div>
          <div className="min-w-[7rem] flex-1">
            <Input
              value={cor.nome}
              onChange={(evento) => aoMudarItem(indice, "nome", evento.target.value)}
              placeholder="Nome"
            />
          </div>
          <div className="w-28 shrink-0">
            <Input
              value={cor.uso}
              onChange={(evento) => aoMudarItem(indice, "uso", evento.target.value)}
              placeholder="Uso"
            />
          </div>
          <button
            type="button"
            onClick={() => aoRemover(indice)}
            aria-label="Remover cor"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-850 hover:text-brand-hot"
          >
            <Icon name="lixo" size={15} />
          </button>
        </div>
      ))}

      <Button type="button" variant="secundaria" onClick={aoAdicionar} disabled={noLimite}>
        <Icon name="mais" size={15} />
        {valor.length === 0 ? "Adicionar cor" : "Mais uma cor"}
      </Button>
    </div>
  );
}
