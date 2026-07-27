/**
 * Performance anual e fundo de bônus — ACID.
 *
 * NÃO reimplementa DRE: consome `computeDRE` (lib/finance.ts) projeto a projeto
 * e apenas agrega. Toda a matemática nova aqui é de *fundo de bônus*.
 *
 * A ideia do fundo
 * ----------------
 * O custo/hora que entra no DRE é o custo CARREGADO (salário + encargos +
 * benefícios). Para um PJ, esse carregamento é um markup deliberado: cobramos
 * nos projetos mais caro do que sai do caixa. Esse spread é o que financia o
 * bônus de fim de ano.
 *
 *   Fundo da pessoa = (o que os DREs cobraram pelas horas dela) − (o que ela
 *                      efetivamente custou em caixa no ano)
 *   Bônus           = β × max(0, Fundo)         [β = 50%]
 *
 * O bônus só é liberado se o resultado de caixa do ano for positivo — o fundo
 * é condição necessária, não suficiente.
 *
 * Consequência que a tela precisa mostrar: como o carregamento e o overhead são
 * provisões internas (não saem do caixa), o lucro do DRE SUBESTIMA o caixa.
 * Por isso `lucroDRE` e `lucroCaixa` andam juntos aqui.
 */

import { computeDRE } from "./finance";
import { custoHoraCarregado } from "./team";
import type {
  CustoExterno,
  DREResultado,
  Projeto,
  StaffInterno,
  TeamMember,
  TipoContrato,
} from "@/types";

/** Fatia do fundo que vira bônus. O resto fica de colchão na empresa. */
export const BETA_BONUS = 0.5;

/**
 * Quem representa compromisso de caixa fixo — e portanto gera fundo e bônus.
 *
 * Sócio fica de fora de propósito: a retirada dele é distribuição de lucro,
 * variável e posterior ao resultado. Tratá-la como custo fixo mensal afundaria
 * o caixa do ano e criaria um "fundo" negativo sem sentido. O salário no
 * cadastro do sócio serve para custear as horas dele nos projetos, não para
 * prever saída de caixa.
 *
 * Freelancer também fica de fora: é pago por job, não por mês.
 */
export const TIPOS_CUSTO_FIXO: readonly TipoContrato[] = ["CLT", "PJ", "Estágio"];

/** Status que representam trabalho ganho (entra na performance por padrão). */
export const STATUS_REALIZADO = ["Aprovado", "Em produção", "Entregue"] as const;

/** Projeto cru vindo do banco, já agrupado com seus filhos. */
export interface ProjetoBruto {
  proj: Projeto & { id: string };
  externos: Pick<CustoExterno, "valor">[];
  internos: StaffInterno[];
}

export interface ProjetoPerf {
  id: string;
  cliente: string;
  projeto: string;
  numeroServico: string;
  status: string;
  data: string;
  dre: DREResultado;
}

export interface PessoaPerf {
  teamMemberId: string | null;
  nome: string;
  funcao: string;
  /** Horas lançadas nos projetos do ano. */
  horas: number;
  /** Σ custoProjeto — o que os DREs cobraram por essas horas. */
  provisao: number;
  /** Custo/hora carregado do cadastro atual (referência, não histórico). */
  custoHora: number;
  /** Só existe fundo para quem tem contrato fixo com custo mensal conhecido. */
  temContratoFixo: boolean;
  tipoContrato: TipoContrato | null;
  /** Por que a pessoa não gera fundo — para a tela explicar em vez de omitir. */
  motivoSemFundo: string;
  /** Custo real em caixa no ano (salário mensal × meses ativos). 0 se avulso. */
  custoCaixaAno: number;
  /** provisao − custoCaixaAno. Null quando não há contrato fixo. */
  fundo: number | null;
  /** Horas necessárias para o fundo zerar. Null quando não há contrato fixo. */
  breakEvenHoras: number | null;
  /** horas / (baseHorasMes × meses ativos). Null quando não há base. */
  ocupacao: number | null;
  bonus: number;
}

