import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamMember } from "@/lib/supabase/queries";
import { MembroEditor } from "@/components/MembroEditor";

export const dynamic = "force-dynamic";

export default async function MembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: userData }, membro] = await Promise.all([
    supabase.auth.getUser(),
    getTeamMember(supabase, id).catch(() => null),
  ]);
  if (!membro) notFound();
  return <MembroEditor initial={membro} userEmail={userData.user?.email ?? ""} />;
}
