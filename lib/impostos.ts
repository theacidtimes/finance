/**
 * Simples Nacional — Anexo III (serviços).
 * Fonte única da verdade do cálculo de alíquota efetiva.
 *
 * Fórmula legal (LC 123/2006, art. 18 §1º):
 *   alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12
 *   DAS do mês       = receita do mês × alíquota efetiva
 *
 * RBT12 = receita bruta acumulada nos 12 meses ANTERIORES ao mês de apuração.
 * Por isso a alíquota de um mês não depende do que se fatura nele — depende do
 * histórico. Um projeto grande não encarece o próprio mês: ele empurra a
 * alíquota dos 12 meses seguintes. Ver `projecaoAliquota`.
 *
 * Este módulo NÃO substitui a apuração da contabilidade: serve para precificar
 * com uma alíquota realista em vez do 11% fixo.
 */

export interface FaixaSimples {
  /** Teto de RBT12 da faixa (inclusive). */
  ate: number;
  /** Alíquota nominal da faixa, em % (ex.: 11.2). */
  nominal: number;
  /** Parcela a deduzir, em R$. */
  deduzir: number;
}

/** Anexo III — Locação de bens móveis e prestação de serviços. */
export const ANEXO_III: FaixaSimples[] = [
  { ate: 180_000, nominal: 6.0, deduzir: 0 },
  { ate: 360_000, nominal: 11.2, deduzir: 9_360 },
  { ate: 720_000, nominal: 13.2, deduzir: 17_640 },
  { ate: 1_800_000, nominal: 16.0, deduzir: 35_640 },
  { ate: 3_600_000, nominal: 21.0, deduzir: 125_640 },
  { ate: 4_800_000, nominal: 33.0, deduzir: 648_000 },
];

/** Teto de receita anual do Simples Nacional. */
export const LIMITE_SIMPLES = 4_800_000;

export function faixaDe(rbt12: number, tabela: FaixaSimples[] = ANEXO_III): FaixaSimples {
  const r = Math.max(0, Number(rbt12) || 0);
  return tabela.find((f) => r <= f.ate) ?? tabela[tabela.length - 1];
}

/**
 * Alíquota efetiva em % para um dado RBT12.
 * RBT12 = 0 (empresa sem histórico) cai na 1ª faixa: 6%.
 */
export function aliquotaEfetiva(rbt12: number, tabela: FaixaSimples[] = ANEXO_III): number {
  const r = Math.max(0, Number(rbt12) || 0);
  const faixa = faixaDe(r, tabela);
  if (r === 0) return faixa.nominal;
  return ((r * (faixa.nominal / 100) - faixa.deduzir) / r) * 100;
}

/** DAS do mês: receita do mês × alíquota efetiva do RBT12. */
export function impostoDoMes(
  receitaMes: number,
  rbt12: number,
  tabela: FaixaSimples[] = ANEXO_III,
): number {
  return (Number(receitaMes) || 0) * (aliquotaEfetiva(rbt12, tabela) / 100);
}

export interface ProjecaoAliquota {
  /** Alíquota efetiva hoje, sobre o RBT12 atual. */
  atual: number;
  /** Alíquota efetiva depois que este projeto entrar no RBT12. */
  futura: number;
  /** futura − atual, em pontos percentuais. */
  delta: number;
  /** RBT12 depois de somar o projeto. */
  rbt12Futuro: number;
  /** Imposto do próprio projeto, à alíquota vigente no mês em que for faturado. */
  imposto: number;
  /** true se o projeto estoura o teto de R$ 4,8 mi do Simples. */
  estouraLimite: boolean;
}

/**
 * Impacto de um projeto: quanto ele paga agora e para onde empurra a alíquota
 * dos meses seguintes.
 */
export function projecaoAliquota(
  rbt12: number,
  valorProjeto: number,
  tabela: FaixaSimples[] = ANEXO_III,
): ProjecaoAliquota {
  const r = Math.max(0, Number(rbt12) || 0);
  const v = Math.max(0, Number(valorProjeto) || 0);
  const atual = aliquotaEfetiva(r, tabela);
  const rbt12Futuro = r + v;
  const futura = aliquotaEfetiva(rbt12Futuro, tabela);
  return {
    atual,
    futura,
    delta: futura - atual,
    rbt12Futuro,
    imposto: v * (atual / 100),
    estouraLimite: rbt12Futuro > LIMITE_SIMPLES,
  };
}
