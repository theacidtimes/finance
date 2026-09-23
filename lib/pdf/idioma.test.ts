import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { PropostaDoc, type PropostaData } from "./proposta";
import { textoDoPdf } from "./texto-do-pdf";
import { BLOCOS_PADRAO, novoProjetoDefaults } from "@/data/blocos";
import type { Projeto, OpcaoComercial } from "@/types";

/**
 * O que sai impresso, e não o que os helpers devolvem.
 *
 * A tradução é feita por `lib/proposta.ts` e `data/textos-en.ts`, e os testes
 * de unidade cobrem as funções. Falta o elo final: alguém pode traduzir a tela
 * e esquecer o PDF — que é o arquivo que o cliente abre. Este teste renderiza o
 * documento de verdade e lê as strings de dentro dele.
 */

const base = {
  ...novoProjetoDefaults(),
  cliente: "Agency X",
  projeto: "Campaign",
  numeroServico: "001",
  titulo: "Audiovisual production proposal",
  condicaoPagamento: "50% upfront",
  data: "2026-08-03",
} as unknown as Projeto;

async function render(
  over: Partial<Projeto>,
  extra: Partial<Omit<PropostaData, "proj">> = {}
) {
  const doc = React.createElement(PropostaDoc, {
    proj: { ...base, ...over },
    blocos: BLOCOS_PADRAO,
    cronograma: [],
    ...extra,
  }) as React.ReactElement<DocumentProps>;
  return textoDoPdf(await renderToBuffer(doc));
}

describe("PDF da proposta em inglês e euro", () => {
  it("imprime títulos, moeda e termos em inglês", async () => {
    const texto = await render({
      idiomaProposta: "en",
      moeda: "EUR",
      valorMoeda: 40_000,
      cambio: 6.2,
      valorBruto: 248_000,
      validadeProposta: "15 days",
    });

    // Cabeçalho e títulos de bloco.
    expect(texto).toContain("Client");
    expect(texto).toContain("INVESTMENT");
    expect(texto).toContain("Total project investment");

    // O preço é o da moeda do cliente — nunca o valor em real do DRE.
    // O "\u0080" é o euro em WinAnsiEncoding, que é como a Helvetica embutida
    // grava o símbolo: se um dia a fonte do PDF mudar e o glifo sumir, o
    // cliente recebe "40,000" sem moeda nenhuma — e este teste quebra antes.
    expect(texto).toContain("\u008040,000");
    expect(texto).not.toContain("248,000");
    expect(texto).not.toContain("248.000");

    // Termos e condições: o texto-mestre traduzido, não o português.
    expect(texto).toContain("This proposal is valid for 15 days");
    expect(texto).toContain("artificial intelligence");
    expect(texto).not.toContain("Esta proposta");
    expect(texto).not.toContain("inteligência");
  });

  it("projeto sem os campos novos imprime exatamente como antes", async () => {
    const texto = await render({ valorBruto: 235_000, validadeProposta: "15 dias" });
    expect(texto).toContain("INVESTIMENTO");
    expect(texto).toContain("235.000");
    expect(texto).toContain("Esta proposta é válida por 15 dias");
    expect(texto).not.toContain("Total project investment");
  });
});

describe("PDF da proposta com grade de condições", () => {
  const grade: OpcaoComercial[] = [
    { id: 1, label: "2 days", quantidade: 2, valorUnitario: 1500, valorTotal: 3000, escolhida: false },
    { id: 2, label: "3 days", quantidade: 3, valorUnitario: 1200, valorTotal: 3600, escolhida: false },
    { id: 3, label: "5 days", quantidade: 5, valorUnitario: 1050, valorTotal: 5250, escolhida: false },
  ];

  it("imprime a tabela no lugar da caixa de valor único", async () => {
    const texto = await render(
      { idiomaProposta: "en", moeda: "EUR", valorMoeda: 3000, cambio: 6.2, valorBruto: 18_600 },
      { opcoes: grade }
    );

    // O cabeçalho da tabela sai em caixa alta, como todo título no documento.
    expect(texto).toContain("BOOKING");
    expect(texto).toContain("DAY RATE");
    expect(texto).toContain("TOTAL FEE");
    for (const total of ["3,000", "3,600", "5,250"]) expect(texto).toContain(total);

    // A caixa de valor único não pode aparecer junto — seria um segundo preço
    // no mesmo bloco, e o cliente não saberia qual vale.
    expect(texto).not.toContain("Total project investment");
    // E nunca o valor em real do DRE.
    expect(texto).not.toContain("18,600");
  });

  it("sem grade, segue imprimindo a caixa de valor único", async () => {
    const texto = await render({ valorBruto: 235_000 }, { opcoes: [] });
    expect(texto).toContain("Investimento total do projeto");
    expect(texto).toContain("235.000");
    expect(texto).not.toContain("Booking");
  });

  it("cláusula de IA desligada sai do documento e a numeração fecha", async () => {
    const texto = await render({ idiomaProposta: "en", semClausulaIA: true });
    expect(texto).not.toContain("artificial intelligence");
    expect(texto).not.toContain("AI IMAGERY");

    // Sem buraco na sequência: tirar um bloco renumera os seguintes, senão o
    // cliente recebe uma proposta que pula do 8 para o 10.
    const numeros = [...texto.matchAll(/(\d+)\s*\.\s+[A-Z][A-Z ]{4,}/g)].map((m) => Number(m[1]));
    expect(numeros.length).toBeGreaterThan(5);
    expect([...numeros].sort((a, b) => a - b)).toEqual(
      Array.from({ length: numeros.length }, (_, i) => i + 1)
    );
  });

  it("bloco Projeto imprime o texto escrito, não a frase derivada", async () => {
    const texto = await render(
      { idiomaProposta: "en", projeto: "Nike Football", marca: "Nike" },
      {
        blocos: {
          ...BLOCOS_PADRAO,
          projeto: "We will create animation explorations from supplied athlete stills.",
        },
      }
    );
    expect(texto).toContain("animation explorations");
    expect(texto).not.toContain("Nike Football — Film.");
  });
});
