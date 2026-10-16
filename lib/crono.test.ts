import { describe, it, expect } from "vitest";
import {
  calcularCrono,
  modeloProducaoIA,
  aplicarPatchTarefa,
  removerTarefa,
  marcosParaProposta,
  formatDuracao,
  dataCurta,
  ehDiaUtil,
  novaTarefa,
} from "./crono";
import type { CronogramaProducao, TarefaCrono } from "@/types";

/** O cronograma Droga5 + Santander (AI Video TAG), com o status do dia 15/10. */
function droga5(): CronogramaProducao {
  const c = modeloProducaoIA({ cliente: "Droga5", marca: "Santander", inicio: "2026-10-15" });
  c.tarefas[1] = aplicarPatchTarefa(c.tarefas[1], { status: "Concluído" });
  c.tarefas[2] = aplicarPatchTarefa(c.tarefas[2], { pct: 30 });
  return c;
}

describe("cronograma Droga5 + Santander", () => {
  const { linhas, projeto } = calcularCrono(droga5());
  const tabela = linhas.map((l) => [
    l.numero,
    l.tarefa.nome,
    formatDuracao(l.duracao),
    dataCurta(l.inicio),
    dataCurta(l.fim),
    l.predecessoraNumero ?? "",
    Math.round(l.pct),
  ]);

  it("bate linha a linha com a planilha", () => {
    expect(tabela).toEqual([
      [2, "Setup", "2d", "15/10/26", "16/10/26", "", 36],
      [3, "Briefing", "0,5d", "15/10/26", "15/10/26", "", 100],
      [4, "Análise + confecção de proposta comercial", "0,75d", "15/10/26", "16/10/26", 3, 30],
      [5, "Validação/aprovação + envio de assets", "0,75d", "16/10/26", "16/10/26", 4, 0],
      [6, "Criação/Produção AI", "10d", "19/10/26", "30/10/26", "", 0],
      [7, "Produção de stills", "1d", "19/10/26", "19/10/26", 5, 0],
      [8, "Validação", "0,5d", "20/10/26", "20/10/26", 7, 0],
      [9, "Ajustes", "1d", "20/10/26", "21/10/26", 8, 0],
      [10, "Validação", "0,5d", "21/10/26", "21/10/26", 9, 0],
      [11, "Ajustes finais", "1d", "22/10/26", "22/10/26", 10, 0],
      [12, "Motion AI + edit", "2d", "23/10/26", "26/10/26", 11, 0],
      [13, "Validação", "0,5d", "27/10/26", "27/10/26", 12, 0],
      [14, "Ajustes", "1d", "27/10/26", "28/10/26", 13, 0],
      [15, "Validação", "0,5d", "28/10/26", "28/10/26", 14, 0],
      [16, "Ajustes finais", "1d", "29/10/26", "29/10/26", 15, 0],
      [17, "Finalização", "1d", "30/10/26", "30/10/26", 16, 0],
    ]);
  });

  it("linha do projeto: 12 dias úteis, 6% concluído", () => {
    expect(dataCurta(projeto.inicio)).toBe("15/10/26");
    expect(dataCurta(projeto.fim)).toBe("30/10/26");
    expect(projeto.duracao).toBe(12);
    expect(Math.round(projeto.pct)).toBe(6);
  });

  it("aprovação conjunta leva marca + agência", () => {
    expect(linhas[8].tarefa.responsavel).toBe("Santander + Droga5");
    expect(linhas[6].tarefa.responsavel).toBe("Droga5");
  });

  it("entregas da ACID viram marcos da proposta", () => {
    expect(marcosParaProposta(droga5())).toEqual([
      { data: "19/10", marco: "Produção de stills" },
      { data: "26/10", marco: "Motion AI + edit" },
      { data: "30/10", marco: "Finalização" },
    ]);
  });
});

describe("calendário", () => {
  it("fim de semana e feriado não são dia útil", () => {
    expect(ehDiaUtil("2026-10-17", true)).toBe(false); // sábado
    expect(ehDiaUtil("2026-11-02", true)).toBe(false); // Finados
    expect(ehDiaUtil("2026-11-02", false)).toBe(true);
    expect(ehDiaUtil("2027-02-08", true)).toBe(false); // segunda de Carnaval 2027
  });

  it("feriado empurra a tarefa", () => {
    const a: TarefaCrono = { ...novaTarefa(undefined, "tarefa"), nome: "A", duracao: 1 };
    const b: TarefaCrono = { ...novaTarefa(a, "tarefa"), nome: "B", duracao: 1 };
    // 30/10/26 é sexta; 02/11 é Finados → B cai na terça 03/11.
    const c = calcularCrono({ inicio: "2026-10-30", pularFeriados: true, tarefas: [a, b] });
    expect(c.linhas[1].inicio).toBe("2026-11-03");
  });

  it("início no fim de semana começa na segunda", () => {
    const a: TarefaCrono = { ...novaTarefa(undefined, "tarefa"), duracao: 1 };
    const c = calcularCrono({ inicio: "2026-10-17", pularFeriados: true, tarefas: [a] });
    expect(c.linhas[0].inicio).toBe("2026-10-19");
  });

  it("início fixo segura a tarefa mesmo com a predecessora pronta", () => {
    const a: TarefaCrono = { ...novaTarefa(undefined, "tarefa"), duracao: 1 };
    const b: TarefaCrono = { ...novaTarefa(a, "tarefa"), duracao: 1, inicioFixo: "2026-10-22" };
    const c = calcularCrono({ inicio: "2026-10-19", pularFeriados: true, tarefas: [a, b] });
    expect(c.linhas[1].inicio).toBe("2026-10-22");
  });
});

describe("edição", () => {
  it("remover do meio religa a corrente", () => {
    const c = droga5();
    const meio = c.tarefas[7]; // Ajustes
    const depois = removerTarefa(c.tarefas, meio.id);
    const validacao = depois.find((t) => t.predecessora === meio.predecessora && t.id !== meio.id);
    expect(validacao?.nome).toBe("Validação");
    expect(depois.some((t) => t.predecessora === meio.id)).toBe(false);
  });

  it("predecessora circular é ignorada em vez de travar", () => {
    const a: TarefaCrono = { ...novaTarefa(undefined, "tarefa"), duracao: 1 };
    const b: TarefaCrono = { ...novaTarefa(a, "tarefa"), duracao: 1 };
    a.predecessora = b.id;
    const c = calcularCrono({ inicio: "2026-10-19", pularFeriados: true, tarefas: [a, b] });
    expect(c.linhas.some((l) => l.ciclo)).toBe(true);
  });

  it("status e % andam juntos", () => {
    const t = novaTarefa(undefined, "tarefa");
    expect(aplicarPatchTarefa(t, { pct: 100 }).status).toBe("Concluído");
    expect(aplicarPatchTarefa(t, { pct: 40 }).status).toBe("Em andamento");
    expect(aplicarPatchTarefa(t, { status: "Concluído" }).pct).toBe(100);
  });
});
