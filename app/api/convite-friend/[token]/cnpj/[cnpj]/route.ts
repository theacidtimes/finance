import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultarReceita } from "@/lib/cnpj";
import { conviteAberto } from "@/lib/friends";

export const dynamic = "force-dynamic";
export const preferredRegion = "gru1";

/**
 * Botão "Buscar" do formulário de autocadastro — preenche a razão social para
 * o Friend não digitar. Só responde a quem tem um link aberto: sem isso, a
 * rota viraria um proxy público de consulta de CNPJ da ACID.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string; cnpj: string }> }
) {
  const { token, cnpj } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  const { data: convite } = await createAdminClient()
    .from("friend_invites")
    .select("status, expira_em")
    .eq("token", token)
    .maybeSingle();
  if (!convite || !conviteAberto({ status: convite.status, expiraEm: convite.expira_em })) {
    return NextResponse.json({ error: "Link expirado." }, { status: 410 });
  }

  const r = await consultarReceita(cnpj);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  // Só o que o formulário usa — situação e CNAE ficam para a equipe ver.
  return NextResponse.json({
    razaoSocial: r.receita.razaoSocial,
    nomeFantasia: r.receita.nomeFantasia,
  });
}
