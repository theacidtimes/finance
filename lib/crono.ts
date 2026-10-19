/**
 * Cronograma de produção — a conta das datas.
 *
 * Mesma lógica de um Smartsheet/Gantt: cada tarefa tem uma duração em dias
 * úteis (com fração: 0,5 é meio período) e, opcionalmente, uma predecessora.
 * A tarefa começa quando a predecessora termina; as datas saem daí, nunca são
 * digitadas. Fase não tem duração própria: vai do começo da primeira tarefa
 * dela até o fim da última.
 *
 * O tempo corre em "dias úteis desde o início do projeto" (um número
 * contínuo): 0 é a manhã do 1º dia, 0,5 é o meio dele, 1 é a manhã do 2º.
 * Meio dia + 0,75 termina no começo da tarde do dia seguinte — e a tarefa
 * seguinte começa ali, no mesmo dia, e não na manhã seguinte.
 */
import type { CronogramaProducao, MarcoCronograma, StatusTarefa, TarefaCrono } from "@/types";

export const STATUS_TAREFA: StatusTarefa[] = ["Não iniciado", "Em andamento", "Concluído"];

/** Quem assina a ACID no cronograma. É o nome que o cliente reconhece. */
export const RESPONSAVEL_ACID = "The Acid Times";

/* ---------------- calendário ---------------- */

const DIA_MS = 86_400_000;

/** "2026-10-15" → dia em UTC. Trabalhar em UTC evita o fuso empurrar a data. */
function parseISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function somaDias(iso: string, n: number): string {
  return toISO(new Date(parseISO(iso).getTime() + n * DIA_MS));
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): string {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const cacheFeriados = new Map<number, Set<string>>();

/**
 * Feriados nacionais + Carnaval (segunda e terça) e Corpus Christi.
 * Carnaval e Corpus Christi não são feriado federal, mas produção não roda
 * neles — contar como dia útil é prometer entrega que ninguém vai fazer.
 */
export function feriados(ano: number): Set<string> {
  const pronto = cacheFeriados.get(ano);
  if (pronto) return pronto;
  const p = pascoa(ano);
  const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];
  const set = new Set<string>([
    ...fixos.map((md) => `${ano}-${md}`),
    somaDias(p, -48), // segunda de Carnaval
    somaDias(p, -47), // terça de Carnaval
    somaDias(p, -2), // Sexta-feira Santa
    somaDias(p, 60), // Corpus Christi
  ]);
  cacheFeriados.set(ano, set);
  return set;
}

/** Dia útil do ponto de vista do cronograma: fim de semana nunca; feriado, depende. */
export function ehDiaUtil(
  iso: string,
  pularFeriados: boolean,
  trabalhados: readonly string[] = []
): boolean {
  const d = parseISO(iso);
  const sem = d.getUTCDay();
  if (sem === 0 || sem === 6) return false;
  const dia = toISO(d);
  return !(pularFeriados && feriados(d.getUTCFullYear()).has(dia) && !trabalhados.includes(dia));
}

/** Atalho com a regra do próprio cronograma. */
export function diaUtilNoCrono(iso: string, crono: CronogramaProducao): boolean {
  return ehDiaUtil(iso, crono.pularFeriados, crono.feriadosTrabalhados);
}

/** O próprio dia, se for útil; senão o próximo útil. */
export function proximoDiaUtil(
  iso: string,
  pularFeriados: boolean,
  trabalhados: readonly string[] = []
): string {
  let d = iso.slice(0, 10);
  for (let i = 0; i < 30 && !ehDiaUtil(d, pularFeriados, trabalhados); i++) d = somaDias(d, 1);
  return d;
}

/** Feriados que caem em dia de semana entre duas datas — os únicos que mudam a conta. */
export function feriadosNoPeriodo(inicio: string, fim: string): string[] {
  const out: string[] = [];
  const ini = parseISO(inicio).getUTCFullYear();
  const ate = parseISO(fim).getUTCFullYear();
  for (let ano = ini; ano <= ate; ano++) {
    for (const f of feriados(ano)) {
      const sem = parseISO(f).getUTCDay();
      if (f >= inicio.slice(0, 10) && f <= fim.slice(0, 10) && sem !== 0 && sem !== 6) out.push(f);
    }
  }
  return out.sort();
}

