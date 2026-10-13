import { describe, it, expect } from "vitest";
import { limparAutocadastro, conviteAberto, resumirCustosPorFriend } from "./friends";

/**
 * O formulário de autocadastro não tem login: quem tem o link manda o que
 * quiser no corpo da requisição. A limpeza no servidor é a única barreira.
 */
const valido = {
  nome: "Estúdio Luz",
  cnpj: "11.222.333/0001-81",
  razaoSocial: "Luz Fotografia Ltda",
  tipo: "Empresa",
  categorias: ["Fotografia", "Retoque"],
  contato: "Marina Souza",
  email: "marina@luz.com",
  telefone: "11 99999-0000",
  site: "",
  portfolio: "https://luz.com",
  observacoes: "",
  conta: {
    bancoCodigo: "341",
    bancoNome: "Itaú Unibanco S.A.",
    agencia: "1234",
    conta: "56789-0",
    tipoConta: "Corrente",
    pix: "",
  },
};

describe("autocadastro — limpeza do que chega", () => {
  it("cadastro completo passa sem erro, CNPJ só com dígitos", () => {
    const { dados, erros } = limparAutocadastro(valido);
    expect(erros).toEqual([]);
    expect(dados.cnpj).toBe("11222333000181");
    // Na ordem canônica da lista, não na ordem em que foram marcadas.
    expect(dados.categorias).toEqual(["Retoque", "Fotografia"]);
  });

  it("aponta o que falta para o cadastro ser pagável", () => {
    const { erros } = limparAutocadastro({
      ...valido,
      cnpj: "11.222.333/0001-00",
      email: "marina",
      conta: { ...valido.conta, conta: "" },
      categorias: [],
    });
    expect(erros).toHaveLength(4);
  });

  it("descarta categoria, tipo e tipo de conta fora das listas", () => {
    const { dados } = limparAutocadastro({
      ...valido,
      tipo: "Hacker",
      categorias: ["Fotografia", "<script>"],
      conta: { ...valido.conta, tipoConta: "Offshore" },
    });
    expect(dados.tipo).toBe("Empresa");
    expect(dados.categorias).toEqual(["Fotografia"]);
    expect(dados.conta.tipoConta).toBe("Corrente");
  });

  it("não grava campo que não existe no cadastro e corta texto enorme", () => {
    const { dados } = limparAutocadastro({
      ...valido,
      ativo: true,
      receita: { situacao: "ATIVA" },
      observacoes: "x".repeat(10_000),
    });
    expect(dados).not.toHaveProperty("ativo");
    expect(dados).not.toHaveProperty("receita");
    expect(dados.observacoes).toHaveLength(2000);
  });

  it("corpo que não é objeto vira cadastro vazio com erros, não exceção", () => {
    expect(limparAutocadastro(null).erros.length).toBeGreaterThan(0);
    expect(limparAutocadastro("oi").erros.length).toBeGreaterThan(0);
  });
});

describe("validade do link", () => {
  const agora = Date.parse("2026-09-22T12:00:00Z");
  it("aberto enquanto pendente ou recebido e dentro do prazo", () => {
    expect(conviteAberto({ status: "pendente", expiraEm: "2026-10-01" }, agora)).toBe(true);
    expect(conviteAberto({ status: "recebido", expiraEm: "2026-10-01" }, agora)).toBe(true);
  });
  it("fechado quando expirou, foi aprovado ou descartado", () => {
    expect(conviteAberto({ status: "pendente", expiraEm: "2026-09-01" }, agora)).toBe(false);
    expect(conviteAberto({ status: "aprovado", expiraEm: "2026-10-01" }, agora)).toBe(false);
    expect(conviteAberto({ status: "descartado", expiraEm: "2026-10-01" }, agora)).toBe(false);
  });
});

describe("resumirCustosPorFriend", () => {
  const datas = new Map([
    ["p1", "2026-07-25"],
    ["p2", "2026-10-08"],
    ["p3", "2026-10-09"],
  ]);

  it("'Já repassado' soma só o que foi pago", () => {
    const r = resumirCustosPorFriend(
      [
        { friend_id: "f", valor: "15000.00", status: "Pago", project_id: "p1" },
        { friend_id: "f", valor: 8000, status: "Orçado", project_id: "p2" },
        { friend_id: "f", valor: 8000, status: "Aprovado", project_id: "p3" },
      ],
      datas
    ).get("f")!;
    expect(r.total).toBe(15000);
  });

  it("projetos contam todos os vínculos — é o aviso de quem fica órfão ao apagar", () => {
    const r = resumirCustosPorFriend(
      [
        { friend_id: "f", valor: 1, status: "Pago", project_id: "p1" },
        { friend_id: "f", valor: 1, status: "Orçado", project_id: "p3" },
      ],
      datas
    ).get("f")!;
    expect(r.projetos.size).toBe(2);
    expect(r.ultimo).toBe("2026-10-09");
  });

  it("linha sem Friend fica de fora", () => {
    const r = resumirCustosPorFriend(
      [{ friend_id: null, valor: 999, status: "Pago", project_id: "p1" }],
      datas
    );
    expect(r.size).toBe(0);
  });
});
