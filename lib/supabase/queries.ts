import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
  BlocosProposta,
  TeamMember,
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
} from "./mappers";

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
