import { describe, it, expect } from "vitest";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { PedidoDoc } from "./pedido-fornecedor";
import { textoDoPdf } from "./texto-do-pdf";
import { BLOCOS_PADRAO, novoProjetoDefaults } from "@/data/blocos";
import { documentoInicial } from "@/lib/pedido-fornecedor";
import type { PedidoFornecedor, Projeto } from "@/types";

/** O arquivo que o fornecedor abre — não só o que os helpers devolvem. */
const proj = {
  ...novoProjetoDefaults(),
  cliente: "Agencia Sigilosa",
  marca: "Marca Sigilosa",
  projeto: "Verao",
  numeroServico: "ACID-0142",
} as unknown as Projeto;

const pedido = (over: Partial<PedidoFornecedor> = {}): PedidoFornecedor => ({
  ...documentoInicial(proj, { ...BLOCOS_PADRAO, entrega: "Tempo de uso: 12 meses" }, null),
  empresa: "Luz Fotografia Ltda",
  aosCuidados: "Marina Souza",
  id: "pd-1",
  projectId: "pj-1",
  friendId: null,
  numero: 3,
  status: "Rascunho",
  valorCotado: 0,
  criadoEm: "2026-09-22T12:00:00Z",
  enviadoEm: "",
  respondidoEm: "",
  ...over,
});

async function render(p: PedidoFornecedor) {
  const doc = React.createElement(PedidoDoc, { pedido: p, proj }) as React.ReactElement<DocumentProps>;
  return textoDoPdf(await renderToBuffer(doc));
}

describe("PDF do pedido ao fornecedor", () => {
  it("imprime cabeçalho, A/C, código e a especificação herdada", async () => {
    const t = await render(pedido());
    expect(t).toContain("Luz Fotografia Ltda");
    expect(t).toContain("Marina Souza");
    expect(t).toContain("ACID-0142");
    expect(t).toContain("12 meses");
  });

  it("não expõe o cliente enquanto a opção estiver desligada", async () => {
    const t = await render(pedido());
    expect(t).not.toContain("Sigilosa");
    const com = await render(pedido({ mostrarCliente: true }));
    expect(com).toContain("Sigilosa");
  });
});
