import { BLOCOS, normalizeBlocoData, createDefaultData } from "@/blocos/registry";
import { normalizeIdeia } from "./ideia";
import { prisma } from "./prisma";
import type { ProjetoDetalhe, ProjetoResumo, RodadaDTO, Veredito } from "./types";

/**
 * Cria no banco os blocos que ainda não existem para este projeto.
 *
 * É o que mantém a promessa "criar uma pasta e pronto" válida para projetos
 * ANTIGOS: um bloco acrescentado hoje aparece amanhã em todo projeto já salvo,
 * vazio, sem migração e sem script de correção. `skipDuplicates` cobre a corrida
 * de duas abas abertas no mesmo projeto.
 */
export async function garantirBlocos(projetoId: string): Promise<void> {
  const existentes = await prisma.bloco.findMany({
    where: { projetoId },
    select: { tipo: true },
  });
  const jaTem = new Set(existentes.map((bloco) => bloco.tipo));
  const faltando = BLOCOS.filter((bloco) => !jaTem.has(bloco.id));
  if (faltando.length === 0) return;

  await prisma.bloco.createMany({
    data: faltando.map((bloco) => ({
      projetoId,
      tipo: bloco.id,
      data: createDefaultData(bloco.id) as object,
    })),
    skipDuplicates: true,
  });
}

export async function listarProjetos(): Promise<ProjetoResumo[]> {
  const projetos = await prisma.projeto.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      nome: true,
      status: true,
      updatedAt: true,
      _count: { select: { ideias: true } },
      ideias: { where: { prompt: { isNot: null } }, select: { id: true } },
    },
  });

  return projetos.map((projeto) => ({
    id: projeto.id,
    nome: projeto.nome,
    status: projeto.status,
    totalIdeias: projeto._count.ideias,
    totalPrompts: projeto.ideias.length,
    atualizadoEm: projeto.updatedAt.toISOString(),
  }));
}

export async function carregarProjeto(id: string): Promise<ProjetoDetalhe | null> {
  const projeto = await prisma.projeto.findUnique({ where: { id } });
  if (!projeto) return null;

  await garantirBlocos(id);

  const [blocos, rodadas] = await Promise.all([
    prisma.bloco.findMany({ where: { projetoId: id } }),
    prisma.rodada.findMany({
      where: { projetoId: id },
      orderBy: { numero: "desc" },
      include: {
        ideias: { orderBy: { ordem: "asc" }, include: { prompt: true } },
      },
    }),
  ]);

  const porTipo = new Map(blocos.map((bloco) => [bloco.tipo, bloco.data]));

  return {
    id: projeto.id,
    nome: projeto.nome,
    status: projeto.status,
    // A ordem vem do registro, não do banco: renumerar as seções não toca em
    // nenhum projeto salvo.
    blocos: BLOCOS.map((bloco) => ({
      tipo: bloco.id,
      data: normalizeBlocoData(bloco.id, porTipo.get(bloco.id) ?? {}),
    })),
    rodadas: rodadas.map((rodada) => ({
      id: rodada.id,
      numero: rodada.numero,
      instrucao: rodada.instrucao,
      criadaEm: rodada.createdAt.toISOString(),
      ideias: rodada.ideias.map((ideia) => ({
        id: ideia.id,
        ordem: ideia.ordem,
        data: normalizeIdeia(ideia.data),
        veredito: ideia.veredito as Veredito,
        comentario: ideia.comentario,
        prompt: ideia.prompt
          ? {
              id: ideia.prompt.id,
              titulo: ideia.prompt.titulo,
              texto: ideia.prompt.texto,
              ajuste: ideia.prompt.ajuste,
              temConfiguracao: ideia.prompt.configuracao !== null,
              json: ideia.prompt.json ?? null,
              atualizadoEm: ideia.prompt.updatedAt.toISOString(),
            }
          : null,
      })),
    })),
  };
}

/** Uma rodada recém-criada, no formato que o editor consome. */
export async function carregarRodada(rodadaId: string): Promise<RodadaDTO | null> {
  const rodada = await prisma.rodada.findUnique({
    where: { id: rodadaId },
    include: { ideias: { orderBy: { ordem: "asc" }, include: { prompt: true } } },
  });
  if (!rodada) return null;

  return {
    id: rodada.id,
    numero: rodada.numero,
    instrucao: rodada.instrucao,
    criadaEm: rodada.createdAt.toISOString(),
    ideias: rodada.ideias.map((ideia) => ({
      id: ideia.id,
      ordem: ideia.ordem,
      data: normalizeIdeia(ideia.data),
      veredito: ideia.veredito as Veredito,
      comentario: ideia.comentario,
      prompt: ideia.prompt
        ? {
            id: ideia.prompt.id,
            titulo: ideia.prompt.titulo,
            texto: ideia.prompt.texto,
            ajuste: ideia.prompt.ajuste,
            temConfiguracao: ideia.prompt.configuracao !== null,
            json: ideia.prompt.json ?? null,
            atualizadoEm: ideia.prompt.updatedAt.toISOString(),
          }
        : null,
    })),
  };
}
