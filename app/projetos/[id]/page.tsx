import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/supabase/queries";
import { ProjetoWorkspace } from "@/components/ProjetoWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: userData }, projeto] = await Promise.all([
    supabase.auth.getUser(),
    getProject(supabase, id).catch(() => null),
  ]);
  if (!projeto) notFound();
  return <ProjetoWorkspace initial={projeto} userEmail={userData.user?.email ?? ""} />;
}
