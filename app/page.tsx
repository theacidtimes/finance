import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuPerfil, listClientes, listProjetosCrono } from "@/lib/supabase/queries";
import { ClientesBentos } from "@/components/ClientesBentos";
import { ProducaoHome } from "@/components/ProducaoHome";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const perfil = await getMeuPerfil(supabase);
  if (!perfil) redirect("/login");
  // O GP não vê carteira nem cliente: entra direto na lista de projetos.
  if (perfil.role === "producao") {
    const projetos = await listProjetosCrono(supabase);
    return <ProducaoHome projetos={projetos} userEmail={perfil.email} />;
  }
  const clientes = await listClientes(supabase);
  return <ClientesBentos clientes={clientes} userEmail={perfil.email} />;
}
