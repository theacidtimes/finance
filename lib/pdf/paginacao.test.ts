import { describe, it, expect } from "vitest";
import React from "react";
import zlib from "node:zlib";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { PropostaDoc } from "./proposta";
import { BLOCOS_PADRAO, novoProjetoDefaults } from "@/data/blocos";
import type { Projeto } from "@/types";

/**
 * Geometria do PDF gerado.
 *
 * O buraco no pé da página não aparece em teste de unidade nem em contagem de
 * páginas: é preciso olhar onde o texto para. Este arquivo abre o PDF, refaz a
 * pilha de transformações do content stream e mede, página a página, até onde
 * o conteúdo desceu. Serve para provar que bloco comprido quebra em vez de
 * pular inteiro, deixando meia página em branco.
 */

const PAGINA = 841.89;
const RODAPE = 760; // abaixo disso só há o rodapé fixo

/** Multiplicação de matrizes 2D no formato do PDF ([a b c d e f], linha). */
const mul = (a: number[], b: number[]) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

const OP = /^([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) (cm|Tm)$/;

/** Para cada página, a coordenada vertical do texto mais baixo (fora o rodapé). */
function fundoDasPaginas(buf: Buffer): number[] {
  const raw = buf.toString("latin1");
  const fundos: number[] = [];
  const streams = raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g);

  for (const st of streams) {
    let conteudo: string;
    try {
      conteudo = zlib.inflateSync(Buffer.from(st[1], "latin1")).toString("latin1");
    } catch {
      continue; // fontes, imagens
    }
    if (!conteudo.includes("BT")) continue;

    let ctm = [1, 0, 0, 1, 0, 0];
    const pilha: number[][] = [];
    let tm: number[] | null = null;
    const ys: number[] = [];

    for (const linha of conteudo.split("\n")) {
      const s = linha.trim();
      if (s === "q") pilha.push([...ctm]);
      else if (s === "Q") ctm = pilha.pop() ?? ctm;
      else if (s === "ET" && tm) {
        ys.push(mul(tm, ctm)[5]);
        tm = null;
      } else {
        const g = s.match(OP);
        if (!g) continue;
        const m = g.slice(1, 7).map(Number);
        if (g[7] === "cm") ctm = mul(m, ctm);
        else tm = m;
      }
    }

    // Descarta o que cai fora da página: são os poucos nós (link, número de
    // página) cujo empilhamento este parser simplificado não reproduz.
    const validos = ys.filter((y) => y > 0 && y < RODAPE);
    if (validos.length) fundos.push(Math.max(...validos));
  }
  return fundos;
}

const proj = {
  ...novoProjetoDefaults(),
  cliente: "Agência X",
  projeto: "Campanha",
  numeroServico: "001",
  titulo: "Proposta de produção audiovisual",
  condicaoPagamento: "30 dias",
  data: "2026-08-03",
  validadeProposta: "15 dias",
} as unknown as Projeto;

/** Renderiza a proposta com `n` linhas a mais no escopo, para deslocar as quebras. */
async function sobraMaxima(n: number) {
  const enchimento = Array.from({ length: n }, (_, i) => `- Item de escopo ${i + 1}`).join("\n");
  // O componente devolve um <Document>, mas o tipo de PropostaData não coincide
  // com DocumentProps — o cast é só para o renderToBuffer aceitar o elemento.
  const doc = React.createElement(PropostaDoc, {
    proj,
    blocos: {
      ...BLOCOS_PADRAO,
      servicoInclui: `${BLOCOS_PADRAO.servicoInclui}\n${enchimento}`,
      observacoes: "Sem observações.",
    },
    cronograma: [{ data: "10/08", marco: "Kickoff" }],
    receitaBruta: 235000,
  }) as React.ReactElement<DocumentProps>;
  const buf = await renderToBuffer(doc);
  const fundos = fundoDasPaginas(buf);
  // A última página pode acabar onde quiser; as outras é que não podem ter buraco.
  const sobras = fundos.slice(0, -1).map((f) => RODAPE - f);
  return { paginas: fundos.length, sobra: sobras.length ? Math.max(...sobras) : 0 };
}

describe("paginação do PDF", () => {
  /**
   * Guarda contra o pior caso: bloco atômico que não cabe no resto da página,
   * pula inteiro e deixa a página fechando cedo.
   *
   * Honestidade sobre o alcance deste teste: ele mede o fim do conteúdo, não a
   * mancha branca que se vê ao rolar o PDF. Boa parte daquele branco são as
   * margens da própria quebra de página (48pt embaixo + 42pt em cima), que
   * existem por definição num A4 e nenhum ajuste de `wrap` remove.
   */
  it("nenhuma página fecha muito antes do fim, em qualquer tamanho de proposta", async () => {
    const medidas: string[] = [];
    for (let n = 0; n <= 36; n += 4) {
      const { paginas, sobra } = await sobraMaxima(n);
      medidas.push(`+${n} linhas: ${paginas} págs, pior sobra ${sobra.toFixed(0)}pt`);
      // 90pt ≈ 1/9 de página. Acima disso é bloco que pulou, não folga de linha.
      expect(sobra, `com +${n} linhas de escopo`).toBeLessThan(90);
    }
    console.log(medidas.join("\n"));
  }, 60000);
});
