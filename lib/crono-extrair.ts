import type Anthropic from "@anthropic-ai/sdk";
import type { CronogramaProducao, StatusTarefa, TarefaCrono } from "@/types";
import { calcularCrono, feriadosNoPeriodo, novoIdTarefa, STATUS_TAREFA } from "@/lib/crono";

/**
 * Leitura de um cronograma em PDF (ou print) via Claude.
 *
 * O documento traz datas prontas; o app trabalha com duração + predecessora e
 * calcula as datas. A conversão guarda as duas coisas: importa a duração e a
 * predecessora, e onde a conta do app daria um início ANTES do que o documento
 * diz, fixa o "não antes de" com a data do documento. Assim o cronograma
 * importado bate com o PDF e continua encadeado para os próximos ajustes.
 *
 * Feriado é decidido um a um, pelas datas do documento: o Smartsheet do GP
 * pula o 12/10 e trabalha no 02/11 no mesmo cronograma. Uma regra única
 * ("pula todos") desalinhava tudo depois de Finados.
 */

export { MODELO } from "@/lib/pedido/extrair";

export const SYSTEM_PROMPT = `Você lê cronogramas de produção (Gantt, Smartsheet, planilha, tabela) de uma produtora criativa (ACID / The Acid Times) e transcreve as linhas para a ferramenta.

Regras:
- Transcreva TODAS as linhas na ordem do documento, uma por linha. Não invente linhas nem datas.
- A linha de resumo do projeto inteiro (geralmente a primeira, com o nome do projeto e o período total) NÃO entra.
- "linha" é o número da linha como aparece no documento (coluna #/ID, ou a contagem se não houver). É ele que a coluna de predecessoras referencia.
- "tipo": "fase" para linhas de agrupamento (cabeçalho com tarefas abaixo, em geral destacadas e sem responsável); "tarefa" para o resto.
- "duracao" em dias úteis, número decimal (0,5d → 0.5; 2d → 2). Fase pode ficar 0.
- Datas no formato YYYY-MM-DD. Documento brasileiro usa dd/mm/aa.
- "predecessora": o número da primeira predecessora, ou null.
- "status": converta para "Não iniciado", "Em andamento" ou "Concluído" (Not Started, In Progress, Completed…).
- "pct": percentual concluído, 0 a 100.
- "entrega": true só quando a linha está destacada como entrega/marco principal (negrito, cor mais forte), não para validações ou ajustes.`;

export const FERRAMENTA: Anthropic.Tool = {
  name: "registrar_cronograma",
  description: "Registra as linhas do cronograma lido no documento.",
  input_schema: {
    type: "object",
    properties: {
      tarefas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            linha: { type: "number" },
            tipo: { type: "string", enum: ["fase", "tarefa"] },
            nome: { type: "string" },
            duracao: { type: "number" },
            inicio: { type: "string", description: "YYYY-MM-DD" },
            fim: { type: "string", description: "YYYY-MM-DD" },
            predecessora: { type: ["number", "null"] },
            responsavel: { type: "string" },
            status: { type: "string", enum: STATUS_TAREFA },
            pct: { type: "number" },
            entrega: { type: "boolean" },
          },
          required: ["linha", "tipo", "nome"],
        },
      },
    },
    required: ["tarefas"],
  },
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export interface ResultadoImportacao {
  crono: CronogramaProducao;
  /** Linhas que precisaram de "não antes de" para bater com o documento. */
  fixadas: number;
}

/** Acima disso, combinações demais; feriados além do 8º seguem a regra padrão (pular). */
const MAX_FERIADOS_TESTADOS = 8;

