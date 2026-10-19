import { describe, it, expect } from "vitest";
import { normalizarCronoExtraido } from "./crono-extrair";
import { calcularCrono, dataCurta } from "./crono";

/** O que a IA devolve lendo o PDF Droga5 + Santander (linha 1 = projeto, fora). */
const droga5 = {
  tarefas: [
    [2, "fase", "Setup", 2, "2026-10-15", null, "", "Não iniciado", 36],
    [3, "tarefa", "Briefing", 0.5, "2026-10-15", null, "Droga5", "Concluído", 100],
    [4, "tarefa", "Análise + Confecção de Proposta Comercial", 0.75, "2026-10-15", 3, "The Acid Times", "Em andamento", 30],
    [5, "tarefa", "Validação/Aprovação + Envio de assets", 0.75, "2026-10-16", 4, "Droga5", "Não iniciado", 0],
    [6, "fase", "Criação/Produção AI", 10, "2026-10-19", null, "", "Não iniciado", 0],
    [7, "tarefa", "Produção de stills", 1, "2026-10-19", 5, "The Acid Times", "Não iniciado", 0, true],
    [8, "tarefa", "Validação", 0.5, "2026-10-20", 7, "Droga5", "Não iniciado", 0],
    [9, "tarefa", "Ajustes", 1, "2026-10-20", 8, "The Acid Times", "Não iniciado", 0],
    [10, "tarefa", "Validação", 0.5, "2026-10-21", 9, "Santander + Droga5", "Não iniciado", 0],
    [11, "tarefa", "Ajustes finais", 1, "2026-10-22", 10, "The Acid Times", "Não iniciado", 0],
    [12, "tarefa", "Motion AI + Edit", 2, "2026-10-23", 11, "The Acid Times", "Não iniciado", 0, true],
    [13, "tarefa", "Validação", 0.5, "2026-10-27", 12, "Santander + Droga5", "Não iniciado", 0],
    [14, "tarefa", "Ajustes", 1, "2026-10-27", 13, "The Acid Times", "Não iniciado", 0],
    [15, "tarefa", "Validação", 0.5, "2026-10-28", 14, "Santander + Droga5", "Não iniciado", 0],
    [16, "tarefa", "Ajustes finais", 1, "2026-10-29", 15, "The Acid Times", "Não iniciado", 0],
    [17, "tarefa", "Finalização", 1, "2026-10-30", 16, "The Acid Times", "Não iniciado", 0, true],
  ].map(([linha, tipo, nome, duracao, inicio, predecessora, responsavel, status, pct, entrega]) => ({
    linha, tipo, nome, duracao, inicio, predecessora, responsavel, status, pct, entrega,
  })),
};

describe("importar cronograma lido do PDF", () => {
  it("Droga5: encadeia tudo, sem precisar fixar data, e bate com o PDF", () => {
    const r = normalizarCronoExtraido(droga5)!;
    expect(r.fixadas).toBe(0);
    const { linhas, projeto } = calcularCrono(r.crono);
    expect(linhas.map((l) => [l.numero, dataCurta(l.inicio), dataCurta(l.fim), l.predecessoraNumero])).toEqual([
      [2, "15/10/26", "16/10/26", null],
      [3, "15/10/26", "15/10/26", null],
      [4, "15/10/26", "16/10/26", 3],
      [5, "16/10/26", "16/10/26", 4],
      [6, "19/10/26", "30/10/26", null],
      [7, "19/10/26", "19/10/26", 5],
      [8, "20/10/26", "20/10/26", 7],
      [9, "20/10/26", "21/10/26", 8],
      [10, "21/10/26", "21/10/26", 9],
      [11, "22/10/26", "22/10/26", 10],
      [12, "23/10/26", "26/10/26", 11],
      [13, "27/10/26", "27/10/26", 12],
      [14, "27/10/26", "28/10/26", 13],
      [15, "28/10/26", "28/10/26", 14],
      [16, "29/10/26", "29/10/26", 15],
      [17, "30/10/26", "30/10/26", 16],
    ]);
    expect(Math.round(projeto.pct)).toBe(6);
    expect(r.crono.tarefas.filter((t) => t.entrega).map((t) => t.nome)).toEqual([
      "Produção de stills",
      "Motion AI + Edit",
      "Finalização",
    ]);
  });

  it("tarefa sem predecessora começando depois do início ganha data fixa", () => {
    const r = normalizarCronoExtraido({
      tarefas: [
        { linha: 1, tipo: "tarefa", nome: "Briefing", duracao: 1, inicio: "2026-10-19" },
        { linha: 2, tipo: "tarefa", nome: "Captação", duracao: 1, inicio: "2026-10-22" },
      ],
    })!;
    expect(r.fixadas).toBe(1);
    expect(calcularCrono(r.crono).linhas[1].inicio).toBe("2026-10-22");
  });

  it("documento sem tarefa não vira cronograma", () => {
    expect(normalizarCronoExtraido({ tarefas: [] })).toBeNull();
    expect(normalizarCronoExtraido(null)).toBeNull();
  });
});

