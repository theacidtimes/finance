import { describe, it, expect } from "vitest";
import { urlPTAX, dataBCB, melhorCotacao, cotavel, type BoletimPTAX } from "./cotacao";

describe("consulta PTAX", () => {
  it("data no formato americano que a API do BCB exige", () => {
    expect(dataBCB(new Date(Date.UTC(2026, 7, 3)))).toBe("08-03-2026");
    expect(dataBCB(new Date(Date.UTC(2026, 11, 25)))).toBe("12-25-2026");
  });

  it("consulta uma janela para trás, não só hoje", () => {
    // Fim de semana, feriado e o começo do dia não têm boletim: pedir só a
    // data de hoje devolveria lista vazia boa parte das vezes.
    const url = urlPTAX("EUR", new Date(Date.UTC(2026, 7, 21)));
    expect(url).toContain("%40moeda=%27EUR%27");
    expect(url).toContain("%40dataInicial=%2708-11-2026%27");
    expect(url).toContain("%40dataFinalCotacao=%2708-21-2026%27");
  });

  it("real não se cota contra si mesmo", () => {
    expect(cotavel("BRL")).toBe(false);
    expect(cotavel("EUR")).toBe(true);
  });
});

describe("qual boletim vale", () => {
  const b = (over: Partial<BoletimPTAX>): BoletimPTAX => ({
    cotacaoCompra: 5.8,
    cotacaoVenda: 5.9,
    dataHoraCotacao: "2026-08-20 13:00:00.000",
    tipoBoletim: "Fechamento",
    ...over,
  });

  it("usa a cotação de COMPRA — exportando, o banco compra nossos euros", () => {
    // A de venda é o caminho contrário e sairia centavos acima; no valor de um
    // projeto isso vira uma diferença que ninguém consegue explicar depois.
    expect(melhorCotacao([b({ cotacaoCompra: 5.82, cotacaoVenda: 5.93 })])?.taxa).toBe(5.82);
  });

  it("prefere o fechamento mais recente ao boletim intraday", () => {
    const c = melhorCotacao([
      b({ dataHoraCotacao: "2026-08-21 11:00:00.000", tipoBoletim: "Intermediário", cotacaoCompra: 6.01 }),
      b({ dataHoraCotacao: "2026-08-20 13:00:00.000", tipoBoletim: "Fechamento", cotacaoCompra: 5.99 }),
    ]);
    expect(c?.taxa).toBe(5.99);
    expect(c?.data).toBe("2026-08-20");
    expect(c?.fechamento).toBe(true);
  });

  it("sem fechamento no período, aceita o intraday e avisa", () => {
    const c = melhorCotacao([
      b({ dataHoraCotacao: "2026-08-21 11:00:00.000", tipoBoletim: "Intermediário", cotacaoCompra: 6.01 }),
    ]);
    expect(c?.taxa).toBe(6.01);
    expect(c?.fechamento).toBe(false);
  });

  it("resposta vazia ou sem cotação de compra devolve null", () => {
    expect(melhorCotacao([])).toBeNull();
    expect(melhorCotacao([b({ cotacaoCompra: 0 })])).toBeNull();
  });
});
