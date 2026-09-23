import { createClient } from "@/lib/supabase/server";
import { listFriendsResumo, listConvites } from "@/lib/supabase/queries";
import { FriendsBentos } from "@/components/FriendsBentos";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await createClient();
  const [{ data: userData }, friends, convites] = await Promise.all([
    supabase.auth.getUser(),
    listFriendsResumo(supabase),
    // Sem a tabela de convites (migração não aplicada), a lista continua de pé.
    listConvites(supabase).catch(() => []),
  ]);
  return (
    <FriendsBentos friends={friends} convites={convites} userEmail={userData.user?.email ?? ""} />
  );
}
