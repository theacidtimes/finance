import { describe, it, expect } from "vitest";
import {
  condicoesDaProposta,
  especificacaoDoProjeto,
  divergencias,
  documentoInicial,
  proximoNumero,
  codigoPedido,
  metaPedido,
  blocosPedido,
  textoPedido,
  externoDoPedido,
  fichaPreenchida,
} from "./pedido-fornecedor";
import { novoProjetoDefaults, BLOCOS_PADRAO } from "@/data/blocos";
import { novoFriendDefaults } from "./friends";
import { SERVICO_PADRAO, PAGAMENTO_PADRAO } from "@/data/servicos-fornecedor";
import type { CustoExterno, Friend, PedidoFornecedor, Projeto } from "@/types";

const proj = (over: Partial<Projeto> = {}): Projeto => ({
  ...novoProjetoDefaults(),
  cliente: "Agência X",
  marca: "Vivo",
  projeto: "Verão",
  numeroServico: "ACID-0142",
  ...over,
});

const friend = (over: Partial<Friend> = {}): Friend => ({
  ...novoFriendDefaults(),
  id: "fr-1",
  nome: "Estúdio Luz",
  razaoSocial: "Luz Fotografia Ltda",
  contato: "Marina Souza",
  email: "marina@luz.com",
  categorias: ["Fotografia"],
  ...over,
});

const ENTREGA = [
  "Entregável: 10 fotos",
  "Tempo de uso: 12 meses",
  "Mídia: Digital e OOH",
  "Território: Nacional",
  "Trilha: Stock",
].join("\n");

const pedido = (over: Partial<PedidoFornecedor> = {}): PedidoFornecedor => ({
  ...documentoInicial(proj(), { ...BLOCOS_PADRAO, entrega: ENTREGA }, friend()),
  id: "pd-1",
  projectId: "pj-1",
  friendId: "fr-1",
  numero: 2,
  status: "Rascunho",
  valorCotado: 0,
  criadoEm: "2026-09-22T12:00:00Z",
  enviadoEm: "",
  respondidoEm: "",
  ...over,
});

describe("especificação herdada da proposta", () => {
  it("lê as condições de uso da ficha da proposta, em pt e en", () => {
    expect(condicoesDaProposta(ENTREGA)).toEqual({
      "Tempo de uso": "12 meses",
      Mídias: "Digital e OOH",
      Território: "Nacional",
    });
    expect(condicoesDaProposta("Usage term: 6 months\nTerritory: Global")).toEqual({
      "Tempo de uso": "6 months",
      Território: "Global",
    });
  });

  it("dois produtos com prazos diferentes: os dois entram, sem repetir", () => {
    const e = "Tempo de uso: 12 meses\n\nTempo de uso: 3 meses\nTempo de uso: 12 Meses";
    expect(condicoesDaProposta(e)["Tempo de uso"]).toBe("12 meses / 3 meses");
  });

  it("monta a ficha com os campos de sempre, já preenchidos", () => {
    const f = especificacaoDoProjeto(ENTREGA);
    expect(f).toContain("Tempo de uso: 12 meses");
    expect(f).toContain("Mídias: Digital e OOH");
    expect(f).toContain("Suporte: Digital");
    expect(f).toMatch(/^Quantidade:$/m);
    // Trilha é entrega da ACID, não condição do fotógrafo.
    expect(f).not.toContain("Trilha");
  });
});

describe("divergência de direitos", () => {
  it("pedido igual à proposta não acusa nada", () => {
    expect(divergencias(especificacaoDoProjeto(ENTREGA), ENTREGA)).toEqual([]);
  });

  it("acusa prazo menor que o vendido ao cliente", () => {
    const esp = especificacaoDoProjeto(ENTREGA).replace("12 meses", "6 meses");
    expect(divergencias(esp, ENTREGA)).toEqual([
      { campo: "Tempo de uso", cliente: "12 meses", fornecedor: "6 meses" },
    ]);
  });

  it("acusa campo apagado do pedido", () => {
    const esp = "Quantidade: 10\nTempo de uso: 12 meses\nTerritório: Nacional";
    expect(divergencias(esp, ENTREGA).map((d) => d.campo)).toEqual(["Mídias"]);
  });

  it("ignora acento e caixa", () => {
    const esp = "Tempo de uso: 12 MESES\nMídias: digital e ooh\nTerritorio: nacional";
    expect(divergencias(esp, ENTREGA)).toEqual([]);
  });

  it("proposta sem condição de uso não gera alerta", () => {
    expect(divergencias("Quantidade: 3", "Entregável: filme")).toEqual([]);
  });
});

