"use client";

import { Icon } from "@/blocos/_shared/icons";
import { BLOCOS, progressoDoBloco } from "@/blocos/registry";
import type { FieldDef } from "@/blocos/types";
import { BotaoPreencher } from "./BotaoPreencher";
import { CampoInput } from "./CampoInput";
import { useEditor } from "./store";

/**
 * O briefing inteiro numa coluna só.
 *
 * A versão anterior tinha uma lista de seções à esquerda e o formulário à
 * direita: para saber o que faltava era preciso abrir nove telas, uma a uma.
 * Aqui tudo está visível de saída e a única navegação é a rolagem — o que
 * importa é preencher rápido o pouco que se sabe, não percorrer um cadastro.
 */
export function PainelBriefing() {
  const blocos = useEditor((estado) => estado.projeto.blocos);

  return (
    <div className="rolagem-fina min-h-0 flex-1 lg:overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-12 px-5 py-6 lg:px-8 lg:py-8">
        {BLOCOS.map((bloco) => {
          const data = blocos.find((item) => item.tipo === bloco.id)?.data ?? {};
          const preenchido = progressoDoBloco(bloco.id, data) > 0;

          return (
            <section key={bloco.id}>
              <header className="mb-5 flex items-start gap-3">
                <span
                  className={
                    preenchido
                      ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand"
                      : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-850 text-ink-400"
                  }
                >
                  <Icon name={bloco.icon} size={16} />
                </span>
                <span className="min-w-0">
                  <h2 className="font-display text-lg font-bold tracking-tight text-ink-50">
                    {bloco.label}
                  </h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-400">
                    {bloco.description}
                  </p>
                </span>
              </header>

              <div className="space-y-5">
                {agruparCampos(bloco.fields).map((grupo, indice) =>
                  grupo.length > 1 ? (
                    // Barras seguidas ficam lado a lado: são catorze no total, e
                    // empilhadas todas transformariam o briefing numa rolagem
                    // longa de controles quase idênticos.
                    <div key={indice} className="grid gap-2 sm:grid-cols-2">
                      {grupo.map((field) => (
                        <CampoInput key={field.key} tipo={bloco.id} field={field} />
                      ))}
                    </div>
                  ) : (
                    <CampoInput key={grupo[0].key} tipo={bloco.id} field={grupo[0]} />
                  ),
                )}
              </div>

              {/* Logo abaixo do briefing: é ali que a decisão de delegar nasce. */}
              {bloco.id === "briefing" ? (
                <div className="mt-5">
                  <BotaoPreencher />
                </div>
              ) : null}
            </section>
          );
        })}

        <p className="border-t border-ink-800 pt-6 text-xs leading-relaxed text-ink-500">
          Campo em branco não é problema: o que você não disser, a IA decide — e
          varia entre as ideias em vez de escolher o meio-termo.
        </p>
      </div>
    </div>
  );
}

/**
 * Junta barras de temperamento consecutivas num mesmo grupo.
 *
 * É decisão de apresentação, e por isso mora aqui e não na pasta do bloco: um
 * bloco declara que o campo é uma barra, não como ele se arruma na tela.
 */
function agruparCampos(fields: FieldDef[]): FieldDef[][] {
  const grupos: FieldDef[][] = [];
  for (const field of fields) {
    const ultimo = grupos[grupos.length - 1];
    if (field.type === "axis" && ultimo && ultimo[0].type === "axis") {
      ultimo.push(field);
    } else {
      grupos.push([field]);
    }
  }
  return grupos;
}
