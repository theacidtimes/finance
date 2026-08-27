import { describe, it, expect } from "vitest";
import {
  formatMoeda,
  moedaDe,
  idiomaDe,
  propostaInternacional,
  valorProposta,
  brlDaProposta,
  cambioPendente,
  custoCambio,
  custoCambioPctDe,
  liquidoNaConta,
} from "./moeda";
import { novoProjetoDefaults } from "@/data/blocos";
import type { Projeto } from "@/types";

const proj = (over: Partial<Projeto> = {}): Projeto => ({
  ...novoProjetoDefaults(),
  cliente: "Agência X",
  projeto: "Campanha",
  numeroServico: "001",
  ...over,
});

// Intl usa espaço estreito não separável entre símbolo e número em pt-BR.
const limpa = (s: string) => s.replace(/ | /g, " ");

describe("moeda da proposta", () => {
  it("projeto sem os campos novos é português em real", () => {
    const p = proj();
    expect(moedaDe(p)).toBe("BRL");
    expect(idiomaDe(p)).toBe("pt");
    expect(propostaInternacional(p)).toBe(false);
  });

  it("valor da proposta em BRL é o próprio valor bruto", () => {
    expect(valorProposta(proj({ valorBruto: 235_000 }))).toBe(235_000);
  });

  it("valor da proposta em moeda estrangeira é o valor na moeda, não o real", () => {
    const p = proj({ moeda: "EUR", valorMoeda: 40_000, cambio: 6.2, valorBruto: 248_000 });
    expect(valorProposta(p)).toBe(40_000);
  });

  it("formata cada moeda com o símbolo certo", () => {
    expect(limpa(formatMoeda(235_000, "BRL"))).toBe("R$ 235.000");
    expect(limpa(formatMoeda(40_000, "EUR", { idioma: "en" }))).toBe("€40,000");
    expect(limpa(formatMoeda(40_000, "GBP", { idioma: "en" }))).toBe("£40,000");
    expect(limpa(formatMoeda(40_000, "USD", { idioma: "en" }))).toBe("$40,000");
  });

  it("o separador segue o idioma do documento, não a moeda", () => {
    // "€ 40.000" lido em inglês parece quarenta euros. Em português, o ponto
    // de milhar é o que a pessoa espera.
    expect(limpa(formatMoeda(40_000, "EUR", { idioma: "pt" }))).toBe("€ 40.000");
    expect(limpa(formatMoeda(40_000, "EUR", { idioma: "en" }))).toBe("€40,000");
  });

  it("proposta não mostra centavos por padrão", () => {
    expect(limpa(formatMoeda(40_000.49, "EUR", { idioma: "en" }))).toBe("€40,000");
  });
});

describe("conversão para real", () => {
  it("valor × câmbio, arredondado ao centavo", () => {
    expect(brlDaProposta(40_000, 6.2345)).toBe(249_380);
    expect(brlDaProposta(1_000, 6.12345)).toBe(6_123.45);
  });

  it("câmbio ausente ou zerado não converte — devolve null", () => {
    // Zero aqui zeraria o DRE inteiro por causa de um campo ainda não
    // preenchido: lucro operacional negativo e margem sem sentido.
    expect(brlDaProposta(40_000, 0)).toBeNull();
    expect(brlDaProposta(40_000, undefined)).toBeNull();
    expect(brlDaProposta(40_000, -1)).toBeNull();
  });

  it("aponta o câmbio pendente só quando a moeda é estrangeira", () => {
    expect(cambioPendente(proj())).toBe(false);
    expect(cambioPendente(proj({ moeda: "EUR" }))).toBe(true);
    expect(cambioPendente(proj({ moeda: "EUR", cambio: 6.2 }))).toBe(false);
  });
});

describe("custo de receber do exterior", () => {
  it("1,88% sobre o valor convertido — spread 0,78 + IOF 1,10", () => {
    expect(custoCambio(248_000, 1.88)).toBe(4662.4);
    expect(liquidoNaConta(248_000, 1.88)).toBe(243_337.6);
  });

  it("o percentual é do projeto, com 1,88 de padrão", () => {
    // IOF muda por decreto e spread varia por banco: cravar no código faria o
    // sistema mentir no dia seguinte a uma mudança de alíquota.
    expect(custoCambioPctDe(proj())).toBe(1.88);
    expect(custoCambioPctDe(proj({ custoCambioPct: 2.5 }))).toBe(2.5);
    expect(custoCambioPctDe(proj({ custoCambioPct: 0 }))).toBe(0);
  });

  it("não mexe no valor bruto — a nota é emitida pelo valor cheio", () => {
    // O custo é despesa financeira, não desconto de receita. Abater aqui faria
    // o imposto ser calculado sobre menos do que a nota vai registrar.
    const p = proj({ moeda: "EUR", valorMoeda: 40_000, cambio: 6.2, valorBruto: 248_000 });
    expect(p.valorBruto).toBe(248_000);
    expect(valorProposta(p)).toBe(40_000);
  });
});
