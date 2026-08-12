"use client";

import { create } from "zustand";
import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  ProjetoArquivo,
  TeamMember,
  Friend,
} from "@/types";
import type { ProjetoCompleto } from "@/lib/supabase/queries";
import { SEED_ATTO } from "@/data/seed";
import { BLOCOS_PADRAO } from "@/data/blocos";
import { custoMensalCarregado } from "@/lib/team";

/**
 * Deriva os campos do staff de projeto a partir de um membro do cadastro.
 * Opção (B): o "salário" no projeto é o CUSTO MENSAL CARREGADO (salário +
 * encargos + benefícios) — assim o custo/hora reflete o custo real da pessoa.
 * Não muda nenhuma fórmula do finance.ts; só define qual número entra.
 */
function internoDoMembro(m: TeamMember): Pick<StaffInterno, "nome" | "funcao" | "salario" | "baseHoras" | "teamMemberId"> {
  return {
    nome: m.nome,
    funcao: m.funcao,
    salario: Math.round(custoMensalCarregado(m) * 100) / 100,
    baseHoras: m.baseHorasMes,
    teamMemberId: m.id,
  };
}

export interface ProjetoState {
  id?: string;
  proj: Projeto;
  externos: CustoExterno[];
  internos: StaffInterno[];
  cronograma: MarcoCronograma[];
  blocos: BlocosProposta;

  setProjField: <K extends keyof Projeto>(k: K, v: Projeto[K]) => void;

  addExterno: () => void;
  addExternoFromFriend: (f: Friend) => void;
  updateExterno: (id: CustoExterno["id"], patch: Partial<CustoExterno>) => void;
  removeExterno: (id: CustoExterno["id"]) => void;

  addInterno: () => void;
  addInternoFromMember: (m: TeamMember) => void;
  resyncInternoFromMember: (id: StaffInterno["id"], m: TeamMember) => void;
  updateInterno: (id: StaffInterno["id"], patch: Partial<StaffInterno>) => void;
  removeInterno: (id: StaffInterno["id"]) => void;

  addMarco: () => void;
  updateMarco: (index: number, patch: Partial<MarcoCronograma>) => void;
  removeMarco: (index: number) => void;

  setBloco: <K extends keyof BlocosProposta>(k: K, v: BlocosProposta[K]) => void;

  hydrate: (data: Partial<ProjetoArquivo> & { id?: string }) => void;
  toArquivo: () => ProjetoArquivo;
}

/**
 * Estado atual do projeto aberto, no formato que o banco espera.
 * Fora do hook de propósito: é chamado dentro de handlers (salvar, gerar PDF,
 * versionar), onde o que interessa é o valor do instante, não o do render.
 */
export function completoDoStore(): ProjetoCompleto {
  const s = useProjetoStore.getState();
  return {
    id: s.id!,
    proj: s.proj,
    externos: s.externos,
    internos: s.internos,
    cronograma: s.cronograma,
    blocos: s.blocos,
  };
}

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  id: undefined,
  proj: SEED_ATTO.proj,
  externos: SEED_ATTO.externos,
  internos: SEED_ATTO.internos,
  cronograma: SEED_ATTO.cronograma,
  blocos: SEED_ATTO.blocos,

  setProjField: (k, v) => set((s) => ({ proj: { ...s.proj, [k]: v } })),

  addExterno: () =>
    set((s) => ({
      externos: [
        ...s.externos,
        { id: Date.now(), nome: "", funcao: "", categoria: "Outros", valor: 0, status: "Orçado", nf: false, dataPagamento: "", obs: "", friendId: null },
      ],
    })),
  addExternoFromFriend: (f) =>
    set((s) => ({
      externos: [
        ...s.externos,
        {
          id: Date.now(),
          nome: f.nome,
          funcao: f.categorias[0] ?? "",
          // Um friend com uma entrega só já entra classificado; com várias,
          // a escolha é do projeto e fica em "Outros" até alguém decidir.
          categoria: f.categorias.length === 1 ? f.categorias[0] : "Outros",
          valor: 0,
          status: "Orçado",
          nf: false,
          dataPagamento: "",
          obs: "",
          friendId: f.id,
        },
      ],
    })),
  updateExterno: (id, patch) =>
    set((s) => ({ externos: s.externos.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  removeExterno: (id) => set((s) => ({ externos: s.externos.filter((e) => e.id !== id) })),

  addInterno: () =>
    set((s) => ({
      internos: [...s.internos, { id: Date.now(), nome: "", funcao: "", salario: 0, baseHoras: 160, horasProjeto: 0, teamMemberId: null }],
    })),
  addInternoFromMember: (m) =>
    set((s) => ({
      internos: [...s.internos, { id: Date.now(), horasProjeto: 0, ...internoDoMembro(m) }],
    })),
  resyncInternoFromMember: (id, m) =>
    set((s) => ({
      internos: s.internos.map((e) => (e.id === id ? { ...e, ...internoDoMembro(m) } : e)),
    })),
  updateInterno: (id, patch) =>
    set((s) => ({ internos: s.internos.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  removeInterno: (id) => set((s) => ({ internos: s.internos.filter((e) => e.id !== id) })),

  addMarco: () => set((s) => ({ cronograma: [...s.cronograma, { data: "", marco: "" }] })),
  updateMarco: (index, patch) =>
    set((s) => ({ cronograma: s.cronograma.map((m, i) => (i === index ? { ...m, ...patch } : m)) })),
  removeMarco: (index) => set((s) => ({ cronograma: s.cronograma.filter((_, i) => i !== index) })),

  setBloco: (k, v) => set((s) => ({ blocos: { ...s.blocos, [k]: v } })),

  hydrate: (data) =>
    set((s) => ({
      id: data.id ?? s.id,
      proj: data.proj ? { ...s.proj, ...data.proj } : s.proj,
      externos: Array.isArray(data.externos) ? data.externos : s.externos,
      internos: Array.isArray(data.internos) ? data.internos : s.internos,
      cronograma: Array.isArray(data.cronograma) ? data.cronograma : s.cronograma,
      blocos: data.blocos ? { ...BLOCOS_PADRAO, ...data.blocos } : s.blocos,
    })),

  toArquivo: () => {
    const s = get();
    return {
      app: "acid-finance",
      versao: 1,
      salvoEm: new Date().toISOString(),
      proj: s.proj,
      externos: s.externos,
      internos: s.internos,
      cronograma: s.cronograma,
      blocos: s.blocos,
    };
  },
}));
