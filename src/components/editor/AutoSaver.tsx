"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "./store";

const PAUSA_MS = 700;
/** Teto do recuo exponencial: mesmo offline, nunca menos de uma tentativa por 30s. */
const RECUO_MAXIMO_MS = 30_000;

/** Erro de envio que carrega o status HTTP, para decidir se vale repetir. */
class ErroDeEnvio extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function enviarJson(url: string, corpo: unknown): Promise<void> {
  const resposta = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new ErroDeEnvio(resposta.status);
}

/**
 * Um erro que repetir não conserta.
 *
 * Sessão expirada, projeto apagado noutra aba, payload rejeitado: reenviar o
 * mesmo corpo produz exatamente a mesma resposta. Insistir nesses casos gera
 * uma enxurrada de requisições que não salva nada e ainda esconde a causa —
 * foi o que aconteceu antes deste tratamento existir. A alteração continua
 * marcada como pendente e a próxima edição do usuário dispara um novo ciclo.
 */
function inutilRepetir(erro: unknown): boolean {
  if (!(erro instanceof ErroDeEnvio)) return false;
  if (erro.status === 408 || erro.status === 429) return false; // esses passam
  return erro.status >= 400 && erro.status < 500;
}

/**
 * Salvamento automático.
 *
 * Observa o que está pendente — blocos do briefing, vereditos e comentários de
 * ideias, e o nome do projeto — e envia depois de uma pausa na digitação.
 * Alterações feitas durante o envio disparam um novo ciclo. Não existe botão
 * "Salvar" em lugar nenhum do app.
 */
export function AutoSaver() {
  const store = useEditorStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enviando = useRef(false);
  const falhasSeguidas = useRef(0);

  useEffect(() => {
    function agendar(atraso: number) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(enviar, atraso);
    }

    async function enviar() {
      const estado = store.getState();
      const blocos = Object.keys(estado.dirtyBlocos);
      const ideias = Object.keys(estado.dirtyIdeias);
      const projetoDirty = estado.projetoDirty;

      if ((blocos.length === 0 && ideias.length === 0 && !projetoDirty) || enviando.current) {
        return;
      }

      enviando.current = true;
      store.getState().setStatus("salvando");

      // Guardados fora do try: o que já foi salvo precisa ser confirmado mesmo
      // que um envio seguinte falhe, senão uma falha no fim da fila reenviaria
      // tudo o que já tinha dado certo.
      const blocosSalvos: string[] = [];
      const ideiasSalvas: string[] = [];
      let projetoSalvo = false;

      try {
        const projetoId = store.getState().projeto.id;

        for (const tipo of blocos) {
          const bloco = store.getState().projeto.blocos.find((item) => item.tipo === tipo);
          if (!bloco) {
            blocosSalvos.push(tipo);
            continue;
          }
          await enviarJson(`/api/projetos/${projetoId}/blocos/${tipo}`, { data: bloco.data });
          blocosSalvos.push(tipo);
        }

        for (const id of ideias) {
          const ideia = store
            .getState()
            .projeto.rodadas.flatMap((rodada) => rodada.ideias)
            .find((item) => item.id === id);
          if (!ideia) {
            ideiasSalvas.push(id);
            continue;
          }
          await enviarJson(`/api/ideias/${id}`, {
            veredito: ideia.veredito,
            comentario: ideia.comentario,
          });
          ideiasSalvas.push(id);
        }

        if (projetoDirty) {
          await enviarJson(`/api/projetos/${projetoId}`, {
            nome: store.getState().projeto.nome,
          });
          projetoSalvo = true;
        }

        falhasSeguidas.current = 0;
        store.getState().marcarSalvo(blocosSalvos, ideiasSalvas, projetoSalvo);
      } catch (erro) {
        console.error("[autosave] falha ao salvar:", erro);
        store.getState().marcarSalvo(blocosSalvos, ideiasSalvas, projetoSalvo);
        store.getState().marcarFalha();

        if (inutilRepetir(erro)) {
          // Fica pendente e para por aqui. A próxima edição reabre o ciclo.
          falhasSeguidas.current = 0;
          enviando.current = false;
          return;
        }
        falhasSeguidas.current += 1;
      } finally {
        enviando.current = false;
      }

      const proximo = store.getState();
      const aindaPendente =
        Object.keys(proximo.dirtyBlocos).length > 0 ||
        Object.keys(proximo.dirtyIdeias).length > 0 ||
        proximo.projetoDirty;

      if (aindaPendente) {
        // Recuo exponencial: o segundo ciclo espera 1,4s, o terceiro 2,8s, e
        // assim por diante até o teto. Sem isto, um servidor fora do ar recebia
        // uma requisição a cada 700ms, indefinidamente.
        const atraso = Math.min(
          PAUSA_MS * 2 ** falhasSeguidas.current,
          RECUO_MAXIMO_MS,
        );
        agendar(atraso);
      }
    }

    const cancelar = store.subscribe((estado, anterior) => {
      const mudouBloco =
        estado.dirtyBlocos !== anterior.dirtyBlocos &&
        Object.keys(estado.dirtyBlocos).length > 0;
      const mudouIdeia =
        estado.dirtyIdeias !== anterior.dirtyIdeias &&
        Object.keys(estado.dirtyIdeias).length > 0;
      const mudouProjeto = estado.projetoDirty && !anterior.projetoDirty;
      if (mudouBloco || mudouIdeia || mudouProjeto) {
        // Edição nova zera o recuo: o usuário mexeu, vale tentar já.
        falhasSeguidas.current = 0;
        agendar(PAUSA_MS);
      }
    });

    return () => {
      cancelar();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [store]);

  // Avisa antes de fechar a aba com alterações ainda não enviadas.
  useEffect(() => {
    const aoSair = (evento: BeforeUnloadEvent) => {
      const estado = store.getState();
      if (
        Object.keys(estado.dirtyBlocos).length > 0 ||
        Object.keys(estado.dirtyIdeias).length > 0 ||
        estado.projetoDirty
      ) {
        evento.preventDefault();
      }
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [store]);

  return null;
}
