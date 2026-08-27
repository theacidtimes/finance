import type { MoedaProposta, IdiomaProposta, Projeto } from "@/types";

/**
 * Moeda da proposta — fonte única do que o cliente vê como preço.
 *
 * A regra que sustenta este módulo: **a moeda é do documento, não do DRE.**
 * O sistema inteiro (carteira, dashboard, performance, DRE) soma em real, e
 * custos de staff e de fornecedor são lançados em real. Se `valorBruto`
 * virasse euro, um projeto de €50.000 entraria nas somas como 50.000 ao lado
 * de valores em R$ — sem erro visível, só número errado.
 *
 * Então o projeto em moeda estrangeira guarda três coisas: o valor que o
 * cliente lê (`valorMoeda`), a taxa travada na data da proposta (`cambio`) e o
 * `valorBruto` em real, que é o produto dos dois e continua sendo o único
 * número que a apuração enxerga.
 */

export const MOEDAS: readonly MoedaProposta[] = ["BRL", "EUR", "GBP", "USD"];

export const SIMBOLO: Record<MoedaProposta, string> = {
  BRL: "R$",
  EUR: "€",
  GBP: "£",
  USD: "US$",
};

/** Nome da moeda por extenso, para a nota de rodapé do investimento. */
const NOME: Record<MoedaProposta, { pt: string; en: string }> = {
  BRL: { pt: "reais", en: "Brazilian reais" },
  EUR: { pt: "euros", en: "euros" },
  GBP: { pt: "libras esterlinas", en: "pounds sterling" },
  USD: { pt: "dólares americanos", en: "US dollars" },
};

export function nomeMoeda(moeda: MoedaProposta, idioma: IdiomaProposta): string {
  return NOME[moeda][idioma];
}

export function moedaDe(proj: Pick<Projeto, "moeda">): MoedaProposta {
  const m = proj.moeda;
  return m && MOEDAS.includes(m) ? m : "BRL";
}

export function idiomaDe(proj: Pick<Projeto, "idiomaProposta">): IdiomaProposta {
  return proj.idiomaProposta === "en" ? "en" : "pt";
}

/** Projeto cobrado fora do Brasil — muda o documento, não a apuração. */
export function propostaInternacional(proj: Pick<Projeto, "moeda">): boolean {
  return moedaDe(proj) !== "BRL";
}

/**
 * Locale de formatação.
 *
 * Segue o IDIOMA, não a moeda: numa proposta em inglês "€50,000" com vírgula
 * de milhar é o que o leitor espera; a mesma cifra escrita "€ 50.000" parece
 * cinquenta euros para quem lê em inglês. Em português, tudo em pt-BR.
 */
function localeDe(idioma: IdiomaProposta, moeda: MoedaProposta): string {
  if (idioma === "pt") return "pt-BR";
  return moeda === "GBP" ? "en-GB" : "en-US";
}

/**
 * Preço formatado na moeda da proposta.
 * `casas = 0` é o padrão do documento comercial: centavo em proposta é ruído.
 */
export function formatMoeda(
  valor: number,
  moeda: MoedaProposta = "BRL",
  { idioma = "pt", casas = 0 }: { idioma?: IdiomaProposta; casas?: number } = {}
): string {
  const v = Number.isFinite(valor) ? valor : 0;
  return new Intl.NumberFormat(localeDe(idioma, moeda), {
    style: "currency",
    currency: moeda,
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(v);
}

/**
 * O que sai na caixa de investimento: o valor na moeda do cliente.
 * Em BRL é o próprio `valorBruto` — nada muda para os projetos de hoje.
 */
export function valorProposta(proj: Projeto): number {
  return propostaInternacional(proj) ? Number(proj.valorMoeda ?? 0) : Number(proj.valorBruto ?? 0);
}

/**
 * Converte para real o valor da proposta.
 *
 * Câmbio ausente ou zerado devolve `null` em vez de 0: zero silenciaria o DRE
 * inteiro (lucro operacional negativo, margem −∞) por causa de um campo que a
 * pessoa ainda não preencheu. `null` deixa o `valorBruto` anterior de pé e a
 * tela pede o câmbio.
 */
export function brlDaProposta(
  valorMoeda: number | undefined,
  cambio: number | undefined
): number | null {
  const taxa = Number(cambio ?? 0);
  if (!Number.isFinite(taxa) || taxa <= 0) return null;
  const v = Number(valorMoeda ?? 0);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * taxa * 100) / 100;
}

/** Câmbio pendente: moeda estrangeira escolhida e taxa ainda não informada. */
export function cambioPendente(proj: Projeto): boolean {
  return propostaInternacional(proj) && !(Number(proj.cambio ?? 0) > 0);
}

/* ============================================================
 * Custo de câmbio — o que a operação come antes do dinheiro chegar
 * ========================================================== */

/**
 * Custo padrão de receber do exterior, em % sobre o câmbio comercial.
 *
 * Spread bancário 0,78% + IOF 1,10% = 1,88%, números informados pela ACID.
 * São editáveis por projeto: spread varia por banco e por volume, e o IOF muda
 * por decreto — cravar 1,88 no código faria o sistema mentir no dia seguinte a
 * uma mudança de alíquota.
 *
 * Isto NÃO é imposto sobre a receita: é despesa financeira da operação. Por
 * isso não entra em `impostosPct` (que continua sendo o Simples sobre o
 * faturamento) nem reduz o `valorBruto` — a nota é emitida pelo valor cheio.
 * Entra no DRE como custo, via `lancarCustoCambio` na store.
 */
export const CUSTO_CAMBIO_PADRAO = 1.88;

export function custoCambioPctDe(proj: Pick<Projeto, "custoCambioPct">): number {
  const p = Number(proj.custoCambioPct);
  return Number.isFinite(p) && p >= 0 ? p : CUSTO_CAMBIO_PADRAO;
}

/** Quanto some entre o câmbio comercial e o que cai na conta, em reais. */
export function custoCambio(valorBRL: number, pct: number): number {
  const v = Number.isFinite(valorBRL) ? valorBRL : 0;
  const p = Number.isFinite(pct) ? pct : 0;
  return Math.round(v * (p / 100) * 100) / 100;
}

/** O que efetivamente entra na conta, depois de spread e IOF. */
export function liquidoNaConta(valorBRL: number, pct: number): number {
  const v = Number.isFinite(valorBRL) ? valorBRL : 0;
  return Math.round((v - custoCambio(v, pct)) * 100) / 100;
}

/** Nome da linha de custo lançada no DRE. É por ele que a linha é reconhecida. */
export const LINHA_CUSTO_CAMBIO = "IOF + spread cambial";