/** Calendário de um cronograma: índice de dia útil ↔ data. */
class Calendario {
  private dias: string[];
  constructor(
    inicio: string,
    private pularFeriados: boolean,
    private trabalhados: readonly string[] = []
  ) {
    this.dias = [proximoDiaUtil(inicio, pularFeriados, trabalhados)];
  }
  /** Data do n-ésimo dia útil (0 = primeiro dia do projeto). */
  dia(n: number): string {
    const i = Math.max(0, Math.floor(n));
    while (this.dias.length <= i) {
      const ultimo = this.dias[this.dias.length - 1];
      this.dias.push(proximoDiaUtil(somaDias(ultimo, 1), this.pularFeriados, this.trabalhados));
    }
    return this.dias[i];
  }
  /** Índice do dia útil em que cai a data (fim de semana conta como o próximo útil). */
  indice(iso: string): number {
    const alvo = proximoDiaUtil(iso, this.pularFeriados, this.trabalhados);
    if (alvo <= this.dias[0]) return 0;
    let n = 0;
    while (this.dia(n) < alvo && n < 5000) n++;
    return n;
  }
}

/* ---------------- cálculo ---------------- */

/** Folga para fração binária: 0,5 + 0,75 + 0,75 tem que dar 2, não 1,9999. */
const EPS = 1e-6;

export interface LinhaCrono {
  tarefa: TarefaCrono;
  /** Número da linha, como na planilha: a 1 é o projeto, as tarefas começam na 2. */
  numero: number;
  /** 1 = fase ou tarefa solta; 2 = tarefa dentro de fase. */
  nivel: 1 | 2;
  inicio: string;
  fim: string;
  /** Fase: dias úteis do primeiro ao último dia. Tarefa: a duração digitada. */
  duracao: number;
  pct: number;
  /** Número da linha predecessora, para exibir. */
  predecessoraNumero: number | null;
  /** A predecessora formaria um ciclo e foi ignorada. */
  ciclo: boolean;
}

export interface ResumoCrono {
  inicio: string;
  fim: string;
  duracao: number;
  pct: number;
}

export interface CronoCalculado {
  linhas: LinhaCrono[];
  projeto: ResumoCrono;
}

/** Média ponderada pela duração — é como a planilha soma o % de uma fase. */
function pctPonderado(tarefas: TarefaCrono[]): number {
  if (!tarefas.length) return 0;
  const peso = tarefas.reduce((a, t) => a + Math.max(0, t.duracao), 0);
  if (peso <= 0) return tarefas.reduce((a, t) => a + t.pct, 0) / tarefas.length;
  return tarefas.reduce((a, t) => a + t.pct * Math.max(0, t.duracao), 0) / peso;
}

export function calcularCrono(crono: CronogramaProducao): CronoCalculado {
  const cal = new Calendario(crono.inicio, crono.pularFeriados, crono.feriadosTrabalhados);
  const tarefas = crono.tarefas;
  const porId = new Map(tarefas.map((t) => [t.id, t]));

  // Filhos de cada fase: as tarefas abaixo dela até a próxima fase.
  const filhos = new Map<string, TarefaCrono[]>();
  const faseDe = new Map<string, string>();
  let faseAtual: string | null = null;
  for (const t of tarefas) {
    if (t.tipo === "fase") {
      faseAtual = t.id;
      filhos.set(t.id, []);
    } else if (faseAtual) {
      filhos.get(faseAtual)!.push(t);
      faseDe.set(t.id, faseAtual);
    }
  }

  const memo = new Map<string, { ini: number; fim: number }>();
  const ciclos = new Set<string>();
  const visitando = new Set<string>();

  /** Onde a tarefa pode começar: depois da predecessora e não antes do início fixo. */
  const piso = (t: TarefaCrono): number => {
    let ini = 0;
    if (t.inicioFixo) ini = Math.max(ini, cal.indice(t.inicioFixo));
    if (t.predecessora && porId.has(t.predecessora)) {
      const p = janela(t.predecessora);
      if (p) ini = Math.max(ini, p.fim);
      else ciclos.add(t.id);
    }
    return ini;
  };

  function janela(id: string): { ini: number; fim: number } | null {
    const pronto = memo.get(id);
    if (pronto) return pronto;
    if (visitando.has(id)) return null;
    const t = porId.get(id);
    if (!t) return null;
    visitando.add(id);
    let r: { ini: number; fim: number };
    if (t.tipo === "fase") {
      const fs = (filhos.get(id) ?? []).map((f) => janela(f.id)).filter(Boolean) as {
        ini: number;
        fim: number;
      }[];
      if (fs.length) {
        r = { ini: Math.min(...fs.map((f) => f.ini)), fim: Math.max(...fs.map((f) => f.fim)) };
      } else {
        const ini = piso(t);
        r = { ini, fim: ini };
      }
    } else {
      const ini = piso(t);
      r = { ini, fim: ini + Math.max(0, Number(t.duracao) || 0) };
    }
    visitando.delete(id);
    memo.set(id, r);
    return r;
  }

  const datas = (j: { ini: number; fim: number }) => {
    const iniDia = Math.floor(j.ini + EPS);
    const fimDia = Math.max(iniDia, Math.ceil(j.fim - EPS) - 1);
    return { inicio: cal.dia(iniDia), fim: cal.dia(fimDia), dias: fimDia - iniDia + 1 };
  };

  const numero = new Map(tarefas.map((t, i) => [t.id, i + 2]));
  const linhas: LinhaCrono[] = tarefas.map((t) => {
    const j = janela(t.id) ?? { ini: 0, fim: 0 };
    const d = datas(j);
    const fase = t.tipo === "fase";
    const pred = t.predecessora && porId.has(t.predecessora) ? t.predecessora : null;
    return {
      tarefa: t,
      numero: numero.get(t.id)!,
      nivel: !fase && faseDe.has(t.id) ? 2 : 1,
      inicio: d.inicio,
      fim: d.fim,
      duracao: fase ? ((filhos.get(t.id) ?? []).length ? d.dias : 0) : t.duracao,
      pct: fase ? pctPonderado(filhos.get(t.id) ?? []) : t.pct,
      predecessoraNumero: pred ? numero.get(pred)! : null,
      ciclo: ciclos.has(t.id),
    };
  });

  const folhas = tarefas.filter((t) => t.tipo === "tarefa");
  const js = folhas.map((t) => memo.get(t.id)!).filter(Boolean);
  const total = js.length
    ? datas({ ini: Math.min(...js.map((j) => j.ini)), fim: Math.max(...js.map((j) => j.fim)) })
    : datas({ ini: 0, fim: 0 });
  return {
    linhas,
    projeto: {
      inicio: total.inicio,
      fim: total.fim,
      duracao: js.length ? total.dias : 0,
      pct: pctPonderado(folhas),
    },
  };
}

