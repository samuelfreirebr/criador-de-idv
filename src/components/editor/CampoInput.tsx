"use client";

import { comoCores, comoRefs, comoTags } from "@/blocos/_shared/format";
import { Icon } from "@/blocos/_shared/icons";
import type { FieldDef } from "@/blocos/types";
import { Input, Label, Select, Textarea } from "@/components/ui";
import { CampoCores } from "./CampoCores";
import { CampoDocumento } from "./CampoDocumento";
import { CampoEixo } from "./CampoEixo";
import { CampoImagens } from "./CampoImagens";
import { CampoTags } from "./CampoTags";
import { useEditor, useEditorStore } from "./store";

/**
 * Desenha um campo a partir da sua declaração.
 *
 * Nenhum bloco escreve HTML de formulário. Para criar um tipo de campo novo o
 * trabalho é: acrescentar ao union em `types.ts`, tratar aqui, e definir o
 * valor vazio em `registry.ts`. Três lugares, sempre os mesmos três.
 */
export function CampoInput({ tipo, field }: { tipo: string; field: FieldDef }) {
  const store = useEditorStore();
  const valor = useEditor(
    (estado) => estado.projeto.blocos.find((bloco) => bloco.tipo === tipo)?.data[field.key],
  );

  const mudar = (novo: unknown) => store.getState().atualizarCampo(tipo, field.key, novo);
  const mudarItem = (indice: number, chave: string, novo: unknown) =>
    store.getState().atualizarItem(tipo, field.key, indice, chave, novo);
  const remover = (indice: number) => store.getState().removerItem(tipo, field.key, indice);

  // A caixa de seleção traz o próprio rótulo na linha; um <Label> acima dela
  // repetiria o texto.
  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3">
        <input
          type="checkbox"
          checked={valor === true}
          onChange={(evento) => mudar(evento.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#e85002]"
        />
        <span className="flex items-center gap-2 text-sm leading-snug text-ink-100">
          {field.icon ? <Icon name={field.icon} size={14} className="text-ink-400" /> : null}
          {field.label}
        </span>
      </label>
    );
  }

  if (field.type === "axis") {
    return (
      <CampoEixo
        field={field}
        valor={typeof valor === "number" ? valor : null}
        aoMudar={mudar}
      />
    );
  }

  return (
    <div>
      <Label>
        <span className="flex items-center gap-2">
          {field.icon ? <Icon name={field.icon} size={13} className="text-ink-500" /> : null}
          {field.label}
        </span>
      </Label>

      {field.type === "text" ? (
        <Input
          value={typeof valor === "string" ? valor : ""}
          onChange={(evento) => mudar(evento.target.value)}
          placeholder={field.placeholder}
        />
      ) : null}

      {field.type === "documento" ? (
        <CampoDocumento
          field={field}
          valor={typeof valor === "string" ? valor : ""}
          aoMudar={mudar}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          rows={field.rows ?? 3}
          value={typeof valor === "string" ? valor : ""}
          onChange={(evento) => mudar(evento.target.value)}
          placeholder={field.placeholder}
        />
      ) : null}

      {field.type === "select" ? (
        <Select
          value={typeof valor === "string" ? valor : ""}
          onChange={(evento) => mudar(evento.target.value)}
        >
          {(field.options ?? []).map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </Select>
      ) : null}

      {field.type === "tags" ? (
        <CampoTags field={field} valor={comoTags(valor)} aoMudar={mudar} />
      ) : null}

      {field.type === "colors" ? (
        <CampoCores
          field={field}
          valor={comoCores(valor)}
          aoMudarItem={mudarItem}
          aoAdicionar={() =>
            store.getState().adicionarItem(tipo, field.key, { hex: "#333333", nome: "", uso: "" })
          }
          aoRemover={remover}
        />
      ) : null}

      {field.type === "images" ? (
        <CampoImagens
          field={field}
          valor={comoRefs(valor)}
          aoMudarItem={mudarItem}
          aoAdicionar={(assetId) =>
            store.getState().adicionarItem(tipo, field.key, { assetId, nota: "" })
          }
          aoRemover={remover}
        />
      ) : null}

      {field.help ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{field.help}</p>
      ) : null}
    </div>
  );
}
