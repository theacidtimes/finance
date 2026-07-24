import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/lib/supabase/queries";
import { ProjetosLista } from "@/components/ProjetosLista";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: userData }, projetos] = await Promise.all([
    supabase.auth.getUser(),
    listProjects(supabase),
  ]);
  return <ProjetosLista projetos={projetos} userEmail={userData.user?.email ?? ""} />;
}
