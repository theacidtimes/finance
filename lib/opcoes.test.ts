import { describe, it, expect } from "vitest";
import {
  temOpcoes,
  linhaValida,
  valorDaProposta,
  escolherOpcao,
  opcaoEscolhida,
  totalSugerido,
} from "./opcoes";
import type { OpcaoComercial } from "@/types";

const op = (over: Partial<OpcaoComercial> = {}): OpcaoComercial => ({
  id: Math.random(),
  label: "2 days",
  quantidade: 2,
  valorUnitario: 1500,
  valorTotal: 3000,
  escolhida: false,
  ...over,
});

/** A grade da proposta Knass: 2, 3, 4 e 5 diárias. */
const grade = (): OpcaoComercial[] => [
  op({ id: 1, label: "2 days", quantidade: 2, valorUnitario: 1500, valorTotal: 3000 }),
  op({ id: 2, label: "3 days", quantidade: 3, valorUnitario: 1200, valorTotal: 3600 }),
  op({ id: 3, label: "4 days", quantidade: 4, valorUnitario: 1125, valorTotal: 4500 }),
  op({ id: 4, label: "5 days", quantidade: 5, valorUnitario: 1050, valorTotal: 5250 }),
];

describe("qual valor a proposta vale", () => {
  it("sem opções, vale o preço digitado no cadastro", () => {
    expect(valorDaProposta([], 235_000)).toBe(235_000);
    expect(valorDaProposta(undefined, 235_000)).toBe(235_000);
  });

  it("com grade e nenhuma fechada, vale a menor condição", () => {
    // O piso é o único valor que a proposta compromete. Contar a maior infla a
    // carteira com um cenário que o cliente nunca aceitou.
    expect(valorDaProposta(grade(), 0)).toBe(3000);
  });

  it("fechada uma condição, vale ela — mesmo não sendo a menor", () => {
    const g = escolherOpcao(grade(), 4);
    expect(valorDaProposta(g, 0)).toBe(5250);
  });

  it("a menor não depende da ordem das linhas", () => {
    const invertida = [...grade()].reverse();
    expect(valorDaProposta(invertida, 0)).toBe(3000);
  });

  it("linha em branco não conta como condição", () => {
    // Linha recém-adicionada e não preenchida zeraria o valor do projeto se
    // entrasse no Math.min.
    const g = [...grade(), op({ id: 9, label: "", quantidade: 0, valorUnitario: 0, valorTotal: 0 })];
    expect(valorDaProposta(g, 0)).toBe(3000);
    expect(linhaValida(g[4])).toBe(false);
    expect(temOpcoes(g)).toBe(true);
  });

  it("só linhas em branco é o mesmo que não ter grade", () => {
    const vazias = [op({ label: "", valorTotal: 0, quantidade: 0, valorUnitario: 0 })];
    expect(temOpcoes(vazias)).toBe(false);
    expect(valorDaProposta(vazias, 235_000)).toBe(235_000);
  });
});

describe("escolher a condição fechada", () => {
  it("marcar uma desmarca as outras", () => {
    // Duas marcadas fariam o valor do projeto depender da ordem do array.
    const g = escolherOpcao(escolherOpcao(grade(), 2), 4);
    expect(g.filter((o) => o.escolhida).map((o) => o.id)).toEqual([4]);
    expect(opcaoEscolhida(g)?.label).toBe("5 days");
  });

  it("clicar de novo na mesma desmarca — volta a valer a menor", () => {
    const g = escolherOpcao(escolherOpcao(grade(), 4), 4);
    expect(g.some((o) => o.escolhida)).toBe(false);
    expect(valorDaProposta(g, 0)).toBe(3000);
  });
});

describe("total sugerido", () => {
  it("quantidade × unitário", () => {
    expect(totalSugerido(3, 1200)).toBe(3600);
    expect(totalSugerido(2.5, 1000)).toBe(2500);
  });

  it("sem um dos dois não sugere nada — pacote tem preço fechado", () => {
    expect(totalSugerido(0, 1200)).toBe(0);
    expect(totalSugerido(3, 0)).toBe(0);
  });
});