/** Converte a saída da ferramenta num cronograma do app. Null se não houver tarefa. */
export function normalizarCronoExtraido(raw: unknown): ResultadoImportacao | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const linhas = (Array.isArray(o.tarefas) ? o.tarefas : []) as Record<string, unknown>[];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

  const lidas = linhas
    .map((l) => ({
      linha: num(l.linha),
      tipo: (l.tipo === "fase" ? "fase" : "tarefa") as TarefaCrono["tipo"],
      nome: str(l.nome),
      duracao: Math.max(0, num(l.duracao)),
      inicio: ISO.test(str(l.inicio)) ? str(l.inicio) : "",
      fim: ISO.test(str(l.fim)) ? str(l.fim) : "",
      predecessora: l.predecessora == null ? null : num(l.predecessora),
      responsavel: str(l.responsavel),
      status: (STATUS_TAREFA as string[]).includes(str(l.status))
        ? (str(l.status) as StatusTarefa)
        : ("Não iniciado" as StatusTarefa),
      pct: Math.max(0, Math.min(100, num(l.pct))),
      entrega: l.entrega === true,
      id: novoIdTarefa(),
    }))
    .filter((l) => l.nome);
  if (!lidas.some((l) => l.tipo === "tarefa")) return null;

  const idDaLinha = new Map(lidas.map((l) => [l.linha, l.id]));
  const datas = lidas.map((l) => l.inicio).filter(Boolean).sort();
  const inicio = datas[0] ?? new Date().toISOString().slice(0, 10);

  const tarefas: TarefaCrono[] = lidas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    nome: l.nome,
    duracao: l.tipo === "fase" ? 0 : l.duracao,
    predecessora:
      l.tipo === "tarefa" && l.predecessora != null ? idDaLinha.get(l.predecessora) ?? null : null,
    responsavel: l.tipo === "tarefa" ? l.responsavel : "",
    status: l.status,
    pct: l.status === "Concluído" ? 100 : l.pct,
    ...(l.entrega && l.tipo === "tarefa" ? { entrega: true } : {}),
  }));

  const crono: CronogramaProducao = { inicio, pularFeriados: true, tarefas };

  // Quais feriados o documento trabalha: a combinação que mais acerta as datas
  // dele. Empate fica com a que trabalha menos feriados (o padrão é pular).
  const doc = new Map(lidas.map((l) => [l.id, l]));
  const ultimaData = [...datas, ...lidas.map((l) => l.fim).filter(Boolean)].sort().pop() ?? inicio;
  const candidatos = feriadosNoPeriodo(inicio, ultimaData).slice(0, MAX_FERIADOS_TESTADOS);
  const erros = () =>
    calcularCrono(crono).linhas.reduce((n, c) => {
      const d = doc.get(c.tarefa.id);
      if (!d || c.tarefa.tipo !== "tarefa") return n;
      return n + (d.inicio && d.inicio !== c.inicio ? 1 : 0) + (d.fim && d.fim !== c.fim ? 1 : 0);
    }, 0);
  let melhor = { erros: Infinity, trabalhados: [] as string[] };
  for (let mask = 0; mask < 1 << candidatos.length; mask++) {
    const trabalhados = candidatos.filter((_, i) => mask & (1 << i));
    crono.feriadosTrabalhados = trabalhados;
    const e = erros();
    if (e < melhor.erros || (e === melhor.erros && trabalhados.length < melhor.trabalhados.length)) {
      melhor = { erros: e, trabalhados };
    }
  }
  if (melhor.trabalhados.length) crono.feriadosTrabalhados = melhor.trabalhados;
  else delete crono.feriadosTrabalhados;

  // Onde a conta adianta a tarefa em relação ao documento, fixa a data dele.
  // Uma por vez, em ordem: fixar uma empurra as seguintes, que podem deixar de precisar.
  let fixadas = 0;
  for (let guarda = 0; guarda < tarefas.length; guarda++) {
    const { linhas: calc } = calcularCrono(crono);
    const adiantada = calc.find((c) => {
      const d = doc.get(c.tarefa.id)?.inicio;
      return c.tarefa.tipo === "tarefa" && d && c.inicio < d && !c.tarefa.inicioFixo;
    });
    if (!adiantada) break;
    adiantada.tarefa.inicioFixo = doc.get(adiantada.tarefa.id)!.inicio;
    fixadas++;
  }
  return { crono, fixadas };
}