describe("pedido novo", () => {
  it("puxa empresa, A/C e e-mail do Friend", () => {
    const d = documentoInicial(proj(), BLOCOS_PADRAO, friend());
    expect(d.empresa).toBe("Luz Fotografia Ltda");
    expect(d.aosCuidados).toBe("Marina Souza");
    expect(d.email).toBe("marina@luz.com");
    expect(d.pagamento).toBe(PAGAMENTO_PADRAO);
    expect(d.mostrarCliente).toBe(false);
  });

  it("Friend de uma entrega só já vem com o texto padrão dela", () => {
    const d = documentoInicial(proj(), BLOCOS_PADRAO, friend());
    expect(d.servicos).toHaveLength(1);
    expect(d.servicos[0].categoria).toBe("Fotografia");
    expect(d.servicos[0].texto).toBe(SERVICO_PADRAO.Fotografia);
  });

  it("Friend de várias entregas ou avulso começa em Outros", () => {
    const d = documentoInicial(proj(), BLOCOS_PADRAO, friend({ categorias: ["3D", "Motion"] }));
    expect(d.servicos[0].categoria).toBe("Outros");
    expect(documentoInicial(proj(), BLOCOS_PADRAO, null).empresa).toBe("");
  });

  it("numeração segue o maior número, mesmo com buraco", () => {
    expect(proximoNumero([])).toBe(1);
    expect(proximoNumero([{ numero: 1 }, { numero: 4 }])).toBe(5);
  });

  it("código usa o nº de serviço quando existe", () => {
    expect(codigoPedido({ numeroServico: "ACID-0142" }, 2)).toBe("ACID-0142 · F02");
    expect(codigoPedido({ numeroServico: "" }, 12)).toBe("F12");
  });
});

describe("documento", () => {
  it("cabeçalho não mostra o cliente por padrão", () => {
    const rot = metaPedido(pedido(), proj()).map((m) => m.rotulo);
    expect(rot).toEqual(["Data", "Pedido", "Empresa", "A/C", "Projeto"]);
  });

  it("com cliente ligado, mostra agência e marca", () => {
    const m = metaPedido(pedido({ mostrarCliente: true, prazoResposta: "25/09" }), proj());
    expect(m.find((x) => x.rotulo === "Cliente")?.valor).toBe("Agência X / Vivo");
    expect(m.at(-1)).toEqual({ rotulo: "Responder até", valor: "25/09" });
  });

  it("bloco vazio sai e os outros são renumerados", () => {
    const b = blocosPedido(pedido({ modelo: "", observacoes: "" }));
    expect(b.map((x) => x.titulo)).toEqual([
      "Projeto / parceria",
      "Serviços necessários",
      "Especificação",
      "Pagamento",
      "O orçamento deve conter",
    ]);
    expect(b.map((x) => x.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it("especificação imprime só o que foi preenchido", () => {
    expect(fichaPreenchida("Quantidade:\nTempo de uso: 12 meses\n\nSuporte: Digital")).toBe(
      "Tempo de uso: 12 meses\nSuporte: Digital"
    );
  });

  it("serviço sem texto não entra", () => {
    const p = pedido();
    p.servicos = [...p.servicos, { id: "x", categoria: "Outros", texto: "  " }];
    const s = blocosPedido(p).find((b) => b.tipo === "servicos");
    expect(s && s.tipo === "servicos" && s.servicos).toHaveLength(1);
  });

  it("execução junta data/local e entrega", () => {
    const b = blocosPedido(pedido({ execucao: "30/09, SP", prazoEntrega: "07/10" }));
    const e = b.find((x) => x.titulo === "Execução e entrega");
    expect(e && e.tipo === "ficha" && e.texto).toBe("Data e local: 30/09, SP\nEntrega: 07/10");
  });

  it("texto para e-mail sai dos mesmos blocos", () => {
    const t = textoPedido(pedido({ prazoResposta: "25/09" }), proj());
    expect(t.startsWith("Olá, Marina!")).toBe(true);
    expect(t).toContain("ACID-0142 · F02");
    expect(t).toContain("3. SERVIÇOS NECESSÁRIOS");
    expect(t).toContain(`• Fotografia — ${SERVICO_PADRAO.Fotografia}`);
    expect(t).toContain("Pedimos o retorno até 25/09.");
  });
});

describe("aprovação vira custo externo", () => {
  it("cria a linha com o valor cotado, Friend e vínculo com o pedido", () => {
    const e = externoDoPedido(pedido({ valorCotado: 8500 }), friend());
    expect(e).toMatchObject({
      nome: "Estúdio Luz",
      categoria: "Fotografia",
      funcao: "Fotografia",
      valor: 8500,
      status: "Aprovado",
      friendId: "fr-1",
      pedidoId: "pd-1",
    });
  });

  it("fornecedor avulso usa o nome da empresa do pedido", () => {
    const e = externoDoPedido(pedido({ friendId: null, empresa: "Foto Avulsa" }), null);
    expect(e.nome).toBe("Foto Avulsa");
    expect(e.friendId).toBeNull();
  });

  it("reaprovar atualiza o valor sem perder o que a equipe lançou na linha", () => {
    const existente: CustoExterno = {
      id: "ex-9",
      nome: "Estúdio Luz",
      funcao: "Still",
      categoria: "Retoque",
      valor: 8500,
      status: "Pago",
      nf: true,
      dataPagamento: "2026-10-01",
      obs: "pago no dia",
      friendId: "fr-1",
      pedidoId: "pd-1",
    };
    const e = externoDoPedido(pedido({ valorCotado: 9000 }), friend(), existente);
    expect(e).toMatchObject({
      valor: 9000,
      status: "Pago",
      nf: true,
      funcao: "Still",
      categoria: "Retoque",
      obs: "pago no dia",
    });
  });
});

describe("descrição inicial", () => {
  it("não leva a marca, que a frase da proposta levaria", async () => {
    const { descricaoNeutra } = await import("./pedido-fornecedor");
    expect(descricaoNeutra(proj({ tipo: "Filme" }))).toBe("Verão — Filme.");
    expect(descricaoNeutra(proj({ tipo: "Outro" }))).toBe("Verão.");
    expect(documentoInicial(proj(), BLOCOS_PADRAO, null).descricao).not.toContain("Vivo");
  });
});
