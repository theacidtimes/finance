import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  CategoriaExterna,
  StatusCustoExterno,
  TipoProjeto,
} from "@/types";
import type { Database } from "./database.types";
import { BLOCOS_PADRAO } from "@/data/blocos";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ExternalRow = Database["public"]["Tables"]["external_costs"]["Row"];
type ExternalInsert = Database["public"]["Tables"]["external_costs"]["Insert"];
type StaffRow = Database["public"]["Tables"]["internal_staff"]["Row"];
type StaffInsert = Database["public"]["Tables"]["internal_staff"]["Insert"];
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type MilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];

const num = (v: number | null | undefined) => Number(v ?? 0);

export function projectRowToProjeto(row: ProjectRow): Projeto {
  return {
    id: row.id,
    cliente: row.cliente,
    projeto: row.projeto,
    numeroServico: row.numero_servico,
    tipo: (row.tipo as TipoProjeto) ?? "Filme",
    responsavel: row.responsavel ?? "",
    data: row.data ?? "",
    status: row.status ?? "Orçamento",
    valorBruto: num(row.valor_bruto),
    impostosPct: num(row.impostos_pct),
    comissaoPct: num(row.comissao_pct),
    overheadPct: num(row.overhead_pct),
    prazo: row.prazo ?? "",
    condicaoPagamento: row.condicao_pagamento ?? "",
    validadeProposta: row.validade_proposta ?? "15 dias",
    observacoes: row.observacoes ?? "",
    titulo: row.titulo ?? "",
  };
}

export function projetoToProjectInsert(proj: Projeto): ProjectInsert {
  return {
    cliente: proj.cliente,
    projeto: proj.projeto,
    numero_servico: proj.numeroServico,
    tipo: proj.tipo,
    responsavel: proj.responsavel,
    data: proj.data || null,
    status: proj.status,
    valor_bruto: proj.valorBruto,
    impostos_pct: proj.impostosPct,
    comissao_pct: proj.comissaoPct,
    overhead_pct: proj.overheadPct,
    prazo: proj.prazo,
    condicao_pagamento: proj.condicaoPagamento,
    validade_proposta: proj.validadeProposta,
    observacoes: proj.observacoes,
    titulo: proj.titulo,
  };
}

export function blocosFromRow(row: ProjectRow): BlocosProposta {
  const b = (row.blocos ?? {}) as Partial<BlocosProposta>;
  return { ...BLOCOS_PADRAO, ...b };
}

export function externalRowToCusto(row: ExternalRow): CustoExterno {
  return {
    id: row.id,
    nome: row.nome,
    funcao: row.funcao ?? "",
    categoria: (row.categoria as CategoriaExterna) ?? "Outros",
    valor: num(row.valor),
    status: (row.status as StatusCustoExterno) ?? "Orçado",
    nf: row.nf,
    dataPagamento: row.data_pagamento ?? "",
    obs: row.obs ?? "",
  };
}

export function custoToExternalInsert(
  c: CustoExterno,
  projectId: string,
  ordem: number
): ExternalInsert {
  return {
    project_id: projectId,
    ordem,
    nome: c.nome,
    funcao: c.funcao,
    categoria: c.categoria,
    valor: c.valor,
    status: c.status,
    nf: c.nf,
    data_pagamento: c.dataPagamento || null,
    obs: c.obs,
  };
}

export function staffRowToInterno(row: StaffRow): StaffInterno {
  return {
    id: row.id,
    nome: row.nome,
    funcao: row.funcao ?? "",
    salario: num(row.salario),
    baseHoras: num(row.base_horas),
    horasProjeto: num(row.horas_projeto),
  };
}

export function internoToStaffInsert(
  s: StaffInterno,
  projectId: string,
  ordem: number
): StaffInsert {
  return {
    project_id: projectId,
    ordem,
    nome: s.nome,
    funcao: s.funcao,
    salario: s.salario,
    base_horas: s.baseHoras,
    horas_projeto: s.horasProjeto,
  };
}

export function milestoneRowToMarco(row: MilestoneRow): MarcoCronograma {
  return { data: row.data_label, marco: row.marco };
}

export function marcoToMilestoneInsert(
  m: MarcoCronograma,
  projectId: string,
  ordem: number
): MilestoneInsert {
  return { project_id: projectId, ordem, data_label: m.data, marco: m.marco };
}
