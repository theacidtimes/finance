import { describe, it, expect } from "vitest";
import {
  aliquotaEfetiva,
  impostoDoMes,
  faixaDe,
  projecaoAliquota,
  ANEXO_III,
} from "./impostos";

describe("Simples Nacional — Anexo III", () => {
  it("reproduz o extrato do DAS de 07/2026 (RBT12 347.620 / receita 320.000)", () => {
    // Extrato: alíquota 8,5074046372476 | Simples a recolher 27.223,69
    expect(aliquotaEfetiva(347_620)).toBeCloseTo(8.5074046372476, 10);
    expect(impostoDoMes(320_000, 347_620)).toBeCloseTo(27_223.69, 2);
  });

  it("bate com os meses da planilha que estão na 2ª faixa", () => {
    expect(aliquotaEfetiva(317_620)).toBeCloseTo(8.25, 2); // JUN/2026
  });

  it("primeira faixa devolve a nominal (sem parcela a deduzir)", () => {
    expect(aliquotaEfetiva(0)).toBe(6);
    expect(aliquotaEfetiva(180_000)).toBeCloseTo(6, 10);
  });

  it("cresce dentro de cada faixa (a 1ª é plana: sem parcela a deduzir)", () => {
    expect(aliquotaEfetiva(1)).toBe(aliquotaEfetiva(180_000));
    for (const f of ANEXO_III.slice(1)) {
      const piso = ANEXO_III[ANEXO_III.indexOf(f) - 1].ate;
      expect(aliquotaEfetiva(f.ate)).toBeGreaterThan(aliquotaEfetiva(piso + 1));
    }
  });

  it("a tabela tem degraus nas viradas de faixa — inclusive para baixo", () => {
    // Propriedade real do Anexo III, não arredondamento: em 360 mil e em 3,6 mi
    // a alíquota efetiva CAI ao entrar na faixa seguinte.
    expect(aliquotaEfetiva(180_000)).toBeCloseTo(aliquotaEfetiva(180_000.01), 6); // contínua
    expect(aliquotaEfetiva(360_000)).toBeCloseTo(8.6, 6);
    expect(aliquotaEfetiva(360_000.01)).toBeCloseTo(8.3, 6); // −0,30 p.p.
    expect(aliquotaEfetiva(720_000)).toBeCloseTo(10.75, 6);
    expect(aliquotaEfetiva(720_000.01)).toBeCloseTo(11.05, 6); // +0,30 p.p.
    expect(aliquotaEfetiva(1_800_000)).toBeCloseTo(aliquotaEfetiva(1_800_000.01), 6); // contínua
    expect(aliquotaEfetiva(3_600_000)).toBeCloseTo(17.51, 6);
    expect(aliquotaEfetiva(3_600_000.01)).toBeCloseTo(15.0, 6); // −2,51 p.p.
  });

  it("faixaDe classifica pelos tetos da lei", () => {
    expect(faixaDe(180_000).nominal).toBe(6);
    expect(faixaDe(180_000.01).nominal).toBe(11.2);
    expect(faixaDe(360_000.01).nominal).toBe(13.2);
    expect(faixaDe(9_000_000).nominal).toBe(33);
  });

  it("projeção mostra o empurrão na alíquota dos meses seguintes", () => {
    // RBT12 347.620 + projeto de 320.000 → 667.620 (3ª faixa)
    const p = projecaoAliquota(347_620, 320_000);
    expect(p.atual).toBeCloseTo(8.5074, 4);
    expect(p.rbt12Futuro).toBe(667_620);
    expect(p.futura).toBeCloseTo(10.5578, 4);
    expect(p.delta).toBeCloseTo(2.0504, 4);
    expect(p.imposto).toBeCloseTo(27_223.69, 2);
    expect(p.estouraLimite).toBe(false);
  });

  it("sinaliza estouro do teto de 4,8 mi", () => {
    expect(projecaoAliquota(4_700_000, 200_000).estouraLimite).toBe(true);
  });
});
