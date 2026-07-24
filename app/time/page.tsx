import { createClient } from "@/lib/supabase/server";
import { listTeam } from "@/lib/supabase/queries";
import { TimeLista } from "@/components/TimeLista";

export const dynamic = "force-dynamic";

export default async function TimePage() {
  const supabase = await createClient();
  const [{ data: userData }, membros] = await Promise.all([
    supabase.auth.getUser(),
    listTeam(supabase),
  ]);
  return <TimeLista membros={membros} userEmail={userData.user?.email ?? ""} />;
}
