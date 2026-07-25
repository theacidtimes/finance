import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuPerfil, listProfiles } from "@/lib/supabase/queries";
import { UsuariosAdmin } from "@/components/UsuariosAdmin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const perfil = await getMeuPerfil(supabase);
  if (!perfil) redirect("/login");
  if (perfil.role !== "master") redirect("/");

  const perfis = await listProfiles(supabase);
  return <UsuariosAdmin perfis={perfis} meuId={perfil.id} userEmail={perfil.email} />;
}
