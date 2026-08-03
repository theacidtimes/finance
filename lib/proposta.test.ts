import { describe, it, expect } from "vitest";
import { metaProposta, destinatario } from "./proposta";
import { novoProjetoDefaults } from "@/data/blocos";
import type { Projeto } from "@/types";

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

describe("destinatário no corpo da proposta", () => {
  it("é a marca quando existe — o trabalho é para ela", () => {
    expect(destinatario(proj({ marca: "Vivo" }))).toBe("Vivo");
  });

  it("cai no cliente quando não há marca", () => {
    expect(destinatario(proj())).toBe("Agência X");
    expect(destinatario(proj({ marca: "  " }))).toBe("Agência X");
  });
});
