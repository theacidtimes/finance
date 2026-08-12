import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFriend, listProjetosDoFriend } from "@/lib/supabase/queries";
import { FriendEditor } from "@/components/FriendEditor";

export const dynamic = "force-dynamic";

export default async function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: userData }, friend, projetos] = await Promise.all([
    supabase.auth.getUser(),
    getFriend(supabase, id).catch(() => null),
    listProjetosDoFriend(supabase, id).catch(() => []),
  ]);
  if (!friend) notFound();
  return (
    <FriendEditor
      initial={friend}
      projetos={projetos}
      userEmail={userData.user?.email ?? ""}
    />
  );
}
