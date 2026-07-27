import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  TeamMember,
  Cliente,
  ClienteResumo,
  Perfil,
  Permissions,
  Role,
} from "@/types";
import {
  projectRowToProjeto,
  projetoToProjectInsert,
  blocosFromRow,
  externalRowToCusto,
  custoToExternalInsert,
  staffRowToInterno,
  internoToStaffInsert,
  milestoneRowToMarco,
  marcoToMilestoneInsert,
  teamRowToMember,
  memberToTeamInsert,
  clientRowToCliente,
  clienteToClientInsert,
} from "./mappers";
import type { ProjetoBruto } from "@/lib/performance";

export type DB = SupabaseClient<Database>;

export interface ProjetoResumo {
  id: string;
  cliente: string;
  projeto: string;
  numeroServico: string;
  tipo: string;
  responsavel: string;
  data: string;
  status: string;
  valorBruto: number;
  updatedAt: string;
}

export interface ProjetoCompleto {
  id: string;
  proj: Projeto;
  externos: CustoExterno[];
  internos: StaffInterno[];
  cronograma: MarcoCronograma[];
  blocos: BlocosProposta;
}

export async function listProjects(db: DB): Promise<ProjetoResumo[]> {
  const { data, error } = await db
    .from("projects")
    .select(
      "id, cliente, projeto, numero_servico, tipo, responsavel, data, status, valor_bruto, updated_at"
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    cliente: r.cliente,
    projeto: r.projeto,
    numeroServico: r.numero_servico,
    tipo: r.tipo,
    responsavel: r.responsavel ?? "",
    data: r.data ?? "",
    status: r.status ?? "Orçamento",
    valorBruto: Number(r.valor_bruto ?? 0),
    updatedAt: r.updated_at,
  }));
}

export async function listProjectsByClient(db: DB, clientId: string): Promise<ProjetoResumo[]> {
  const { data, error } = await db
    .from("projects")
    .select(
      "id, cliente, projeto, numero_servico, tipo, responsavel, data, status, valor_bruto, updated_at"
    )
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    cliente: r.cliente,
    projeto: r.projeto,
    numeroServico: r.numero_servico,
    tipo: r.tipo,
    responsavel: r.responsavel ?? "",
    data: r.data ?? "",
    status: r.status ?? "Orçamento",
    valorBruto: Number(r.valor_bruto ?? 0),
    updatedAt: r.updated_at,
  }));
}

export async function getProject(db: DB, id: string): Promise<ProjetoCompleto> {
  const { data: row, error } = await db.from("projects").select("*").eq("id", id).single();
  if (error) throw error;

  const [ext, staff, mile] = await Promise.all([
    db.from("external_costs").select("*").eq("project_id", id).order("ordem"),
    db.from("internal_staff").select("*").eq("project_id", id).order("ordem"),
    db.from("milestones").select("*").eq("project_id", id).order("ordem"),
  ]);
  if (ext.error) throw ext.error;
  if (staff.error) throw staff.error;
  if (mile.error) throw mile.error;

  return {
    id: row.id,
    proj: projectRowToProjeto(row),
    externos: (ext.data ?? []).map(externalRowToCusto),
    internos: (staff.data ?? []).map(staffRowToInterno),
    cronograma: (mile.data ?? []).map(milestoneRowToMarco),
    blocos: blocosFromRow(row),
  };
}