export interface PerformanceAno {
  ano: number;
  projetos: ProjetoPerf[];

  receitaBruta: number;
  receitaOperacional: number;
  custosExternos: number;
  /** Staff provisionado nos DREs (carregado). */
  staffInterno: number;
  overhead: number;
  /** Σ lucroOperacional dos projetos. */
  lucroDRE: number;
  /** Custo real do time fixo no ano (caixa). */
  custoCaixaTime: number;
  /**
   * Resultado de caixa ANTES das despesas fixas da casa (aluguel, ferramentas,
   * contabilidade) — o sistema não as registra. Não é o lucro líquido real.
   */
  lucroCaixa: number;
  /** Σ lucro / Σ receita operacional (ponderada, não média simples). */
  margemMedia: number;

  pessoas: PessoaPerf[];
  /** Σ dos fundos individuais (pode ser negativo — é informativo). */
  fundoTotal: number;
  /** Σ dos bônus individuais, já com o piso em zero por pessoa. */
  bonusTotal: number;
  /** O caixa do ano comporta o bônus? */
  bonusLiberado: boolean;
}

/** Ano de um projeto a partir do campo `data` (ISO). Null se sem data válida. */
export function anoDoProjeto(data: string): number | null {
  if (!data) return null;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

/**
 * Meses em que a pessoa esteve ativa no ano, para não cobrar 12 meses de
 * caixa de quem entrou em setembro.
 */
export function mesesAtivosNoAno(dataAdmissao: string, ano: number): number {
  if (!dataAdmissao) return 12;
  const d = new Date(dataAdmissao);
  if (Number.isNaN(d.getTime())) return 12;
  const y = d.getUTCFullYear();
  if (y > ano) return 0;
  if (y < ano) return 12;
  return 12 - d.getUTCMonth();
}

/**
 * Agrega um ano de projetos + o cadastro de time num retrato de performance.
 *
 * @param projetos  projetos já filtrados por ano e por status
 * @param time      cadastro global (para saber o custo real de cada pessoa)
 * @param ano       ano de referência (usado para pro-ratear admissões)
 */
export function computePerformance(
  projetos: ProjetoBruto[],
  time: TeamMember[],
  ano: number,
  beta: number = BETA_BONUS
): PerformanceAno {
  const perf: ProjetoPerf[] = projetos.map((p) => ({
    id: p.proj.id,
    cliente: p.proj.cliente,
    projeto: p.proj.projeto,
    numeroServico: p.proj.numeroServico,
    status: p.proj.status,
    data: p.proj.data,
    dre: computeDRE({
      valorBruto: p.proj.valorBruto,
      impostosPct: p.proj.impostosPct,
      comissaoPct: p.proj.comissaoPct,
      overheadPct: p.proj.overheadPct,
      externos: p.externos,
      internos: p.internos,
    }),
  }));

  const soma = (f: (d: DREResultado) => number) =>
    perf.reduce((s, p) => s + f(p.dre), 0);

  const receitaBruta = soma((d) => d.receitaBruta);
  const receitaOperacional = soma((d) => d.receitaOperacional);
  const custosExternos = soma((d) => d.custosExternos);
  const staffInterno = soma((d) => d.staffInterno);
  const overhead = soma((d) => d.overhead);
  const lucroDRE = soma((d) => d.lucroOperacional);

  /* ---- horas e provisão por pessoa ------------------------------------- */
  // Chave: teamMemberId quando existe; senão o nome normalizado (avulso).
  type Acc = { nome: string; id: string | null; horas: number; provisao: number };
  const acc = new Map<string, Acc>();

  // Semeia com o time fixo ATIVO antes de olhar os projetos: quem tem contrato
  // custa caixa mesmo sem ter lançado uma hora no ano. Sem isso, uma pessoa
  // ociosa some da conta e o lucro de caixa fica superestimado.
  for (const m of time) {
    if (!m.ativo || Number(m.salarioMensal) <= 0) continue;
    if (!TIPOS_CUSTO_FIXO.includes(m.tipoContrato)) continue;
    if (mesesAtivosNoAno(m.dataAdmissao, ano) <= 0) continue;
    acc.set(m.id, { nome: m.nome, id: m.id, horas: 0, provisao: 0 });
  }

  for (const p of perf) {
    for (const linha of p.dre.internosCalc) {
      const id = linha.teamMemberId ?? null;
      const chave = id ?? `nome:${linha.nome.trim().toLowerCase()}`;
      const cur = acc.get(chave) ?? { nome: linha.nome, id, horas: 0, provisao: 0 };
      cur.horas += Number(linha.horasProjeto) || 0;
      cur.provisao += linha.custoProjeto;
      acc.set(chave, cur);
    }
  }

  const porId = new Map(time.map((m) => [m.id, m]));

  const pessoas: PessoaPerf[] = [...acc.values()]
    .map((a): PessoaPerf => {
      const membro = a.id ? porId.get(a.id) : undefined;
      const meses = membro ? mesesAtivosNoAno(membro.dataAdmissao, ano) : 0;
      // Sem `ativo` não há custo de caixa a provisionar. Um inativo que lançou
      // horas no ano ainda aparece na tabela, mas sem fundo — não temos data de
      // desligamento para pro-ratear o caixa dele com honestidade.
      const custoFixo = !!membro && TIPOS_CUSTO_FIXO.includes(membro.tipoContrato);
      const temContratoFixo =
        !!membro && custoFixo && membro.ativo && Number(membro.salarioMensal) > 0 && meses > 0;

      let motivoSemFundo = "";
      if (!temContratoFixo) {
        if (!membro) motivoSemFundo = "sem vínculo no cadastro de time";
        else if (membro.tipoContrato === "Sócio")
          motivoSemFundo = "sócio — retirada sai do resultado, não do fundo";
        else if (!custoFixo) motivoSemFundo = `${membro.tipoContrato.toLowerCase()} — pago por job`;
        else if (!membro.ativo) motivoSemFundo = "inativo";
        else if (Number(membro.salarioMensal) <= 0) motivoSemFundo = "sem custo mensal no cadastro";
        else motivoSemFundo = "admitido depois deste ano";
      }

      const custoHora = membro ? custoHoraCarregado(membro) : 0;
      const custoCaixaAno = temContratoFixo ? Number(membro!.salarioMensal) * meses : 0;
      const fundo = temContratoFixo ? a.provisao - custoCaixaAno : null;
      const breakEvenHoras =
        temContratoFixo && custoHora > 0 ? custoCaixaAno / custoHora : null;

      const baseAno = membro ? Number(membro.baseHorasMes) * meses : 0;
      const ocupacao = baseAno > 0 ? a.horas / baseAno : null;

      return {
        teamMemberId: a.id,
        nome: membro?.nome ?? a.nome,
        funcao: membro?.funcao ?? "",
        horas: a.horas,
        provisao: a.provisao,
        custoHora,
        temContratoFixo,
        tipoContrato: membro?.tipoContrato ?? null,
        motivoSemFundo,
        custoCaixaAno,
        fundo,
        breakEvenHoras,
        ocupacao,
        bonus: fundo !== null && fundo > 0 ? fundo * beta : 0,
      };
    })
    .sort((a, b) => b.horas - a.horas);

  const custoCaixaTime = pessoas.reduce((s, p) => s + p.custoCaixaAno, 0);
  const lucroCaixa = receitaOperacional - custosExternos - custoCaixaTime;
  const fundoTotal = pessoas.reduce((s, p) => s + (p.fundo ?? 0), 0);
  const bonusTotal = pessoas.reduce((s, p) => s + p.bonus, 0);

  return {
    ano,
    projetos: perf,
    receitaBruta,
    receitaOperacional,
    custosExternos,
    staffInterno,
    overhead,
    lucroDRE,
    custoCaixaTime,
    lucroCaixa,
    margemMedia: receitaOperacional > 0 ? lucroDRE / receitaOperacional : 0,
    pessoas,
    fundoTotal,
    bonusTotal,
    bonusLiberado: lucroCaixa > 0,
  };
}
