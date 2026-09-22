import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultarReceita } from "@/lib/cnpj";
import { conviteAberto, limparAutocadastro } from "@/lib/friends";

export const dynamic = "force-dynamic";
// A consulta à Receita no envio sai do Brasil — ver /api/cnpj.
export const preferredRegion = "gru1";

/**
 * Envio do autocadastro. Rota pública (sem login): o token do link é a única
 * credencial, então ela só grava no convite desse token, só enquanto ele está
 * aberto, e só o que `limparAutocadastro` deixa passar. Nada vai direto para
 * `friends` — a equipe revisa e aprova.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  const db = createAdminClient();
  const { data: convite, error } = await db
    .from("friend_invites")
    .select("id, status, expira_em")
    .eq("token", token)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Falha ao ler o convite." }, { status: 500 });
  if (!convite || !conviteAberto({ status: convite.status, expiraEm: convite.expira_em })) {
    return NextResponse.json(
      { error: "Este link expirou ou já foi usado. Peça um novo à ACID." },
      { status: 410 }
    );
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  const { dados, erros } = limparAutocadastro(corpo);
  if (erros.length) return NextResponse.json({ error: erros.join(" ") }, { status: 422 });

  // Retrato da Receita feito aqui, e não aceito do navegador: é o dado que a
  // equipe usa para decidir, então não pode vir de quem está sendo avaliado.
  // Se a consulta falhar, o envio segue — a equipe reconsulta depois.
  const r = await consultarReceita(dados.cnpj);

  const { error: errUp } = await db
    .from("friend_invites")
    .update({
      dados,
      receita: r.ok ? r.receita : null,
      status: "recebido",
      recebido_em: new Date().toISOString(),
    })
    .eq("id", convite.id);
  if (errUp) return NextResponse.json({ error: "Falha ao gravar." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