/* ---------------- formatação ---------------- */

/** 0,5 → "0,5d"; 12 → "12d". */
export function formatDuracao(n: number): string {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}d`;
}

/** "2026-10-15" → "15/10/26". */
export function dataCurta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** "2026-10-15" → "15/10". */
export function diaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/* ---------------- edição ---------------- */

let seq = 0;
export const novoIdTarefa = () => `t-${Date.now().toString(36)}-${++seq}`;

/**
 * Status e % andam juntos: concluir é 100%, 100% é concluído, e começar a
 * marcar % tira do "não iniciado". Sem isso a planilha diz 100% e "Em
 * andamento" na mesma linha.
 */
export function aplicarPatchTarefa(t: TarefaCrono, patch: Partial<TarefaCrono>): TarefaCrono {
  const next = { ...t, ...patch };
  if (patch.status !== undefined && patch.pct === undefined) {
    if (patch.status === "Concluído") next.pct = 100;
    else if (patch.status === "Não iniciado") next.pct = 0;
    else if (next.pct >= 100) next.pct = 50;
  } else if (patch.pct !== undefined && patch.status === undefined) {
    next.pct = Math.max(0, Math.min(100, Number(patch.pct) || 0));
    if (next.pct >= 100) next.status = "Concluído";
    else if (next.pct > 0) next.status = "Em andamento";
    else if (t.status === "Concluído") next.status = "Não iniciado";
  }
  return next;
}

/** Linha nova: encadeada na anterior, que é o caso de quase toda linha de produção. */
export function novaTarefa(anterior: TarefaCrono | undefined, tipo: TarefaCrono["tipo"]): TarefaCrono {
  return {
    id: novoIdTarefa(),
    tipo,
    nome: "",
    duracao: tipo === "fase" ? 0 : 1,
    predecessora: tipo === "tarefa" && anterior ? anterior.id : null,
    responsavel: tipo === "tarefa" ? RESPONSAVEL_ACID : "",
    status: "Não iniciado",
    pct: 0,
  };
}

/**
 * Tira uma linha sem quebrar a corrente: quem dependia dela passa a depender
 * da predecessora dela. Apagar o "Ajustes" do meio não pode fazer a
 * "Validação" seguinte voltar para o primeiro dia do projeto.
 */
export function removerTarefa(tarefas: TarefaCrono[], id: string): TarefaCrono[] {
  const alvo = tarefas.find((t) => t.id === id);
  if (!alvo) return tarefas;
  return tarefas
    .filter((t) => t.id !== id)
    .map((t) => (t.predecessora === id ? { ...t, predecessora: alvo.predecessora } : t));
}

export function moverTarefa(tarefas: TarefaCrono[], id: string, delta: -1 | 1): TarefaCrono[] {
  const i = tarefas.findIndex((t) => t.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= tarefas.length) return tarefas;
  const next = [...tarefas];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/* ---------------- modelo ---------------- */

export function cronoVazio(hojeISO: string): CronogramaProducao {
  return { inicio: hojeISO, pularFeriados: true, tarefas: [] };
}

/**
 * Modelo de produção com IA (stills → motion), o mesmo desenho do cronograma
 * Droga5 + Santander: setup com briefing e proposta, duas rodadas de
 * validação nos stills, duas no motion, finalização.
 */
export function modeloProducaoIA(opts: {
  cliente: string;
  marca?: string;
  inicio: string;
}): CronogramaProducao {
  const cliente = opts.cliente.trim() || "Cliente";
  const marca = opts.marca?.trim();
  const aprovacao = marca && marca !== cliente ? `${marca} + ${cliente}` : cliente;
  const A = RESPONSAVEL_ACID;
  const linhas: [TarefaCrono["tipo"], string, number, string, boolean?][] = [
    ["fase", "Setup", 0, ""],
    ["tarefa", "Briefing", 0.5, cliente],
    ["tarefa", "Análise + confecção de proposta comercial", 0.75, A],
    ["tarefa", "Validação/aprovação + envio de assets", 0.75, cliente],
    ["fase", "Criação/Produção AI", 0, ""],
    ["tarefa", "Produção de stills", 1, A, true],
    ["tarefa", "Validação", 0.5, cliente],
    ["tarefa", "Ajustes", 1, A],
    ["tarefa", "Validação", 0.5, aprovacao],
    ["tarefa", "Ajustes finais", 1, A],
    ["tarefa", "Motion AI + edit", 2, A, true],
    ["tarefa", "Validação", 0.5, aprovacao],
    ["tarefa", "Ajustes", 1, A],
    ["tarefa", "Validação", 0.5, aprovacao],
    ["tarefa", "Ajustes finais", 1, A],
    ["tarefa", "Finalização", 1, A, true],
  ];
  const tarefas: TarefaCrono[] = [];
  let anterior: TarefaCrono | undefined;
  for (const [tipo, nome, duracao, responsavel, entrega] of linhas) {
    const t: TarefaCrono = {
      id: novoIdTarefa(),
      tipo,
      nome,
      duracao,
      predecessora: tipo === "tarefa" && anterior ? anterior.id : null,
      responsavel,
      status: "Não iniciado",
      pct: 0,
      ...(entrega ? { entrega: true } : {}),
    };
    tarefas.push(t);
    if (tipo === "tarefa") anterior = t;
  }
  return { inicio: opts.inicio, pularFeriados: true, tarefas };
}

/**
 * Marcos para o bloco "Cronograma" da proposta: as entregas da ACID, na data
 * em que terminam. Sem entrega marcada, cai no fim de cada fase.
 */
export function marcosParaProposta(crono: CronogramaProducao): MarcoCronograma[] {
  const { linhas } = calcularCrono(crono);
  const entregas = linhas.filter((l) => l.tarefa.tipo === "tarefa" && l.tarefa.entrega);
  const base = entregas.length ? entregas : linhas.filter((l) => l.tarefa.tipo === "fase" && l.duracao > 0);
  return base.map((l) => ({ data: diaMes(l.fim), marco: l.tarefa.nome.trim() }));
}

/* ---------------- cores por responsável ---------------- */

export interface CorResponsavel {
  /** Fundo da linha. */
  fundo: string;
  /** Fundo da linha de entrega. */
  forte: string;
  /** Barra na linha do tempo. */
  barra: string;
}

/** ACID em verde (a cor da casa); os demais recebem uma cor por ordem de aparição. */
const COR_ACID: CorResponsavel = { fundo: "#DDF9EC", forte: "#A9F0CF", barra: "#19E28A" };
const PALETA: CorResponsavel[] = [
  { fundo: "#DCEBFB", forte: "#B9D6F7", barra: "#4A90E2" },
  { fundo: "#FBE0E6", forte: "#F6C2CE", barra: "#E06C88" },
  { fundo: "#FCEFD2", forte: "#F8DCA0", barra: "#E8A93A" },
  { fundo: "#EAE3FB", forte: "#D3C5F6", barra: "#8E6FE0" },
  { fundo: "#E3F1F3", forte: "#C3E2E7", barra: "#3FA7B5" },
];
export const COR_SEM_RESPONSAVEL: CorResponsavel = { fundo: "#F4F4F5", forte: "#E4E4E7", barra: "#A1A1AA" };

export const ehACID = (r: string) => /acid/i.test(r);

export function coresPorResponsavel(tarefas: TarefaCrono[]): Map<string, CorResponsavel> {
  const mapa = new Map<string, CorResponsavel>();
  let i = 0;
  for (const t of tarefas) {
    const r = t.responsavel.trim();
    if (t.tipo !== "tarefa" || !r || mapa.has(r)) continue;
    mapa.set(r, ehACID(r) ? COR_ACID : PALETA[i++ % PALETA.length]);
  }
  return mapa;
}

/** Dias corridos entre duas datas — a linha do tempo conta fim de semana também. */
export function diasEntre(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DIA_MS);
}

export { somaDias };
