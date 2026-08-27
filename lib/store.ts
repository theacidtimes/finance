"use client";

import { create } from "zustand";
import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  OpcaoComercial,
  ProjetoArquivo,
  TeamMember,
  Friend,
} from "@/types";
import type { ProjetoCompleto } from "@/lib/supabase/queries";
import { SEED_ATTO } from "@/data/seed";
import { BLOCOS_PADRAO } from "@/data/blocos";
import { custoMensalCarregado } from "@/lib/team";
import {
  brlDaProposta,
  propostaInternacional,
  custoCambio,
  custoCambioPctDe,
  LINHA_CUSTO_CAMBIO,
} from "@/lib/moeda";
import { valorDaProposta, escolherOpcao as escolher, totalSugerido } from "@/lib/opcoes";

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

/**
 * Id de linha nova.
 *
 * `Date.now()` sozinho não serve: duas linhas criadas no mesmo milissegundo
 * saem com o mesmo id, e aí editar uma edita todas — o contador remove o
 * empate sem depender da resolução do relógio.
 */
let seqOpcao = 0;
const novoIdOpcao = () => `op-${Date.now()}-${++seqOpcao}`;

/**
 * Mantém `valorBruto` (em real) coerente com o preço da proposta.
 *
 * `valorBruto` é o único número que DRE, carteira, dashboard e Performance
 * enxergam, e todos somam em real. O preço, porém, pode vir de dois lugares:
 * digitado direto no Cadastro, ou da grade de opções comerciais (ver
 * `lib/opcoes.ts`). E pode estar em euro. Esta função é o ponto onde os dois
 * caminhos viram um número em real — se ela não existisse, o projeto sairia
 * com o preço certo no PDF e o valor velho no dashboard.
 *
 * Câmbio ainda não preenchido não zera nada: `brlDaProposta` devolve null e o
 * valor anterior fica de pé até alguém informar a taxa.
 */
function comValorBrutoDerivado(proj: Projeto, opcoes: OpcaoComercial[]): Projeto {
  const intl = propostaInternacional(proj);
  const base = intl ? Number(proj.valorMoeda ?? 0) : Number(proj.valorBruto ?? 0);
  // Preço na moeda da proposta: a opção fechada, senão a menor, senão o digitado.
  const valor = valorDaProposta(opcoes, base);

  if (!intl) return proj.valorBruto === valor ? proj : { ...proj, valorBruto: valor };

  const comMoeda = proj.valorMoeda === valor ? proj : { ...proj, valorMoeda: valor };
  const brl = brlDaProposta(valor, proj.cambio);
  return brl === null || comMoeda.valorBruto === brl ? comMoeda : { ...comMoeda, valorBruto: brl };
}

/**
 * Mantém a linha de custo de câmbio coerente com o valor do projeto.
 *
 * Só atualiza uma linha que já existe — nunca cria. Lançar o custo é uma
 * decisão explícita (o botão no Cadastro), e apagar a linha é como se desiste
 * dela. Sem essa regra, a linha voltaria sozinha toda vez que alguém mexesse
 * no preço, e não haveria como não usá-la.
 */
function sincronizaCustoCambio(proj: Projeto, externos: CustoExterno[]): CustoExterno[] {
  const i = externos.findIndex((e) => e.nome === LINHA_CUSTO_CAMBIO);
  if (i < 0) return externos;
  const valor = propostaInternacional(proj)
    ? custoCambio(proj.valorBruto, custoCambioPctDe(proj))
    : 0;
  if (externos[i].valor === valor) return externos;
  return externos.map((e, j) => (j === i ? { ...e, valor } : e));
}

/**
 * Recalcula o que é derivado depois de qualquer mudança: o valor em real e a
 * linha de custo de câmbio. Um lugar só — espalhar isso pelas mutações é como
 * se cria a divergência entre o preço do PDF e o número do dashboard.
 */
function recalcula(
  proj: Projeto,
  opcoes: OpcaoComercial[],
  externos: CustoExterno[]
): { proj: Projeto; externos: CustoExterno[] } {
  const p = comValorBrutoDerivado(proj, opcoes);
  return { proj: p, externos: sincronizaCustoCambio(p, externos) };
}

