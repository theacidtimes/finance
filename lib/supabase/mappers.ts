import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  CategoriaExterna,
  StatusCustoExterno,
  TipoProjeto,
  TeamMember,
  TipoContrato,
  Encargo,
  TeamAnexo,
  Cliente,
  Friend,
  TipoFriend,
  TipoConta,
  DadosReceita,
  MoedaProposta,
  OpcaoComercial,
} from "@/types";
import type { Database } from "./database.types";
import { BLOCOS_PADRAO } from "@/data/blocos";
import { normalizaStatusProjeto } from "@/data/constants";
import { MOEDAS } from "@/lib/moeda";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ExternalRow = Database["public"]["Tables"]["external_costs"]["Row"];
type ExternalInsert = Database["public"]["Tables"]["external_costs"]["Insert"];
type StaffRow = Database["public"]["Tables"]["internal_staff"]["Row"];
type StaffInsert = Database["public"]["Tables"]["internal_staff"]["Insert"];
type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type MilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];
type OptionRow = Database["public"]["Tables"]["proposal_options"]["Row"];
type OptionInsert = Database["public"]["Tables"]["proposal_options"]["Insert"];
type TeamRow = Database["public"]["Tables"]["team_members"]["Row"];
type TeamInsert = Database["public"]["Tables"]["team_members"]["Insert"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type FriendRow = Database["public"]["Tables"]["friends"]["Row"];
type FriendInsert = Database["public"]["Tables"]["friends"]["Insert"];

const num = (v: number | null | undefined) => Number(v ?? 0);

export function projectRowToProjeto(row: ProjectRow): Projeto {
  return {
    id: row.id,
    cliente: row.cliente,
    clienteId: row.client_id ?? null,
    marca: row.marca ?? "",
    contato: row.contato ?? "",
    projeto: row.projeto,
    numeroServico: row.numero_servico,
    tipo: (row.tipo as TipoProjeto) ?? "Filme",
    responsavel: row.responsavel ?? "",
    data: row.data ?? "",
    status: normalizaStatusProjeto(row.status),
    valorBruto: num(row.valor_bruto),
    impostosPct: num(row.impostos_pct),
    comissaoPct: num(row.comissao_pct),
    overheadPct: num(row.overhead_pct),
    prazo: row.prazo ?? "",
    condicaoPagamento: row.condicao_pagamento ?? "",
    validadeProposta: row.validade_proposta ?? "15 dias",
    observacoes: row.observacoes ?? "",
    titulo: row.titulo ?? "",
    roteiroUrl: row.roteiro_url ?? "",
    roteiroLabel: row.roteiro_label ?? "",
    // Linhas gravadas antes da proposta internacional não têm as colunas —
    // caem no padrão da ACID: português, em real.
    idiomaProposta: row.idioma_proposta === "en" ? "en" : "pt",
    moeda: (MOEDAS as readonly string[]).includes(row.moeda) ? (row.moeda as MoedaProposta) : "BRL",
    valorMoeda: num(row.valor_moeda),
    cambio: num(row.cambio),
    cambioData: row.cambio_data ?? "",
    custoCambioPct: num(row.custo_cambio_pct),
    semClausulaIA: Boolean(row.sem_clausula_ia),
  };
}

export function projetoToProjectInsert(proj: Projeto): ProjectInsert {
  return {
    cliente: proj.cliente,
    client_id: proj.clienteId ?? null,
    marca: proj.marca ?? "",
    contato: proj.contato ?? "",
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
    roteiro_url: proj.roteiroUrl ?? "",
    roteiro_label: proj.roteiroLabel ?? "",
    idioma_proposta: proj.idiomaProposta ?? "pt",
    moeda: proj.moeda ?? "BRL",
    valor_moeda: proj.valorMoeda ?? 0,
    cambio: proj.cambio ?? 0,
    cambio_data: proj.cambioData ?? "",
    custo_cambio_pct: proj.custoCambioPct ?? 1.88,
    sem_clausula_ia: Boolean(proj.semClausulaIA),
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
    friendId: row.friend_id ?? null,
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
    friend_id: c.friendId ?? null,
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
    teamMemberId: row.team_member_id ?? null,
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
    team_member_id: s.teamMemberId ?? null,
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

/* ---------------- OPÇÕES COMERCIAIS ---------------- */

export function optionRowToOpcao(row: OptionRow): OpcaoComercial {
  return {
    id: row.id,
    label: row.label ?? "",
    quantidade: num(row.quantidade),
    valorUnitario: num(row.valor_unitario),
    valorTotal: num(row.valor_total),
    escolhida: Boolean(row.escolhida),
  };
}

export function opcaoToOptionInsert(
  o: OpcaoComercial,
  projectId: string,
  ordem: number
): OptionInsert {
  return {
    project_id: projectId,
    ordem,
    label: o.label,
    quantidade: o.quantidade,
    valor_unitario: o.valorUnitario,
    valor_total: o.valorTotal,
    escolhida: o.escolhida,
  };
}

/* ---------------- TIME / FUNCIONÁRIOS ---------------- */

export function teamRowToMember(row: TeamRow): TeamMember {
  const encargos = Array.isArray(row.encargos) ? (row.encargos as unknown as Encargo[]) : [];
  const anexos = Array.isArray(row.anexos) ? (row.anexos as unknown as TeamAnexo[]) : [];
  return {
    id: row.id,
    nome: row.nome,
    funcao: row.funcao ?? "",
    tipoContrato: (row.tipo_contrato as TipoContrato) ?? "CLT",
    ativo: row.ativo,
    salarioMensal: num(row.salario_mensal),
    baseHorasMes: num(row.base_horas_mes),
    encargos,
    beneficiosMensais: num(row.beneficios_mensais),
    cpfCnpj: row.cpf_cnpj ?? "",
    razaoSocial: row.razao_social ?? "",
    email: row.email ?? "",
    telefone: row.telefone ?? "",
    pix: row.pix ?? "",
    endereco: row.endereco ?? "",
    dataAdmissao: row.data_admissao ?? "",
    observacoes: row.observacoes ?? "",
    anexos,
  };
}

export function memberToTeamInsert(m: Omit<TeamMember, "id">): TeamInsert {
  return {
    nome: m.nome,
    funcao: m.funcao,
    tipo_contrato: m.tipoContrato,
    ativo: m.ativo,
    salario_mensal: m.salarioMensal,
    base_horas_mes: m.baseHorasMes,
    encargos: m.encargos as unknown as TeamInsert["encargos"],
    beneficios_mensais: m.beneficiosMensais,
    cpf_cnpj: m.cpfCnpj,
    razao_social: m.razaoSocial,
    email: m.email,
    telefone: m.telefone,
    pix: m.pix,
    endereco: m.endereco,
    data_admissao: m.dataAdmissao || null,
    observacoes: m.observacoes,
    anexos: m.anexos as unknown as TeamInsert["anexos"],
  };
}

/* ---------------- ACID FRIENDS ---------------- */

export function friendRowToFriend(row: FriendRow): Friend {
  const categorias = Array.isArray(row.categorias)
    ? (row.categorias as unknown as CategoriaExterna[])
    : [];
  return {
    id: row.id,
    nome: row.nome ?? "",
    cnpj: row.cnpj ?? "",
    razaoSocial: row.razao_social ?? "",
    tipo: (row.tipo as TipoFriend) ?? "Empresa",
    categorias,
    ativo: row.ativo,
    contato: row.contato ?? "",
    email: row.email ?? "",
    telefone: row.telefone ?? "",
    site: row.site ?? "",
    portfolio: row.portfolio ?? "",
    observacoes: row.observacoes ?? "",
    conta: {
      bancoCodigo: row.banco_codigo ?? "",
      bancoNome: row.banco_nome ?? "",
      agencia: row.agencia ?? "",
      conta: row.conta ?? "",
      tipoConta: (row.tipo_conta as TipoConta) ?? "Corrente",
      pix: row.pix ?? "",
    },
    receita: (row.receita as unknown as DadosReceita | null) ?? null,
  };
}

export function friendToFriendInsert(f: Omit<Friend, "id">): FriendInsert {
  return {
    nome: f.nome,
    cnpj: f.cnpj,
    razao_social: f.razaoSocial,
    tipo: f.tipo,
    ativo: f.ativo,
    categorias: f.categorias as unknown as FriendInsert["categorias"],
    contato: f.contato,
    email: f.email,
    telefone: f.telefone,
    site: f.site,
    portfolio: f.portfolio,
    observacoes: f.observacoes,
    banco_codigo: f.conta.bancoCodigo,
    banco_nome: f.conta.bancoNome,
    agencia: f.conta.agencia,
    conta: f.conta.conta,
    tipo_conta: f.conta.tipoConta,
    pix: f.conta.pix,
    receita: f.receita as unknown as FriendInsert["receita"],
  };
}

/* ---------------- CLIENTES ---------------- */

export function clientRowToCliente(row: ClientRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    contato: row.contato ?? "",
    email: row.email ?? "",
    telefone: row.telefone ?? "",
    observacoes: row.observacoes ?? "",
  };
}

export function clienteToClientInsert(c: Omit<Cliente, "id">): ClientInsert {
  return {
    nome: c.nome,
    contato: c.contato,
    email: c.email,
    telefone: c.telefone,
    observacoes: c.observacoes,
  };
}
