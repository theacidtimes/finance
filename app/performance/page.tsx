import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMeuPerfil, listPerformanceDados } from "@/lib/supabase/queries";
import { Performance } from "@/components/Performance";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const supabase = await createClient();
  const perfil = await getMeuPerfil(supabase);
  if (!perfil) redirect("/login");
  // Expõe salários, margens e bônus — só master.
  if (perfil.role !== "master") redirect("/");

  const { projetos, time } = await listPerformanceDados(supabase);
  return <Performance projetos={projetos} time={time} userEmail={perfil.email} />;
}
