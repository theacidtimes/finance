import { createClient } from "@/lib/supabase/server";
import { listFriendsResumo } from "@/lib/supabase/queries";
import { FriendsBentos } from "@/components/FriendsBentos";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await createClient();
  const [{ data: userData }, friends] = await Promise.all([
    supabase.auth.getUser(),
    listFriendsResumo(supabase),
  ]);
  return <FriendsBentos friends={friends} userEmail={userData.user?.email ?? ""} />;
}
