import { describe, it, expect } from "vitest";
import {
  BETA_BONUS,
  anoDoProjeto,
  computePerformance,
  mesesAtivosNoAno,
  type ProjetoBruto,
} from "./performance";
import { novoMembroDefaults } from "./team";
import type { TeamMember } from "@/types";

/**
 * Cenário de referência — Isa (PJ):
 *   caixa            R$ 6.000/mês  →  R$ 72.000/ano
 *   encargos         110%          →  carregado R$ 12.600/mês
 *   base             160 h/mês     →  custo/hora R$ 78,75
 *   break-even       72.000 / 78,75 = 914,29 h/ano
 * Acima do break-even, cada hora joga os R$ 78,75 inteiros no fundo: o custo
 * dela é fixo, não por hora.
 */
const ANO = 2026;

function isa(over: Partial<TeamMember> = {}): TeamMember {
  return {
    ...novoMembroDefaults(),
    id: "isa",
    nome: "Isa",
    funcao: "AI Designer",
    tipoContrato: "PJ",
    ativo: true,
    salarioMensal: 6000,
    baseHorasMes: 160,
    encargos: [{ label: "Markup", pct: 110 }],
    beneficiosMensais: 0,
    dataAdmissao: "",
    ...over,
  };
}

/** Projeto com receita alta o bastante para o caixa ficar positivo. */
function projeto(horasIsa: number, over: Partial<ProjetoBruto["proj"]> = {}): ProjetoBruto {
  return {
    proj: {
      id: "p1",
      cliente: "Cliente",
      projeto: "Projeto",
      numeroServico: "001",
      tipo: "Filme",
      responsavel: "",
      data: `${ANO}-06-01`,
      status: "Entregue",
      valorBruto: 500000,
      impostosPct: 11,
      comissaoPct: 3,
      overheadPct: 50,
      prazo: "",
      condicaoPagamento: "",
      validadeProposta: "",
      observacoes: "",
      titulo: "",
      ...over,
    },
    externos: [{ valor: 100000 }],
    internos: [
      {
        id: 1,
        nome: "Isa",
        funcao: "AI Designer",
        salario: 12600, // carregado, como o cadastro entrega
        baseHoras: 160,
        horasProjeto: horasIsa,
        teamMemberId: "isa",
      },
    ],
  };
}

describe("fundo de bônus — break-even da Isa", () => {
  const casos: [horas: number, fundo: number][] = [
    [800, -9000],
    [1200, 22500],
    [1600, 54000],
  ];

  for (const [h, esperado] of casos) {
    it(`${h} h → fundo ${esperado}`, () => {
      const r = computePerformance([projeto(h)], [isa()], ANO);
      expect(r.pessoas[0].fundo).toBeCloseTo(esperado, 2);
    });
  }

  it("break-even ≈ 914,29 h", () => {
    const r = computePerformance([projeto(1000)], [isa()], ANO);
    expect(r.pessoas[0].breakEvenHoras).toBeCloseTo(914.2857, 3);
  });

  it("no break-even exato o fundo zera", () => {
    const r = computePerformance([projeto(72000 / 78.75)], [isa()], ANO);
    expect(r.pessoas[0].fundo).toBeCloseTo(0, 6);
  });

  it("cada hora acima do break-even vale o custo/hora cheio", () => {
    const a = computePerformance([projeto(1200)], [isa()], ANO).fundoTotal;
    const b = computePerformance([projeto(1300)], [isa()], ANO).fundoTotal;
    expect(b - a).toBeCloseTo(100 * 78.75, 2);
  });
});

describe("bônus", () => {
  it("é β do fundo quando o caixa é positivo", () => {
    const r = computePerformance([projeto(1200)], [isa()], ANO);
    expect(r.bonusLiberado).toBe(true);
    expect(r.bonusTotal).toBeCloseTo(22500 * BETA_BONUS, 2);
    expect(r.bonusTotal).toBeCloseTo(11250, 2);
  });

  it("nunca é negativo, mesmo com fundo negativo", () => {
    const r = computePerformance([projeto(800)], [isa()], ANO);
    expect(r.fundoTotal).toBeLessThan(0);
    expect(r.bonusTotal).toBe(0);
  });

  it("fica bloqueado quando o caixa do ano é negativo", () => {
    // Receita que não cobre externos + o caixa do time.
    const magro = projeto(1200, { valorBruto: 50000 });
    const r = computePerformance([magro], [isa()], ANO);
    expect(r.lucroCaixa).toBeLessThan(0);
    expect(r.bonusLiberado).toBe(false);
  });

  it("o fundo de uma pessoa não é cancelado pelo rombo de outra", () => {
    const outro: TeamMember = isa({ id: "outro", nome: "Outro" });
    const p = projeto(1600);
    p.proj.status = "Entregue";
    // "Outro" tem contrato mas zero horas → fundo −72.000
    const r = computePerformance([p], [isa(), outro], ANO);
    const porNome = Object.fromEntries(r.pessoas.map((x) => [x.nome, x]));
    expect(porNome["Isa"].fundo).toBeCloseTo(54000, 2);
    expect(porNome["Outro"].fundo).toBeCloseTo(-72000, 2);
    // fundo total afunda, mas o bônus da Isa sobrevive
    expect(r.fundoTotal).toBeCloseTo(-18000, 2);
    expect(r.bonusTotal).toBeCloseTo(27000, 2);
  });
});

