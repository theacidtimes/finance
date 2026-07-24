import { describe, it, expect } from "vitest";
import { computeDRE, valorParaMargem, saudeMargem, calcularStaff, type DREInput } from "./finance";
import type { StaffInterno } from "@/types";

/**
 * Caso canônico ATTO (fonte: finance.ts / PRD §5):
 * RB 235.000 | impostos 11% | comissão 3% | overhead 50%
 * externos 15.000 + 15.000 + 5.000 + 65.000 = 100.000
 * internos: Isa (12.600/160 × 80 = 6.300) + Bruno (25.400/160 × 40 = 6.350) = 12.650
 */
const attoInput: DREInput = {
  valorBruto: 235000,
  impostosPct: 11,
  comissaoPct: 3,
  overheadPct: 50,
  externos: [{ valor: 15000 }, { valor: 15000 }, { valor: 5000 }, { valor: 65000 }],
  internos: [
    { id: 1, nome: "Isa", funcao: "AI Designer", salario: 12600, baseHoras: 160, horasProjeto: 80 },
    { id: 2, nome: "Bruno", funcao: "Diretor", salario: 25400, baseHoras: 160, horasProjeto: 40 },
  ],
};

describe("computeDRE — caso ATTO", () => {
  const dre = computeDRE(attoInput);

  it("impostos = 25.850,00", () => expect(dre.impostos).toBeCloseTo(25850, 2));
  it("receita líquida = 209.150,00", () => expect(dre.receitaLiquida).toBeCloseTo(209150, 2));
  it("comissão (sobre líquida) = 6.274,50", () => expect(dre.comissao).toBeCloseTo(6274.5, 2));
  it("receita operacional = 202.875,50", () => expect(dre.receitaOperacional).toBeCloseTo(202875.5, 2));
  it("custos externos = 100.000,00", () => expect(dre.custosExternos).toBeCloseTo(100000, 2));
  it("staff interno = 12.650,00", () => expect(dre.staffInterno).toBeCloseTo(12650, 2));
  it("overhead (só sobre staff) = 6.325,00", () => expect(dre.overhead).toBeCloseTo(6325, 2));
  it("custo total = 118.975,00", () => expect(dre.custoTotal).toBeCloseTo(118975, 2));
  it("lucro operacional = 83.900,50", () => expect(dre.lucroOperacional).toBeCloseTo(83900.5, 2));
  it("margem operacional ≈ 41,36%", () => expect(dre.margemOperacional).toBeCloseTo(0.413561, 4));
  it("margem bruta ≈ 35,70%", () => expect(dre.margemBruta).toBeCloseTo(0.357023, 4));
  it("retido na ACID = 102.875,50", () => expect(dre.retidoACID).toBeCloseTo(102875.5, 2));
});

describe("regras invioláveis", () => {
  it("comissão incide sobre a líquida, nunca sobre a bruta", () => {
    const dre = computeDRE(attoInput);
    expect(dre.comissao).toBeCloseTo(dre.receitaLiquida * 0.03, 6);
    expect(dre.comissao).not.toBeCloseTo(dre.receitaBruta * 0.03, 2);
  });

  it("overhead incide só sobre staff interno (externos não entram)", () => {
    const dre = computeDRE(attoInput);
    expect(dre.overhead).toBeCloseTo(dre.staffInterno * 0.5, 6);
    const semExternos = computeDRE({ ...attoInput, externos: [] });
    expect(semExternos.overhead).toBeCloseTo(dre.overhead, 6);
  });

  it("retido na ACID = staff + overhead + lucro", () => {
    const dre = computeDRE(attoInput);
    expect(dre.retidoACID).toBeCloseTo(dre.staffInterno + dre.overhead + dre.lucroOperacional, 6);
  });
});

describe("calcularStaff", () => {
  it("custo/hora = salário / baseHoras; custoProjeto = custo/hora × horasProjeto", () => {
    const internos: StaffInterno[] = [
      { id: 1, nome: "Isa", funcao: "", salario: 12600, baseHoras: 160, horasProjeto: 80 },
    ];
    const [c] = calcularStaff(internos);
    expect(c.custoHora).toBeCloseTo(78.75, 4);
    expect(c.custoProjeto).toBeCloseTo(6300, 2);
  });

  it("baseHoras 0 não quebra (custo/hora = 0)", () => {
    const [c] = calcularStaff([{ id: 1, nome: "", funcao: "", salario: 1000, baseHoras: 0, horasProjeto: 10 }]);
    expect(c.custoHora).toBe(0);
    expect(c.custoProjeto).toBe(0);
  });
});

describe("valorParaMargem", () => {
  it("30% de margem: RB ≈ 196.877 (custo total 118.975)", () => {
    const rb = valorParaMargem(0.3, 118975, 11, 3);
    expect(rb).toBeCloseTo(196877, 0);
  });

  it("aplicar RB resultante devolve a margem alvo", () => {
    const rb = valorParaMargem(0.3, 118975, 11, 3);
    const dre = computeDRE({ ...attoInput, valorBruto: rb });
    expect(dre.margemOperacional).toBeCloseTo(0.3, 4);
  });
});

describe("saudeMargem", () => {
  it("verde ≥ 30%", () => expect(saudeMargem(0.3)).toBe("verde"));
  it("amarelo 20–30%", () => {
    expect(saudeMargem(0.25)).toBe("amarelo");
    expect(saudeMargem(0.2)).toBe("amarelo");
  });
  it("vermelho < 20%", () => expect(saudeMargem(0.1999)).toBe("vermelho"));
});
