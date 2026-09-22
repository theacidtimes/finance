import type { DadosReceita } from "@/types";

/**
 * Consulta de CNPJ em fontes públicas da Receita (BrasilAPI, com Minha Receita
 * como reserva — mesmos nomes de campo nas duas).
 *
 * Roda só no servidor: mantém o browser fora de um terceiro e permite filtrar
 * o retorno. As duas devolvem o quadro societário completo, com CPF parcial e
 * faixa etária dos sócios — nada disso é gravado ou devolvido daqui; só o que
 * o cadastro do Friend realmente usa.
 *
 * Usada pela equipe (/api/cnpj) e pelo formulário de autocadastro, que não tem
 * login (/api/convite-friend/[token]/cnpj). As rotas cuidam de quem pode
 * perguntar; aqui é só a consulta.
 */
type RespostaCNPJ = {
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

export type ResultadoCNPJ =
  | { ok: true; receita: DadosReceita }
  | { ok: false; status: number; error: string };

export async function consultarReceita(bruto: string): Promise<ResultadoCNPJ> {
  const cnpj = (bruto ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return { ok: false, status: 400, error: "CNPJ precisa ter 14 dígitos." };
  }

  // Duas fontes com o mesmo formato de resposta. A BrasilAPI é a primeira, mas
  // ela limita por IP — e num IP compartilhado de serverless isso acontece sem
  // aviso. Falhou, tenta a Minha Receita antes de desistir.
  const FONTES = [
    { nome: "brasilapi", url: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}` },
    { nome: "minhareceita", url: `https://minhareceita.org/${cnpj}` },
  ];

  let d: RespostaCNPJ | null = null;
  const falhas: string[] = [];

  for (const fonte of FONTES) {
    try {
      const resp = await fetch(fonte.url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (resp.status === 404) {
        return { ok: false, status: 404, error: "CNPJ não encontrado na Receita." };
      }
      if (!resp.ok) {
        falhas.push(`${fonte.nome} HTTP ${resp.status}`);
        continue;
      }
      d = (await resp.json()) as RespostaCNPJ;
      break;
    } catch (e) {
      falhas.push(`${fonte.nome} ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  if (!d) {
    // Vai para os logs do servidor: sem isso, "não deu" na tela não diz se foi
    // limite de requisições, timeout ou a fonte fora do ar.
    console.error("[cnpj] consulta falhou", cnpj, falhas.join(" · "));
    return {
      ok: false,
      status: 502,
      error: `Consulta indisponível (${falhas.join("; ")}). Preencha à mão.`,
    };
  }
  const cnae = [d.cnae_fiscal, d.cnae_fiscal_descricao].filter(Boolean).join(" — ");

  return {
    ok: true,
    receita: {
      razaoSocial: d.razao_social ?? "",
      nomeFantasia: d.nome_fantasia ?? "",
      situacao: String(d.descricao_situacao_cadastral ?? d.situacao_cadastral ?? "").toUpperCase(),
      dataAbertura: d.data_inicio_atividade ?? "",
      cnaePrincipal: cnae,
      porte: d.porte ?? "",
      municipio: d.municipio ?? "",
      uf: d.uf ?? "",
      consultadoEm: new Date().toISOString(),
    },
  };
}
