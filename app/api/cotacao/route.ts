import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlPTAX, melhorCotacao, cotavel, type BoletimPTAX } from "@/lib/cotacao";
import { MOEDAS } from "@/lib/moeda";
import type { MoedaProposta } from "@/types";

export const dynamic = "force-dynamic";

/**
 * O BCB é fonte brasileira e limita por IP de origem — mesmo motivo da rota de
 * CNPJ. Só esta rota sai de São Paulo; as demais continuam perto do banco.
 */
export const preferredRegion = "gru1";

/**
 * Cotação PTAX do Banco Central, para preencher o câmbio de um projeto
 * cobrado em moeda estrangeira.
 *
 * Roda no servidor porque o browser não deve falar direto com um terceiro, e
 * porque assim a resposta chega filtrada — a API do BCB devolve a série toda,
 * e daqui sai um número e uma data.
 *
 * A taxa é uma SUGESTÃO: ela é gravada no projeto e congela ali. Ver
 * `lib/cotacao.ts` para por que uma taxa viva quebraria o histórico.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const bruta = (new URL(req.url).searchParams.get("moeda") ?? "").toUpperCase();
  if (!(MOEDAS as readonly string[]).includes(bruta)) {
    return NextResponse.json({ error: `Moeda inválida: ${bruta || "(vazia)"}.` }, { status: 400 });
  }
  const moeda = bruta as MoedaProposta;
  if (!cotavel(moeda)) {
    return NextResponse.json({ error: "Real não tem cotação contra si mesmo." }, { status: 400 });
  }

  try {
    const resp = await fetch(urlPTAX(moeda, new Date()), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!resp.ok) {
      console.error("[cotacao] BCB HTTP", resp.status);
      return NextResponse.json(
        { error: `Banco Central indisponível (HTTP ${resp.status}). Informe a taxa à mão.` },
        { status: 502 }
      );
    }

    const json = (await resp.json()) as { value?: BoletimPTAX[] };
    const cotacao = melhorCotacao(json.value ?? []);
    if (!cotacao) {
      return NextResponse.json(
        { error: "Sem boletim de câmbio no período. Informe a taxa à mão." },
        { status: 404 }
      );
    }
    return NextResponse.json({ cotacao });
  } catch (e) {
    // Vai para os logs: "não deu" na tela não distingue timeout de fonte fora.
    console.error("[cotacao] falhou", moeda, e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Não foi possível consultar o Banco Central. Informe a taxa à mão." },
      { status: 502 }
    );
  }
}
