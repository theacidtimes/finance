"use client";

import { create } from "zustand";
import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  ProjetoArquivo,
} from "@/types";
import { SEED_ATTO } from "@/data/seed";
import { BLOCOS_PADRAO } from "@/data/blocos";

export interface ProjetoState {
  id?: string;
  proj: Projeto;
  externos: CustoExterno[];
  internos: StaffInterno[];
  cronograma: MarcoCronograma[];
  blocos: BlocosProposta;

  setProjField: <K extends keyof Projeto>(k: K, v: Projeto[K]) => void;

  addExterno: () => void;
  updateExterno: (id: CustoExterno["id"], patch: Partial<CustoExterno>) => void;
  removeExterno: (id: CustoExterno["id"]) => void;

  addInterno: () => void;
  updateInterno: (id: StaffInterno["id"], patch: Partial<StaffInterno>) => void;
  removeInterno: (id: StaffInterno["id"]) => void;

  addMarco: () => void;
  updateMarco: (index: number, patch: Partial<MarcoCronograma>) => void;
  removeMarco: (index: number) => void;

  setBloco: <K extends keyof BlocosProposta>(k: K, v: BlocosProposta[K]) => void;

  hydrate: (data: Partial<ProjetoArquivo> & { id?: string }) => void;
  toArquivo: () => ProjetoArquivo;
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
        { id: Date.now(), nome: "", funcao: "", categoria: "Outros", valor: 0, status: "Orçado", nf: false, dataPagamento: "", obs: "" },
      ],
    })),
  updateExterno: (id, patch) =>
    set((s) => ({ externos: s.externos.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  removeExterno: (id) => set((s) => ({ externos: s.externos.filter((e) => e.id !== id) })),

  addInterno: () =>
    set((s) => ({
      internos: [...s.internos, { id: Date.now(), nome: "", funcao: "", salario: 0, baseHoras: 160, horasProjeto: 0 }],
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
