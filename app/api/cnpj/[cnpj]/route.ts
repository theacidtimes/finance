import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DadosReceita } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Consulta de CNPJ na BrasilAPI (dados públicos da Receita).
 *
 * Roda no servidor de propósito: mantém o browser fora de um terceiro e
 * permite filtrar o retorno. A BrasilAPI devolve o quadro societário completo,
 * com CPF parcial e faixa etária dos sócios — nada disso é gravado ou
 * devolvido daqui; só o que o cadastro do Friend realmente usa.
 */
type RespostaBrasilAPI = {
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number | string;
  data_inicio_atividade?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  porte?: string;
  municipio?: string;
  uf?: string;
};

export async function GET(_req: Request, ctx: { params: Promise<{ cnpj: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { cnpj: bruto } = await ctx.params;
  const cnpj = (bruto ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ precisa ter 14 dígitos." }, { status: 400 });
  }

  let resp: Response;
  try {
    resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Serviço de consulta indisponível. Preencha à mão." },
      { status: 503 }
    );
  }

  if (resp.status === 404) {
    return NextResponse.json({ error: "CNPJ não encontrado na Receita." }, { status: 404 });
  }
  if (!resp.ok) {
    return NextResponse.json(
      { error: "Não foi possível consultar o CNPJ agora." },
      { status: 502 }
    );
  }

  const d = (await resp.json()) as RespostaBrasilAPI;
  const cnae = [d.cnae_fiscal, d.cnae_fiscal_descricao].filter(Boolean).join(" — ");

  const receita: DadosReceita = {
    razaoSocial: d.razao_social ?? "",
    nomeFantasia: d.nome_fantasia ?? "",
    situacao: String(d.descricao_situacao_cadastral ?? d.situacao_cadastral ?? "").toUpperCase(),
    dataAbertura: d.data_inicio_atividade ?? "",
    cnaePrincipal: cnae,
    porte: d.porte ?? "",
    municipio: d.municipio ?? "",
    uf: d.uf ?? "",
    consultadoEm: new Date().toISOString(),
  };

  return NextResponse.json({ receita });
}
