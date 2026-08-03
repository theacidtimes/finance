import { describe, it, expect } from "vitest";
import { metaProposta, destinatario, blocosProposta, type ChaveBloco } from "./proposta";
import { novoProjetoDefaults, BLOCOS_PADRAO } from "@/data/blocos";
import type { Projeto, BlocosProposta, MarcoCronograma } from "@/types";

const proj = (over: Partial<Projeto> = {}): Projeto => ({
  ...novoProjetoDefaults(),
  cliente: "Agência X",
  projeto: "Campanha",
  numeroServico: "001",
  data: "2026-08-03",
  validadeProposta: "15 dias",
  ...over,
});

const rotulos = (p: Projeto) => metaProposta(p).map((m) => m.rotulo);
const valor = (p: Projeto, rotulo: string) =>
  metaProposta(p).find((m) => m.rotulo === rotulo)?.valor;

describe("cabeçalho da proposta", () => {
  it("sem marca nem contato, mostra só o essencial", () => {
    expect(rotulos(proj())).toEqual(["Data", "Cliente", "Projeto", "Validade"]);
  });

  it("marca aparece quando o cliente é uma agência", () => {
    const p = proj({ marca: "Vivo" });
    expect(rotulos(p)).toContain("Marca");
    expect(valor(p, "Cliente")).toBe("Agência X");
    expect(valor(p, "Marca")).toBe("Vivo");
  });

  it("marca some quando é igual ao cliente — não repete o mesmo nome", () => {
    expect(rotulos(proj({ marca: "Agência X" }))).not.toContain("Marca");
    // e a comparação não é sensível a caixa nem a espaço sobrando
    expect(rotulos(proj({ marca: "  agência x  " }))).not.toContain("Marca");
  });

  it("contato entra fixo no cabeçalho quando preenchido", () => {
    const p = proj({ contato: "Marina Souza" });
    expect(valor(p, "Contato")).toBe("Marina Souza");
    // vem antes de Projeto e Validade, junto do bloco de identificação
    expect(rotulos(p)).toEqual(["Data", "Cliente", "Contato", "Projeto", "Validade"]);
  });

  it("contato em branco não vira rótulo vazio", () => {
    expect(rotulos(proj({ contato: "   " }))).not.toContain("Contato");
  });

  it("ordem completa com agência, marca e contato", () => {
    const p = proj({ marca: "Vivo", contato: "Marina Souza" });
    expect(rotulos(p)).toEqual([
      "Data",
      "Cliente",
      "Marca",
      "Contato",
      "Projeto",
      "Validade",
    ]);
  });

  it("projeto sai junto do nº de serviço", () => {
    expect(valor(proj(), "Projeto")).toBe("Campanha (001)");
  });
});

const blocosDe = (over: Partial<BlocosProposta> = {}): BlocosProposta => ({
  ...BLOCOS_PADRAO,
  observacoes: "Sem observações extras.",
  ...over,
});

const crono: MarcoCronograma[] = [{ data: "10/08", marco: "Kickoff" }];

/** Só os blocos que saem no PDF, como "n. Título" — é o que o cliente lê. */
const impressos = (
  p: Projeto,
  b: BlocosProposta = blocosDe(),
  c: MarcoCronograma[] = crono
) =>
  Object.values(blocosProposta(p, b, c))
    .filter((x) => x.incluso)
    .map((x) => `${x.n}. ${x.titulo}`);

const numero = (
  chave: ChaveBloco,
  b: BlocosProposta,
  c: MarcoCronograma[] = crono,
  p: Projeto = proj({ condicaoPagamento: "50% na aprovação" })
) => blocosProposta(p, b, c)[chave].n;

describe("blocos da proposta: vazio não ocupa página", () => {
  const cheio = proj({ condicaoPagamento: "50% na aprovação" });

  it("com tudo preenchido, saem os 13 blocos numerados de 1 a 13", () => {
    const lista = impressos(cheio);
    expect(lista).toHaveLength(13);
    expect(lista[0]).toBe("1. Projeto");
    expect(lista[12]).toBe("13. Validade");
  });

  it("bloco em branco não entra na proposta", () => {
    const b = blocosProposta(proj(), blocosDe({ observacoes: "   " }), crono);
    expect(b.observacoes.incluso).toBe(false);
    expect(b.observacoes.n).toBe("");
  });

  it("o que sobra é renumerado em sequência — nunca 1,2,3,4,5,9", () => {
    // O caso da reclamação: cronograma, exclusões e alterações vazios.
    const b = blocosDe({ exclusoes: "", alteracoes: "" });
    const lista = impressos(cheio, b, []);
    expect(lista).toEqual([
      "1. Projeto",
      "2. O serviço inclui",
      "3. Especificação da entrega",
      "4. Investimento",
      "5. Condições de pagamento",
      "6. Observações",
      "7. Cancelamento",
      "8. Imagens e limitações técnicas em IA",
      "9. Materiais de apoio",
      "10. Validade",
    ]);
    // e a numeração é contínua, sem buracos
    expect(lista.map((s) => Number(s.split(".")[0]))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("blocos derivados e fixos nunca somem, mesmo com a proposta toda vazia", () => {
    const vazios: BlocosProposta = {
      servicoInclui: "",
      entrega: "",
      exclusoes: "",
      alteracoes: "",
      observacoes: "",
      clausulaIA: "",
      materiais: "",
    };
    const lista = impressos(proj({ condicaoPagamento: "" }), vazios, []);
    expect(lista).toEqual([
      "1. Projeto",
      "2. Investimento",
      "3. Cancelamento",
      "4. Imagens e limitações técnicas em IA",
      "5. Materiais de apoio",
      "6. Validade",
    ]);
  });

  it("condição de pagamento em branco sai da proposta", () => {
    const b = blocosProposta(proj({ condicaoPagamento: "  " }), blocosDe(), crono);
    expect(b.pagamento.incluso).toBe(false);
    // e o cronograma, que vinha depois, assume o número 5
    expect(b.cronograma.n).toBe("5");
  });

  it("cronograma sem marcos não entra", () => {
    expect(numero("cronograma", blocosDe(), [])).toBe("");
  });

  it("marco adicionado e não preenchido não conta como cronograma", () => {
    const rascunho: MarcoCronograma[] = [{ data: "", marco: "  " }];
    expect(numero("cronograma", blocosDe(), rascunho)).toBe("");
    // basta uma das duas colunas ter conteúdo
    expect(numero("cronograma", blocosDe(), [{ data: "", marco: "Entrega" }])).toBe("6");
  });

  it("o número é o mesmo objeto para tela e PDF — uma chamada, uma verdade", () => {
    const p = proj({ condicaoPagamento: "À vista" });
    const b = blocosDe({ exclusoes: "" });
    expect(blocosProposta(p, b, crono)).toEqual(blocosProposta(p, b, crono));
  });
});

describe("destinatário no corpo da proposta", () => {
  it("é a marca quando existe — o trabalho é para ela", () => {
    expect(destinatario(proj({ marca: "Vivo" }))).toBe("Vivo");
  });

  it("cai no cliente quando não há marca", () => {
    expect(destinatario(proj())).toBe("Agência X");
    expect(destinatario(proj({ marca: "  " }))).toBe("Agência X");
  });
});
