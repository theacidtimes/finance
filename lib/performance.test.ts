import { describe, it, expect } from "vitest";
import {
  BETA_BONUS,
  anoDoProjeto,
  computePerformance,
  mesesDecorridosNoAno,
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

/**
 * "Hoje" fixo depois do fim de 2026, para que ANO seja um ano FECHADO. Sem
 * isso os testes dependeriam da data real da máquina: num ano em curso o custo
 * de caixa só conta os meses decorridos, e os números mudariam com o calendário.
 */
const FECHADO = new Date("2027-01-15T00:00:00Z");

const perf = (
  projetos: ProjetoBruto[],
  time: TeamMember[],
  ano: number = ANO,
  hoje: Date = FECHADO
) => computePerformance(projetos, time, ano, BETA_BONUS, hoje);

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
      const r = perf([projeto(h)], [isa()], ANO);
      expect(r.pessoas[0].fundo).toBeCloseTo(esperado, 2);
    });
  }

  it("break-even ≈ 914,29 h", () => {
    const r = perf([projeto(1000)], [isa()], ANO);
    expect(r.pessoas[0].breakEvenHoras).toBeCloseTo(914.2857, 3);
  });

  it("no break-even exato o fundo zera", () => {
    const r = perf([projeto(72000 / 78.75)], [isa()], ANO);
    expect(r.pessoas[0].fundo).toBeCloseTo(0, 6);
  });

  it("cada hora acima do break-even vale o custo/hora cheio", () => {
    const a = perf([projeto(1200)], [isa()], ANO).fundoTotal;
    const b = perf([projeto(1300)], [isa()], ANO).fundoTotal;
    expect(b - a).toBeCloseTo(100 * 78.75, 2);
  });
});

describe("configuração real da Isa (markup 140%)", () => {
  // Cadastro em produção: 100% "Bônus / 13º" + 40% "VR" sobre R$ 6.000.
  //   carregado 14.400/mês → 90,00/h · caixa 72.000/ano → break-even 800 h
  const real = (over: Partial<TeamMember> = {}) =>
    isa({ encargos: [{ label: "Bônus / 13º", pct: 100 }, { label: "VR", pct: 40 }], ...over });

  it("custo/hora = R$ 90,00", () => {
    const r = perf([projeto(100)], [real()], ANO);
    expect(r.pessoas[0].custoHora).toBeCloseTo(90, 6);
  });

  it("break-even = 800 h no ano cheio", () => {
    const r = perf([projeto(100)], [real()], ANO);
    expect(r.pessoas[0].breakEvenHoras).toBeCloseTo(800, 6);
  });

  it("admitida em jul/2026 → meio ano de caixa e break-even pela metade", () => {
    const r = perf([projeto(100)], [real({ dataAdmissao: "2026-07-15" })], 2026);
    expect(r.custoCaixaTime).toBeCloseTo(36000, 2); // jul–dez
    expect(r.pessoas[0].breakEvenHoras).toBeCloseTo(400, 6);
  });
});

describe("bônus", () => {
  it("é β do fundo quando o caixa é positivo", () => {
    const r = perf([projeto(1200)], [isa()], ANO);
    expect(r.bonusLiberado).toBe(true);
    expect(r.bonusTotal).toBeCloseTo(22500 * BETA_BONUS, 2);
    expect(r.bonusTotal).toBeCloseTo(11250, 2);
  });

  it("nunca é negativo, mesmo com fundo negativo", () => {
    const r = perf([projeto(800)], [isa()], ANO);
    expect(r.fundoTotal).toBeLessThan(0);
    expect(r.bonusTotal).toBe(0);
  });

  it("fica bloqueado quando o caixa do ano é negativo", () => {
    // Receita que não cobre externos + o caixa do time.
    const magro = projeto(1200, { valorBruto: 50000 });
    const r = perf([magro], [isa()], ANO);
    expect(r.lucroCaixa).toBeLessThan(0);
    expect(r.bonusLiberado).toBe(false);
  });

  it("o fundo de uma pessoa não é cancelado pelo rombo de outra", () => {
    const outro: TeamMember = isa({ id: "outro", nome: "Outro" });
    const p = projeto(1600);
    p.proj.status = "Entregue";
    // "Outro" tem contrato mas zero horas → fundo −72.000
    const r = perf([p], [isa(), outro], ANO);
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
    const r = perf([], [isa()], ANO);
    expect(r.custoCaixaTime).toBeCloseTo(72000, 2);
    expect(r.pessoas).toHaveLength(1);
    expect(r.pessoas[0].horas).toBe(0);
    expect(r.lucroCaixa).toBeCloseTo(-72000, 2);
  });

  it("pro-rateia quem foi admitido no meio do ano", () => {
    const r = perf([], [isa({ dataAdmissao: `${ANO}-04-15` })], ANO);
    expect(r.custoCaixaTime).toBeCloseTo(6000 * 9, 2); // abr–dez
  });

  it("ignora quem foi admitido depois do ano", () => {
    const r = perf([], [isa({ dataAdmissao: `${ANO + 1}-01-01` })], ANO);
    expect(r.custoCaixaTime).toBe(0);
    expect(r.pessoas).toHaveLength(0);
  });

  it("não cobra caixa de inativo", () => {
    const r = perf([], [isa({ ativo: false })], ANO);
    expect(r.custoCaixaTime).toBe(0);
  });
});

