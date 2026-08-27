import { describe, it, expect, beforeEach } from "vitest";
import { useProjetoStore } from "./store";

/**
 * O valor em real de um projeto em moeda estrangeira é derivado, não digitado.
 * Se ele sair de sincronia com o preço da proposta, o PDF vai com um número e
 * o DRE, a carteira e o dashboard com outro — sem erro visível em lugar nenhum.
 */
describe("valor bruto em real de proposta em moeda estrangeira", () => {
  const set = useProjetoStore.getState().setProjField;
  const proj = () => useProjetoStore.getState().proj;

  beforeEach(() => {
    set("moeda", "BRL");
    set("valorMoeda", 0);
    set("cambio", 0);
    set("valorBruto", 235_000);
  });

  it("em real, o valor bruto continua sendo digitado direto", () => {
    set("valorBruto", 300_000);
    expect(proj().valorBruto).toBe(300_000);
  });

  it("valor × câmbio define o real assim que os dois existem", () => {
    set("moeda", "EUR");
    set("cambio", 6.2);
    set("valorMoeda", 40_000);
    expect(proj().valorBruto).toBe(248_000);
  });

  it("mudar só o câmbio reconverte o valor já informado", () => {
    set("moeda", "EUR");
    set("valorMoeda", 40_000);
    set("cambio", 6.2);
    expect(proj().valorBruto).toBe(248_000);
    set("cambio", 6.5);
    expect(proj().valorBruto).toBe(260_000);
  });

  it("trocar para moeda estrangeira sem câmbio não zera o valor em real", () => {
    // O câmbio é preenchido depois da moeda. Zerar aqui derrubaria o DRE
    // (margem negativa, lucro operacional negativo) por um campo em branco.
    set("moeda", "EUR");
    expect(proj().valorBruto).toBe(235_000);
  });

  it("voltar para real congela o último valor convertido", () => {
    set("moeda", "EUR");
    set("cambio", 6.2);
    set("valorMoeda", 40_000);
    set("moeda", "BRL");
    expect(proj().valorBruto).toBe(248_000);
  });
});

/**
 * A grade de opções manda no valor do projeto. Se ela e o `valorBruto` saírem
 * de sincronia, o PDF vai com um preço e o DRE, a carteira e o dashboard com
 * outro — sem erro visível em lugar nenhum.
 */
describe("opções comerciais definem o valor do projeto", () => {
  const s = () => useProjetoStore.getState();

  beforeEach(() => {
    s().opcoes.forEach((o) => s().removeOpcao(o.id));
    s().setProjField("moeda", "BRL");
    s().setProjField("cambio", 0);
    s().setProjField("valorMoeda", 0);
    s().setProjField("valorBruto", 235_000);
  });

  const grade = () => {
    [
      ["2 days", 2, 1500],
      ["3 days", 3, 1200],
      ["5 days", 5, 1050],
    ].forEach(([label, qtd, unit]) => {
      s().addOpcao();
      const id = s().opcoes[s().opcoes.length - 1].id;
      s().updateOpcao(id, { label: label as string });
      s().updateOpcao(id, { quantidade: qtd as number });
      s().updateOpcao(id, { valorUnitario: unit as number });
    });
  };

  it("quantidade × unitário preenche o total da linha", () => {
    grade();
    expect(s().opcoes.map((o) => o.valorTotal)).toEqual([3000, 3600, 5250]);
  });

  it("sem condição fechada, o projeto vale a menor", () => {
    grade();
    expect(s().proj.valorBruto).toBe(3000);
  });

  it("fechando uma condição, o valor do projeto sobe sozinho", () => {
    grade();
    s().escolherOpcao(s().opcoes[2].id);
    expect(s().proj.valorBruto).toBe(5250);
  });

  it("removendo a condição fechada, volta a valer a menor", () => {
    grade();
    s().escolherOpcao(s().opcoes[2].id);
    s().removeOpcao(s().opcoes[2].id);
    expect(s().proj.valorBruto).toBe(3000);
  });

  it("em euro, a grade define o preço e o câmbio converte para o DRE", () => {
    s().setProjField("moeda", "EUR");
    s().setProjField("cambio", 6.2);
    grade();
    // €3.000 é o piso da grade; o DRE recebe o equivalente em real.
    expect(s().proj.valorMoeda).toBe(3000);
    expect(s().proj.valorBruto).toBe(18_600);
    s().escolherOpcao(s().opcoes[2].id);
    expect(s().proj.valorMoeda).toBe(5250);
    expect(s().proj.valorBruto).toBe(32_550);
  });

  it("apagando a grade, o valor não zera — fica o último derivado", () => {
    grade();
    // Removendo linha a linha, cada remoção reajusta para a menor restante:
    // 3000 → 3600 → 5250. Sem grade, o último derivado fica de pé em vez de
    // zerar — zerar derrubaria o DRE por causa de uma linha apagada.
    s().opcoes.forEach((o) => s().removeOpcao(o.id));
    expect(s().opcoes).toHaveLength(0);
    expect(s().proj.valorBruto).toBe(5250);

    // E o campo do Cadastro volta a mandar no valor.
    s().setProjField("valorBruto", 235_000);
    expect(s().proj.valorBruto).toBe(235_000);
  });
});