describe("custo de caixa", () => {
  it("conta o time fixo mesmo sem horas lançadas no ano", () => {
    const r = computePerformance([], [isa()], ANO);
    expect(r.custoCaixaTime).toBeCloseTo(72000, 2);
    expect(r.pessoas).toHaveLength(1);
    expect(r.pessoas[0].horas).toBe(0);
    expect(r.lucroCaixa).toBeCloseTo(-72000, 2);
  });

  it("pro-rateia quem foi admitido no meio do ano", () => {
    const r = computePerformance([], [isa({ dataAdmissao: `${ANO}-04-15` })], ANO);
    expect(r.custoCaixaTime).toBeCloseTo(6000 * 9, 2); // abr–dez
  });

  it("ignora quem foi admitido depois do ano", () => {
    const r = computePerformance([], [isa({ dataAdmissao: `${ANO + 1}-01-01` })], ANO);
    expect(r.custoCaixaTime).toBe(0);
    expect(r.pessoas).toHaveLength(0);
  });

  it("não cobra caixa de inativo", () => {
    const r = computePerformance([], [isa({ ativo: false })], ANO);
    expect(r.custoCaixaTime).toBe(0);
  });
});

describe("staff avulso (sem vínculo no cadastro)", () => {
  const avulso = projeto(1200);
  avulso.internos[0].teamMemberId = null;
  avulso.internos[0].nome = "Freela";

  it("aparece com horas mas não gera fundo", () => {
    const r = computePerformance([avulso], [], ANO);
    expect(r.pessoas[0].horas).toBe(1200);
    expect(r.pessoas[0].temContratoFixo).toBe(false);
    expect(r.pessoas[0].fundo).toBeNull();
    expect(r.bonusTotal).toBe(0);
  });

  it("não inventa custo de caixa", () => {
    const r = computePerformance([avulso], [], ANO);
    expect(r.custoCaixaTime).toBe(0);
  });
});

describe("agregação", () => {
  it("reconcilia DRE e caixa pela ponte de provisões", () => {
    const r = computePerformance([projeto(1200)], [isa()], ANO);
    const ponte = r.lucroDRE + r.staffInterno + r.overhead - r.custoCaixaTime;
    expect(ponte).toBeCloseTo(r.lucroCaixa, 6);
  });

  it("soma as horas da mesma pessoa em vários projetos", () => {
    const a = projeto(600);
    const b = { ...projeto(600), proj: { ...projeto(600).proj, id: "p2" } };
    const r = computePerformance([a, b], [isa()], ANO);
    expect(r.pessoas[0].horas).toBe(1200);
    expect(r.pessoas[0].fundo).toBeCloseTo(22500, 2);
  });

  it("margem média é ponderada, não média simples", () => {
    const grande = projeto(100);
    const pequeno: ProjetoBruto = {
      ...projeto(0),
      proj: { ...projeto(0).proj, id: "p2", valorBruto: 1000 },
      externos: [{ valor: 900 }],
      internos: [],
    };
    const r = computePerformance([grande, pequeno], [isa()], ANO);
    expect(r.margemMedia).toBeCloseTo(r.lucroDRE / r.receitaOperacional, 9);
  });

  it("ano vazio não quebra", () => {
    const r = computePerformance([], [], ANO);
    expect(r.receitaBruta).toBe(0);
    expect(r.margemMedia).toBe(0);
    expect(r.bonusTotal).toBe(0);
  });
});

describe("helpers de data", () => {
  it("anoDoProjeto lê o ano do ISO", () => expect(anoDoProjeto("2026-03-01")).toBe(2026));
  it("anoDoProjeto devolve null sem data", () => expect(anoDoProjeto("")).toBeNull());
  it("anoDoProjeto devolve null com lixo", () => expect(anoDoProjeto("abc")).toBeNull());
  it("sem admissão assume o ano cheio", () => expect(mesesAtivosNoAno("", 2026)).toBe(12));
  it("admissão anterior conta 12 meses", () =>
    expect(mesesAtivosNoAno("2020-05-01", 2026)).toBe(12));
  it("admissão em janeiro conta 12", () => expect(mesesAtivosNoAno("2026-01-10", 2026)).toBe(12));
  it("admissão em dezembro conta 1", () => expect(mesesAtivosNoAno("2026-12-31", 2026)).toBe(1));
});