export interface ProjetoState {
  id?: string;
  proj: Projeto;
  externos: CustoExterno[];
  internos: StaffInterno[];
  cronograma: MarcoCronograma[];
  opcoes: OpcaoComercial[];
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

  /** Lança spread + IOF como custo externo, para o DRE enxergar. */
  lancarCustoCambio: () => void;

  addOpcao: () => void;
  updateOpcao: (id: OpcaoComercial["id"], patch: Partial<OpcaoComercial>) => void;
  removeOpcao: (id: OpcaoComercial["id"]) => void;
  escolherOpcao: (id: OpcaoComercial["id"]) => void;

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
    opcoes: s.opcoes,
    blocos: s.blocos,
  };
}

export const useProjetoStore = create<ProjetoState>((set, get) => ({
  id: undefined,
  proj: SEED_ATTO.proj,
  externos: SEED_ATTO.externos,
  internos: SEED_ATTO.internos,
  cronograma: SEED_ATTO.cronograma,
  opcoes: [],
  blocos: SEED_ATTO.blocos,

  setProjField: (k, v) =>
    set((s) => recalcula({ ...s.proj, [k]: v }, s.opcoes, s.externos)),

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

  lancarCustoCambio: () =>
    set((s) => {
      const valor = custoCambio(s.proj.valorBruto, custoCambioPctDe(s.proj));
      const existe = s.externos.some((e) => e.nome === LINHA_CUSTO_CAMBIO);
      if (existe) return { externos: sincronizaCustoCambio(s.proj, s.externos) };
      return {
        externos: [
          ...s.externos,
          {
            id: novoIdOpcao(),
            nome: LINHA_CUSTO_CAMBIO,
            funcao: "Despesa financeira",
            // Não é produção: é o que o banco fica no caminho do dinheiro.
            categoria: "Outros" as const,
            valor,
            status: "Orçado" as const,
            nf: false,
            dataPagamento: "",
            obs: `${custoCambioPctDe(s.proj)}% sobre o câmbio comercial — acompanha o valor do projeto`,
            friendId: null,
          },
        ],
      };
    }),

  addOpcao: () =>
    set((s) => {
      const opcoes = [
        ...s.opcoes,
        {
          id: novoIdOpcao(),
          label: "",
          quantidade: 0,
          valorUnitario: 0,
          valorTotal: 0,
          escolhida: false,
        },
      ];
      return { opcoes, ...recalcula(s.proj, opcoes, s.externos) };
    }),
  updateOpcao: (id, patch) =>
    set((s) => {
      const opcoes = s.opcoes.map((o) => {
        if (o.id !== id) return o;
        const next = { ...o, ...patch };
        // Quantidade × unitário preenche o total — mas só enquanto ninguém
        // tiver escrito um total à mão, que é o caso do preço fechado de pacote.
        if (patch.quantidade !== undefined || patch.valorUnitario !== undefined) {
          const sugerido = totalSugerido(next.quantidade, next.valorUnitario);
          if (sugerido) next.valorTotal = sugerido;
        }
        return next;
      });
      return { opcoes, ...recalcula(s.proj, opcoes, s.externos) };
    }),
  removeOpcao: (id) =>
    set((s) => {
      const opcoes = s.opcoes.filter((o) => o.id !== id);
      return { opcoes, ...recalcula(s.proj, opcoes, s.externos) };
    }),
  escolherOpcao: (id) =>
    set((s) => {
      const opcoes = escolher(s.opcoes, id);
      return { opcoes, ...recalcula(s.proj, opcoes, s.externos) };
    }),

  setBloco: (k, v) => set((s) => ({ blocos: { ...s.blocos, [k]: v } })),

  hydrate: (data) =>
    set((s) => ({
      id: data.id ?? s.id,
      proj: data.proj ? { ...s.proj, ...data.proj } : s.proj,
      externos: Array.isArray(data.externos) ? data.externos : s.externos,
      internos: Array.isArray(data.internos) ? data.internos : s.internos,
      cronograma: Array.isArray(data.cronograma) ? data.cronograma : s.cronograma,
      opcoes: Array.isArray(data.opcoes) ? data.opcoes : [],
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
      opcoes: s.opcoes,
      blocos: s.blocos,
    };
  },
}));