describe("benefícios saem do caixa; encargos não", () => {
  // R$ 800/mês de VR/VT: dinheiro que sai de verdade. Se o fundo ignorasse
  // isso, cobraria dos projetos o carregado (que já inclui o benefício) e
  // descontaria só o salário — inflando o fundo em 800 × meses.
  const comBeneficio = (over: Partial<TeamMember> = {}) =>
    isa({ beneficiosMensais: 800, ...over });

  it("benefício entra no custo de caixa do ano", () => {
    const r = perf([], [comBeneficio()], ANO);
    expect(r.custoCaixaTime).toBeCloseTo((6000 + 800) * 12, 2);
    expect(r.pessoas[0].custoCaixaAno).toBeCloseTo(81600, 2);
  });

  it("benefício também é pro-rateado por meses decorridos", () => {
    const r = perf([], [comBeneficio({ dataAdmissao: `${ANO}-07-01` })], ANO);
    expect(r.custoCaixaTime).toBeCloseTo((6000 + 800) * 6, 2); // jul–dez
  });

  it("break-even sobe junto: mais caixa a cobrir", () => {
    // carregado = 6.000 + 110% × 6.000 + 800 = 13.400 → 83,75/h
    const r = perf([projeto(100)], [comBeneficio()], ANO);
    expect(r.pessoas[0].custoHora).toBeCloseTo(83.75, 6);
    expect(r.pessoas[0].breakEvenHoras).toBeCloseTo(81600 / 83.75, 6);
  });

  it("encargos continuam fora do caixa — é deles que o fundo vive", () => {
    // Dobrar o encargo não muda um centavo do caixa, só encarece a hora.
    const a = perf([], [isa({ encargos: [{ label: "Markup", pct: 110 }] })], ANO);
    const b = perf([], [isa({ encargos: [{ label: "Markup", pct: 220 }] })], ANO);
    expect(a.custoCaixaTime).toBeCloseTo(b.custoCaixaTime, 6);
    expect(a.custoCaixaTime).toBeCloseTo(72000, 2);
  });

  it("a identidade DRE ↔ caixa continua fechando com benefício", () => {
    const r = perf([projeto(1200)], [comBeneficio()], ANO);
    expect(
      r.lucroDRE + r.staffInterno + r.overhead - r.custoCaixaTime
    ).toBeCloseTo(r.lucroCaixa, 6);
  });
});

describe("sócio não é custo fixo", () => {
  // Bruno está no cadastro como Sócio com salário mensal de 30k. Esse valor
  // existe para custear as horas dele nos projetos — a retirada de fato é
  // distribuição de lucro, variável. Tratar como custo fixo afundaria o caixa.
  const socio = (): TeamMember =>
    isa({ id: "socio", nome: "Bruno", tipoContrato: "Sócio", salarioMensal: 30000 });

  it("não vira custo de caixa", () => {
    const r = perf([], [socio()], ANO);
    expect(r.custoCaixaTime).toBe(0);
  });

  it("nem aparece quando não lançou horas", () => {
    expect(perf([], [socio()], ANO).pessoas).toHaveLength(0);
  });

  it("aparece sem fundo quando lança horas, com o motivo explicado", () => {
    const p = projeto(100);
    p.internos[0].teamMemberId = "socio";
    p.internos[0].nome = "Bruno";
    const r = perf([p], [socio()], ANO);
    expect(r.pessoas[0].temContratoFixo).toBe(false);
    expect(r.pessoas[0].fundo).toBeNull();
    expect(r.pessoas[0].motivoSemFundo).toMatch(/sócio/i);
    expect(r.bonusTotal).toBe(0);
  });

  it("não afunda o caixa nem bloqueia o bônus de quem tem contrato", () => {
    const p = projeto(1200); // Isa 1200 h
    const r = perf([p], [isa(), socio()], ANO);
    expect(r.custoCaixaTime).toBeCloseTo(72000, 2); // só a Isa
    expect(r.bonusLiberado).toBe(true);
    expect(r.bonusTotal).toBeCloseTo(11250, 2);
  });
});

describe("freelancer é pago por job, não por mês", () => {
  it("não gera custo fixo nem fundo", () => {
    const freela = isa({ id: "fr", nome: "Freela", tipoContrato: "Freelancer" });
    const r = perf([], [freela], ANO);
    expect(r.custoCaixaTime).toBe(0);
    expect(r.pessoas).toHaveLength(0);
  });
});