export async function createProject(
  db: DB,
  proj: Projeto,
  blocos: BlocosProposta
): Promise<string> {
  const { data: user } = await db.auth.getUser();
  const insert = {
    ...projetoToProjectInsert(proj),
    blocos: blocos as unknown as Database["public"]["Tables"]["projects"]["Insert"]["blocos"],
    created_by: user.user?.id ?? null,
  };
  const { data, error } = await db.from("projects").insert(insert).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function saveProject(db: DB, state: ProjetoCompleto): Promise<void> {
  const { id } = state;
  const update = {
    ...projetoToProjectInsert(state.proj),
    blocos: state.blocos as unknown as Database["public"]["Tables"]["projects"]["Update"]["blocos"],
  };
  const { error } = await db.from("projects").update(update).eq("id", id);
  if (error) throw error;

  // replace child rows atomically-ish (delete then reinsert)
  await Promise.all([
    db.from("external_costs").delete().eq("project_id", id),
    db.from("internal_staff").delete().eq("project_id", id),
    db.from("milestones").delete().eq("project_id", id),
  ]);

  const extRows = state.externos.map((c, i) => custoToExternalInsert(c, id, i));
  const staffRows = state.internos.map((s, i) => internoToStaffInsert(s, id, i));
  const mileRows = state.cronograma.map((m, i) => marcoToMilestoneInsert(m, id, i));

  const results = await Promise.all([
    extRows.length ? db.from("external_costs").insert(extRows) : Promise.resolve({ error: null }),
    staffRows.length ? db.from("internal_staff").insert(staffRows) : Promise.resolve({ error: null }),
    mileRows.length ? db.from("milestones").insert(mileRows) : Promise.resolve({ error: null }),
  ]);
  for (const r of results) if (r.error) throw r.error;
}

export async function deleteProject(db: DB, id: string): Promise<void> {
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProject(db: DB, id: string): Promise<string> {
  const full = await getProject(db, id);
  const proj: Projeto = {
    ...full.proj,
    projeto: `${full.proj.projeto} (cópia)`,
    numeroServico: `${full.proj.numeroServico}-copia`,
    status: "Orçamento",
  };
  const newId = await createProject(db, proj, full.blocos);
  await saveProject(db, { ...full, id: newId, proj });
  return newId;
}

/* ================= TIME / FUNCIONÁRIOS ================= */

export async function listTeam(db: DB): Promise<TeamMember[]> {
  const { data, error } = await db
    .from("team_members")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(teamRowToMember);
}

export async function getTeamMember(db: DB, id: string): Promise<TeamMember> {
  const { data, error } = await db.from("team_members").select("*").eq("id", id).single();
  if (error) throw error;
  return teamRowToMember(data);
}

export async function createTeamMember(
  db: DB,
  member: Omit<TeamMember, "id">
): Promise<string> {
  const { data: user } = await db.auth.getUser();
  const insert = { ...memberToTeamInsert(member), created_by: user.user?.id ?? null };
  const { data, error } = await db.from("team_members").insert(insert).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateTeamMember(db: DB, member: TeamMember): Promise<void> {
  const { id, ...rest } = member;
  const { error } = await db.from("team_members").update(memberToTeamInsert(rest)).eq("id", id);
  if (error) throw error;
}

export async function deleteTeamMember(db: DB, id: string): Promise<void> {
  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) throw error;
}

/* ================= CLIENTES ================= */

export async function listClientes(db: DB): Promise<ClienteResumo[]> {
  const [clientsRes, projRes] = await Promise.all([
    db.from("clients").select("*").order("nome", { ascending: true }),
    db.from("projects").select("client_id, valor_bruto, updated_at"),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (projRes.error) throw projRes.error;

  const agg = new Map<string, { n: number; total: number; ultima: string }>();
  for (const p of projRes.data ?? []) {
    if (!p.client_id) continue;
    const cur = agg.get(p.client_id) ?? { n: 0, total: 0, ultima: "" };
    cur.n += 1;
    cur.total += Number(p.valor_bruto ?? 0);
    if (p.updated_at && p.updated_at > cur.ultima) cur.ultima = p.updated_at;
    agg.set(p.client_id, cur);
  }

  return (clientsRes.data ?? []).map((row) => {
    const c = clientRowToCliente(row);
    const a = agg.get(c.id) ?? { n: 0, total: 0, ultima: "" };
    return { ...c, nProjetos: a.n, totalBruto: a.total, ultimaAtualizacao: a.ultima };
  });
}

export async function getCliente(db: DB, id: string): Promise<Cliente> {
  const { data, error } = await db.from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return clientRowToCliente(data);
}

export async function createCliente(db: DB, cliente: Omit<Cliente, "id">): Promise<string> {
  const { data: user } = await db.auth.getUser();
  const insert = { ...clienteToClientInsert(cliente), created_by: user.user?.id ?? null };
  const { data, error } = await db.from("clients").insert(insert).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateCliente(db: DB, cliente: Cliente): Promise<void> {
  const { id, ...rest } = cliente;
  const update = clienteToClientInsert(rest);
  const { error } = await db.from("clients").update(update).eq("id", id);
  if (error) throw error;
  // mantém o texto denormalizado `cliente` dos projetos em sincronia com o nome
  await db.from("projects").update({ cliente: cliente.nome }).eq("client_id", id);
}

export async function deleteCliente(db: DB, id: string): Promise<void> {
  const { error } = await db.from("clients").delete().eq("id", id);
  if (error) throw error;
}

/* ================= PERFORMANCE ================= */

/**
 * Carrega tudo que a tela de performance precisa em 4 queries (não N+1):
 * projetos + seus custos externos + seu staff, mais o cadastro de time.
 * O agrupamento e a matemática ficam em lib/performance.ts.
 */
export async function listPerformanceDados(db: DB): Promise<{
  projetos: ProjetoBruto[];
  time: TeamMember[];
}> {
  const [projRes, extRes, staffRes, timeRes] = await Promise.all([
    db
      .from("projects")
      .select(
        "id, cliente, projeto, numero_servico, tipo, responsavel, data, status, valor_bruto, impostos_pct, comissao_pct, overhead_pct"
      )
      .order("data", { ascending: false }),
    db.from("external_costs").select("project_id, valor"),
    db.from("internal_staff").select("*").order("ordem"),
    db.from("team_members").select("*"),
  ]);
  if (projRes.error) throw projRes.error;
  if (extRes.error) throw extRes.error;
  if (staffRes.error) throw staffRes.error;
  if (timeRes.error) throw timeRes.error;

  const extPorProjeto = new Map<string, { valor: number }[]>();
  for (const e of extRes.data ?? []) {
    if (!e.project_id) continue;
    const arr = extPorProjeto.get(e.project_id) ?? [];
    arr.push({ valor: Number(e.valor ?? 0) });
    extPorProjeto.set(e.project_id, arr);
  }

  const staffPorProjeto = new Map<string, StaffInterno[]>();
  for (const s of staffRes.data ?? []) {
    if (!s.project_id) continue;
    const arr = staffPorProjeto.get(s.project_id) ?? [];
    arr.push(staffRowToInterno(s));
    staffPorProjeto.set(s.project_id, arr);
  }

  const projetos: ProjetoBruto[] = (projRes.data ?? []).map((r) => ({
    proj: {
      id: r.id,
      cliente: r.cliente,
      projeto: r.projeto,
      numeroServico: r.numero_servico,
      tipo: (r.tipo as Projeto["tipo"]) ?? "Filme",
      responsavel: r.responsavel ?? "",
      data: r.data ?? "",
      status: r.status ?? "Orçamento",
      valorBruto: Number(r.valor_bruto ?? 0),
      impostosPct: Number(r.impostos_pct ?? 0),
      comissaoPct: Number(r.comissao_pct ?? 0),
      overheadPct: Number(r.overhead_pct ?? 0),
      // campos não usados pelo DRE — preenchidos para satisfazer o tipo
      prazo: "",
      condicaoPagamento: "",
      validadeProposta: "",
      observacoes: "",
      titulo: "",
    },
    externos: extPorProjeto.get(r.id) ?? [],
    internos: staffPorProjeto.get(r.id) ?? [],
  }));

  return { projetos, time: (timeRes.data ?? []).map(teamRowToMember) };
}

// ---------- PERFIS / USUÁRIOS ----------

const PROFILE_COLS = "id,email,nome,role,permissions";

type ProfileRow = {
  id: string;
  email: string;
  nome: string;
  role: string;
  permissions: unknown;
};

function profileRowToPerfil(row: ProfileRow): Perfil {
  return {
    id: row.id,
    email: row.email ?? "",
    nome: row.nome ?? "",
    role: (row.role === "master" ? "master" : "gestor") as Role,
    permissions: (row.permissions ?? {}) as Permissions,
  };
}

/** Perfil do usuário logado (ou null se não autenticado / sem perfil) */
export async function getMeuPerfil(db: DB): Promise<Perfil | null> {
  const { data: u } = await db.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", u.user.id)
    .single();
  if (error || !data) return null;
  return profileRowToPerfil(data as ProfileRow);
}

/** Lista todos os perfis (apenas master consegue usar de forma útil na UI) */
export async function listProfiles(db: DB): Promise<Perfil[]> {
  const { data, error } = await db
    .from("profiles")
    .select(PROFILE_COLS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => profileRowToPerfil(r as ProfileRow));
}

/** Atualiza nome/papel/permissões de um perfil (RLS: só master) */
export async function updateProfile(
  db: DB,
  id: string,
  patch: { nome?: string; role?: Role; permissions?: Permissions }
): Promise<void> {
  const { error } = await db
    .from("profiles")
    .update(patch as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", id);
  if (error) throw error;
}
