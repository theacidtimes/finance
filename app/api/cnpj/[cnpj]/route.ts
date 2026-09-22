import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consultarReceita } from "@/lib/cnpj";

export const dynamic = "force-dynamic";

/**
 * São Paulo. As duas fontes são brasileiras e limitam por IP de origem — o
 * padrão da Vercel (Washington) é justamente de onde chega mais tráfego
 * automatizado, e é o que estava sendo recusado. Vale só para esta rota: as
 * demais continuam perto do banco, em us-west.
 */
export const preferredRegion = "gru1";

/** Consulta de CNPJ para a equipe (ver `lib/cnpj.ts`). */
export async function GET(_req: Request, ctx: { params: Promise<{ cnpj: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { cnpj } = await ctx.params;
  const r = await consultarReceita(cnpj);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ receita: r.receita });
}