describe("staff avulso (sem vínculo no cadastro)", () => {
  const avulso = projeto(1200);
  avulso.internos[0].teamMemberId = null;
  avulso.internos[0].nome = "Freela";

  it("aparece com horas mas não gera fundo", () => {
    const r = perf([avulso], [], ANO);
    expect(r.pessoas[0].horas).toBe(1200);
    expect(r.pessoas[0].temContratoFixo).toBe(false);
    expect(r.pessoas[0].fundo).toBeNull();
    expect(r.bonusTotal).toBe(0);
  });

  it("não inventa custo de caixa", () => {
    const r = perf([avulso], [], ANO);
    expect(r.custoCaixaTime).toBe(0);
  });
});

describe("agregação", () => {
  it("reconcilia DRE e caixa pela ponte de provisões", () => {
    const r = perf([projeto(1200)], [isa()], ANO);
    const ponte = r.lucroDRE + r.staffInterno + r.overhead - r.custoCaixaTime;
    expect(ponte).toBeCloseTo(r.lucroCaixa, 6);
  });

  it("soma as horas da mesma pessoa em vários projetos", () => {
    const a = projeto(600);
    const b = { ...projeto(600), proj: { ...projeto(600).proj, id: "p2" } };
    const r = perf([a, b], [isa()], ANO);
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
    const r = perf([grande, pequeno], [isa()], ANO);
    expect(r.margemMedia).toBeCloseTo(r.lucroDRE / r.receitaOperacional, 9);
  });

  it("ano vazio não quebra", () => {
    const r = perf([], [], ANO);
    expect(r.receitaBruta).toBe(0);
    expect(r.margemMedia).toBe(0);
    expect(r.bonusTotal).toBe(0);
  });
});

describe("ano em curso só cobra o caixa já decorrido", () => {
  // O bug que fazia o fundo ficar vermelho mesmo com lucro: cobrar 12 meses de
  // custo num ano que ainda está correndo compara caixa futuro com trabalho já
  // feito. O fundo tem de olhar só o que já passou.
  const JULHO = new Date("2026-07-27T00:00:00Z");

  it("em julho cobra 7 meses, não 12", () => {
    const r = perf([], [isa()], ANO, JULHO);
    expect(r.custoCaixaTime).toBeCloseTo(6000 * 7, 2);
  });

  it("admitida em julho, em julho → 1 mês de caixa", () => {
    const r = perf([], [isa({ dataAdmissao: "2026-07-15" })], ANO, JULHO);
    expect(r.custoCaixaTime).toBeCloseTo(6000, 2);
    expect(r.pessoas[0].mesesCaixa).toBe(1);
  });

  it("caso real: 360 h da Isa em julho dão fundo POSITIVO", () => {
    // Era isto que aparecia vermelho: provisão 30.300 contra 36.000 de caixa
    // (jul–dez, futuro). Cobrando só julho, o fundo fica positivo.
    const real = isa({
      dataAdmissao: "2026-07-15",
      encargos: [{ label: "Bônus / 13º", pct: 100 }, { label: "VR", pct: 40 }],
    });
    const p = projeto(360);
    p.internos[0].salario = 14400; // carregado 140%
    const r = perf([p], [real], ANO, JULHO);
    expect(r.pessoas[0].provisao).toBeCloseTo(32400, 2);
    expect(r.pessoas[0].custoCaixaAno).toBeCloseTo(6000, 2);
    expect(r.pessoas[0].fundo).toBeGreaterThan(0);
  });

  it("marca o ano como em curso e conta os meses", () => {
    const r = perf([], [isa()], ANO, JULHO);
    expect(r.anoEmCurso).toBe(true);
    expect(r.mesesDecorridos).toBe(7);
  });

  it("ano fechado não é 'em curso' e conta 12 meses", () => {
    const r = perf([], [isa()], ANO, FECHADO);
    expect(r.anoEmCurso).toBe(false);
    expect(r.mesesDecorridos).toBe(12);
  });

  it("ano futuro não cobra nada", () => {
    const r = perf([], [isa()], 2028, JULHO);
    expect(r.custoCaixaTime).toBe(0);
    expect(r.mesesDecorridos).toBe(0);
  });
});

describe("helpers de data", () => {
  it("anoDoProjeto lê o ano do ISO", () => expect(anoDoProjeto("2026-03-01")).toBe(2026));
  it("anoDoProjeto devolve null sem data", () => expect(anoDoProjeto("")).toBeNull());
  it("anoDoProjeto devolve null com lixo", () => expect(anoDoProjeto("abc")).toBeNull());
  it("sem admissão assume o ano cheio", () => expect(mesesDecorridosNoAno("", 2026, FECHADO)).toBe(12));
  it("admissão anterior conta 12 meses", () =>
    expect(mesesDecorridosNoAno("2020-05-01", 2026, FECHADO)).toBe(12));
  it("admissão em janeiro conta 12", () => expect(mesesDecorridosNoAno("2026-01-10", 2026, FECHADO)).toBe(12));
  it("admissão em dezembro conta 1", () => expect(mesesDecorridosNoAno("2026-12-31", 2026, FECHADO)).toBe(1));
});
