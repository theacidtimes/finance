import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuPerfil, getProject, getProjetoCrono } from "@/lib/supabase/queries";
import { ProjetoWorkspace } from "@/components/ProjetoWorkspace";
import { CronoWorkspace } from "@/components/CronoWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const perfil = await getMeuPerfil(supabase);
  if (!perfil) redirect("/login");
  if (perfil.role === "producao") {
    const projeto = await getProjetoCrono(supabase, id).catch(() => null);
    if (!projeto) notFound();
    return <CronoWorkspace initial={projeto} userEmail={perfil.email} />;
  }
  const projeto = await getProject(supabase, id).catch(() => null);
  if (!projeto) notFound();
  return <ProjetoWorkspace initial={projeto} userEmail={perfil.email} />;
}
