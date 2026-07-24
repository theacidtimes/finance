import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCliente, listProjectsByClient } from "@/lib/supabase/queries";
import { ClienteDetalhe } from "@/components/ClienteDetalhe";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cliente = await getCliente(supabase, id).catch(() => null);
  if (!cliente) notFound();
  const [{ data: userData }, projetos] = await Promise.all([
    supabase.auth.getUser(),
    listProjectsByClient(supabase, id),
  ]);
  return (
    <ClienteDetalhe
      cliente={cliente}
      projetos={projetos}
      userEmail={userData.user?.email ?? ""}
    />
  );
}
