import type { BlocoData } from "@/blocos/types";
import type { DadosIdeia } from "./ideia";

/** DTOs que atravessam a fronteira servidor → cliente. */

export type Veredito = "neutro" | "amei" | "descartei";

export interface BlocoDTO {
  tipo: string;
  data: BlocoData;
}

export interface IdeiaDTO {
  id: string;
  ordem: number;
  data: DadosIdeia;
  veredito: Veredito;
  comentario: string;
  /** Null enquanto ninguém pediu o prompt desta ideia. */
  prompt: PromptDTO | null;
}

export interface RodadaDTO {
  id: string;
  numero: number;
  instrucao: string;
  criadaEm: string;
  ideias: IdeiaDTO[];
}

export interface PromptDTO {
  id: string;
  titulo: string;
  texto: string;
  /** Correção pedida na última refação. Vazio na primeira geração. */
  ajuste: string;
  /**
   * Há briefing guardado para restaurar?
   *
   * Só a existência atravessa a fronteira: a fotografia inteira pesa mais que
   * o prompt e a tela não a exibe — ela só é lida no servidor, ao restaurar.
   */
  temConfiguracao: boolean;
  /** Versão em inglês, estruturada. Null até alguém apertar o botão. */
  json: unknown | null;
  atualizadoEm: string;
}

export interface ProjetoResumo {
  id: string;
  nome: string;
  status: string;
  totalIdeias: number;
  totalPrompts: number;
  atualizadoEm: string;
}

export interface ProjetoDetalhe {
  id: string;
  nome: string;
  status: string;
  blocos: BlocoDTO[];
  rodadas: RodadaDTO[];
}
