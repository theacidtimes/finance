import { createClient } from "@/lib/supabase/server";
import { listClientes } from "@/lib/supabase/queries";
import { ClientesBentos } from "@/components/ClientesBentos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: userData }, clientes] = await Promise.all([
    supabase.auth.getUser(),
    listClientes(supabase),
  ]);
  return <ClientesBentos clientes={clientes} userEmail={userData.user?.email ?? ""} />;
}