/**
 * O custo de câmbio é despesa financeira: não pode reduzir o valor bruto (a
 * nota sai cheia), mas precisa aparecer no DRE — senão a margem fica ~1,9%
 * acima do real em todo projeto cobrado em moeda estrangeira.
 */
describe("custo de câmbio no DRE", () => {
  const s = () => useProjetoStore.getState();
  const linha = () => s().externos.find((e) => e.nome === "IOF + spread cambial");

  beforeEach(() => {
    s().externos.filter((e) => e.nome === "IOF + spread cambial").forEach((e) => s().removeExterno(e.id));
    s().opcoes.forEach((o) => s().removeOpcao(o.id));
    s().setProjField("moeda", "EUR");
    s().setProjField("cambio", 6.2);
    s().setProjField("custoCambioPct", 1.88);
    s().setProjField("valorMoeda", 40_000);
  });

  it("lança uma linha de custo com 1,88% do valor convertido", () => {
    expect(s().proj.valorBruto).toBe(248_000);
    s().lancarCustoCambio();
    expect(linha()?.valor).toBe(4662.4);
    // Despesa financeira, não produção — mas ainda é dinheiro que sai.
    expect(linha()?.funcao).toBe("Despesa financeira");
  });

  it("não desconta do valor bruto — a nota é emitida pelo valor cheio", () => {
    s().lancarCustoCambio();
    expect(s().proj.valorBruto).toBe(248_000);
  });

  it("mudando o preço, a linha acompanha sozinha", () => {
    s().lancarCustoCambio();
    s().setProjField("valorMoeda", 50_000);
    expect(s().proj.valorBruto).toBe(310_000);
    expect(linha()?.valor).toBe(5828);
  });

  it("mudando o percentual, a linha acompanha", () => {
    s().lancarCustoCambio();
    s().setProjField("custoCambioPct", 2.5);
    expect(linha()?.valor).toBe(6200);
  });

  it("sem a linha lançada, mexer no preço não cria nada", () => {
    // Lançar é decisão explícita; apagar a linha é como se desiste dela. Voltar
    // sozinha tiraria da pessoa a opção de não usar.
    s().setProjField("valorMoeda", 50_000);
    expect(linha()).toBeUndefined();
  });

  it("lançar duas vezes não duplica a linha", () => {
    s().lancarCustoCambio();
    s().lancarCustoCambio();
    expect(s().externos.filter((e) => e.nome === "IOF + spread cambial")).toHaveLength(1);
  });

  it("voltando para real, o custo zera — não há câmbio a pagar", () => {
    s().lancarCustoCambio();
    s().setProjField("moeda", "BRL");
    expect(linha()?.valor).toBe(0);
  });
});