/** Smartsheet do GP: Droga5 + Santander - AI Video - Simulador DU (out/2026). */
const simulador = [
  [2, "fase", "Setup", 8, "2026-10-09", "2026-10-21", null, "", "Não iniciado", 69],
  [3, "tarefa", "Briefing", 1, "2026-10-09", "2026-10-09", null, "Droga5", "Concluído", 100],
  [4, "tarefa", "Análise + Confecção de Proposta Comercial", 2, "2026-10-13", "2026-10-14", 3, "The Acid Times", "Concluído", 100],
  [5, "tarefa", "Validação/Aprovação", 2.5, "2026-10-15", "2026-10-19", 4, "Droga5", "Concluído", 100],
  [6, "tarefa", "Kickoff", 0.5, "2026-10-19", "2026-10-19", 5, "The Acid Times", "Em andamento", 0],
  [7, "tarefa", "Envio de assets", 2, "2026-10-20", "2026-10-21", 6, "Droga5", "Em andamento", 0],
  [8, "fase", "Criação/Produção AI", 17, "2026-10-20", "2026-11-11", null, "", "Não iniciado", 0],
  [9, "tarefa", "Produção de stills", 3, "2026-10-20", "2026-10-22", 6, "The Acid Times", "Não iniciado", 0],
  [10, "tarefa", "Validação", 0.5, "2026-10-23", "2026-10-23", 9, "Droga5", "Não iniciado", 0],
  [11, "tarefa", "Ajustes", 1, "2026-10-23", "2026-10-26", 10, "The Acid Times", "Não iniciado", 0],
  [12, "tarefa", "Validação", 0.5, "2026-10-26", "2026-10-26", 11, "Santander + Droga5", "Não iniciado", 0],
  [13, "tarefa", "Ajustes finais", 1, "2026-10-27", "2026-10-27", 12, "The Acid Times", "Não iniciado", 0],
  [14, "tarefa", "Aprovação", 0.5, "2026-10-28", "2026-10-28", 13, "Santander + Droga5", "Não iniciado", 0],
  [15, "tarefa", "Motion AI + Edit", 4, "2026-10-28", "2026-11-03", 14, "The Acid Times", "Não iniciado", 0],
  [16, "tarefa", "Validação", 0.5, "2026-11-03", "2026-11-03", 15, "Droga5", "Não iniciado", 0],
  [17, "tarefa", "Ajustes", 1, "2026-11-04", "2026-11-04", 16, "The Acid Times", "Não iniciado", 0],
  [18, "tarefa", "Validação", 0.5, "2026-11-05", "2026-11-05", 17, "Santander + Droga5", "Não iniciado", 0],
  [19, "tarefa", "Ajustes finais", 1, "2026-11-05", "2026-11-06", 18, "The Acid Times", "Não iniciado", 0],
  [20, "tarefa", "Aprovação", 0.5, "2026-11-06", "2026-11-06", 19, "Santander + Droga5", "Não iniciado", 0],
  [21, "tarefa", "Finalização", 1, "2026-11-09", "2026-11-09", 20, "The Acid Times", "Não iniciado", 0],
  [22, "tarefa", "Validação", 0.5, "2026-11-10", "2026-11-10", 21, "Droga5", "Não iniciado", 0],
  [23, "tarefa", "Ajustes", 1, "2026-11-10", "2026-11-11", 22, "The Acid Times", "Não iniciado", 0],
  [24, "tarefa", "Export/Entrega final", 0.5, "2026-11-11", "2026-11-11", 23, "The Acid Times", "Não iniciado", 0],
];

describe("importar o Simulador DU (pula 12/10, trabalha 02/11)", () => {
  const r = normalizarCronoExtraido({
    tarefas: simulador.map(([linha, tipo, nome, duracao, inicio, fim, predecessora, responsavel, status, pct]) => ({
      linha, tipo, nome, duracao, inicio, fim, predecessora, responsavel, status, pct,
    })),
  })!;
  const { linhas, projeto } = calcularCrono(r.crono);

  it("descobre que Finados foi trabalhado e o 12/10 não", () => {
    expect(r.crono.feriadosTrabalhados).toEqual(["2026-11-02"]);
    expect(r.fixadas).toBe(0);
  });

  it("todas as datas batem com o Smartsheet", () => {
    expect(linhas.map((l) => [l.numero, l.inicio, l.fim])).toEqual(
      simulador.map((s) => [s[0], s[4], s[5]])
    );
    expect(projeto.duracao).toBe(23);
  });
});
