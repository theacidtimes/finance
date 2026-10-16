import { redirect } from "next/navigation";
import { getMeuPerfil, type DB } from "@/lib/supabase/queries";
import type { Perfil } from "@/types";

/**
 * Página de equipe (master/gestor). O GP cai na lista de projetos.
 *
 * É conveniência, não segurança: o banco já devolve vazio para o perfil
 * produção. Isto só evita que ele veja uma tela quebrada.
 */
export async function exigirEquipe(db: DB): Promise<Perfil> {
  const perfil = await getMeuPerfil(db);
  if (!perfil) redirect("/login");
  if (perfil.role === "producao") redirect("/");
  return perfil;
}

/** Para rotas de API: true se o chamador é master ou gestor. */
export async function ehEquipe(db: DB): Promise<boolean> {
  const perfil = await getMeuPerfil(db);
  return perfil?.role === "master" || perfil?.role === "gestor";
}
