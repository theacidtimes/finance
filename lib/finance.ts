/**
 * Lógica financeira ACID — fonte única da verdade.
 * NÃO reimplementar estes cálculos em componentes.
 *
 * Regras:
 * - Comissão incide sobre a Receita LÍQUIDA (após impostos)
 * - Overhead incide APENAS sobre o Staff Interno (externos ficam de fora)
 * - Retido na ACID = Staff Interno + Overhead + Lucro Operacional
 */

import type { CustoExterno, StaffInterno, StaffInternoCalc, DREResultado } from "@/types";

export interface DREInput {
  valorBruto: number;
  impostosPct: number;  // ex.: 11
  comissaoPct: number;  // ex.: 3
  overheadPct: number;  // ex.: 50
  externos: Pick<CustoExterno, "valor">[];
  internos: StaffInterno[];
}

export function calcularStaff(internos: StaffInterno[]): StaffInternoCalc[] {
  return internos.map((p) => {
    const custoHora = p.baseHoras > 0 ? p.salario / p.baseHoras : 0;
    return { ...p, custoHora, custoProjeto: custoHora * p.horasProjeto };
  });
}

export function computeDRE(input: DREInput): DREResultado {
  const receitaBruta = Number(input.valorBruto) || 0;
  const impostos = receitaBruta * (input.impostosPct / 100);
  const receitaLiquida = receitaBruta - impostos;

  // Comissão sobre a receita líquida — nunca sobre a bruta
  const comissao = receitaLiquida * (input.comissaoPct / 100);
  const receitaOperacional = receitaLiquida - comissao;

  const custosExternos = input.externos.reduce((s, e) => s + (Number(e.valor) || 0), 0);

  const internosCalc = calcularStaff(input.internos);
  const staffInterno = internosCalc.reduce((s, p) => s + p.custoProjeto, 0);

  // Overhead só sobre staff interno
  const overhead = staffInterno * (input.overheadPct / 100);

  const custoTotal = custosExternos + staffInterno + overhead;
  const lucroOperacional = receitaOperacional - custoTotal;

  const margemBruta = receitaBruta > 0 ? lucroOperacional / receitaBruta : 0;
  const margemOperacional = receitaOperacional > 0 ? lucroOperacional / receitaOperacional : 0;
  const pctProducaoExterna = receitaBruta > 0 ? custosExternos / receitaBruta : 0;
  const retidoACID = staffInterno + overhead + lucroOperacional;
  const pctRetido = receitaBruta > 0 ? retidoACID / receitaBruta : 0;

  return {
    receitaBruta, impostos, receitaLiquida, comissao, receitaOperacional,
    custosExternos, internosCalc, staffInterno, overhead, custoTotal,
    lucroOperacional, margemBruta, margemOperacional, pctProducaoExterna,
    retidoACID, pctRetido,
  };
}

/**
 * Cálculo reverso: valor de venda necessário para uma margem operacional alvo,
 * dado o custo total fixo. Derivação:
 *   RO = RB·(1−i)·(1−c);  Lucro = RO − C;  margem m = Lucro/RO
 *   ⇒ RO·(1−m) = C  ⇒  RB = C / ((1−m)·(1−i)·(1−c))
 */
export function valorParaMargem(
  margemAlvo: number, // 0–1 (ex.: 0.30)
  custoTotal: number,
  impostosPct: number,
  comissaoPct: number
): number {
  const denom = (1 - margemAlvo) * (1 - impostosPct / 100) * (1 - comissaoPct / 100);
  return denom > 0 ? custoTotal / denom : 0;
}

/** Semáforo de margem operacional */
export function saudeMargem(m: number): "verde" | "amarelo" | "vermelho" {
  if (m >= 0.3) return "verde";
  if (m >= 0.2) return "amarelo";
  return "vermelho";
}

/* ------------------------------------------------------------------
 * Caso de teste canônico (projeto ATTO) — usar nos testes unitários:
 *
 * input: RB 235.000 | impostos 11% | comissão 3% | overhead 50%
 *   externos: 15.000 + 15.000 + 5.000 + 65.000 = 100.000
 *   internos: Isa (12.600/160h × 80h = 6.300) + Bruno (25.400/160h × 40h = 6.350)
 *
 * esperado:
 *   impostos            25.850,00
 *   receitaLiquida     209.150,00
 *   comissao             6.274,50
 *   receitaOperacional 202.875,50
 *   staffInterno        12.650,00
 *   overhead             6.325,00
 *   custoTotal         118.975,00
 *   lucroOperacional    83.900,50
 *   margemBruta         ≈ 0,3570
 *   margemOperacional   ≈ 0,4136
 *   retidoACID         102.875,50
 * ------------------------------------------------------------------ */
