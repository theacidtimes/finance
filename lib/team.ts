/**
 * Custo carregado de funcionários fixos ACID — módulo separado do DRE.
 * NÃO altera as fórmulas financeiras do projeto (lib/finance.ts).
 *
 * Ideia: cada pessoa fixa tem um salário base + encargos (13º, INSS, FGTS…)
 * + benefícios fixos. Disso deriva o custo mensal carregado e o custo/hora,
 * que no futuro vira insumo para orçar projetos por volume de horas.
 */

import type { Encargo, TeamMember, TipoContrato } from "@/types";

/** Encargos padrão (CLT) — percentuais editáveis por pessoa. */
export const ENCARGOS_CLT_PADRAO: Encargo[] = [
  { label: "13º salário", pct: 8.33 },
  { label: "Férias + 1/3", pct: 11.11 },
  { label: "INSS patronal", pct: 20 },
  { label: "FGTS", pct: 8 },
];

/** Encargos padrão por tipo de contrato. PJ/Sócio/Freelancer não têm encargos CLT. */
export function encargosPadrao(tipo: TipoContrato): Encargo[] {
  return tipo === "CLT" || tipo === "Estágio"
    ? ENCARGOS_CLT_PADRAO.map((e) => ({ ...e }))
    : [];
}

/** Soma dos percentuais de encargos. */
export function somaEncargosPct(encargos: Encargo[]): number {
  return encargos.reduce((s, e) => s + (Number(e.pct) || 0), 0);
}

/** Valor em R$ dos encargos sobre o salário base. */
export function valorEncargos(m: Pick<TeamMember, "salarioMensal" | "encargos">): number {
  const base = Number(m.salarioMensal) || 0;
  return base * (somaEncargosPct(m.encargos) / 100);
}

/** Custo mensal carregado = salário + encargos + benefícios fixos. */
export function custoMensalCarregado(
  m: Pick<TeamMember, "salarioMensal" | "encargos" | "beneficiosMensais">
): number {
  const base = Number(m.salarioMensal) || 0;
  const beneficios = Number(m.beneficiosMensais) || 0;
  return base + valorEncargos(m) + beneficios;
}

/** Custo/hora carregado = custo mensal carregado ÷ base de horas do mês. */
export function custoHoraCarregado(
  m: Pick<TeamMember, "salarioMensal" | "encargos" | "beneficiosMensais" | "baseHorasMes">
): number {
  const base = Number(m.baseHorasMes) || 0;
  return base > 0 ? custoMensalCarregado(m) / base : 0;
}

export const TIPOS_CONTRATO: TipoContrato[] = [
  "CLT",
  "PJ",
  "Sócio",
  "Estágio",
  "Freelancer",
  "Outro",
];

/** Novo membro com defaults sensatos. */
export function novoMembroDefaults(): Omit<TeamMember, "id"> {
  return {
    nome: "",
    funcao: "",
    tipoContrato: "CLT",
    ativo: true,
    salarioMensal: 0,
    baseHorasMes: 160,
    encargos: encargosPadrao("CLT"),
    beneficiosMensais: 0,
    cpfCnpj: "",
    razaoSocial: "",
    email: "",
    telefone: "",
    pix: "",
    endereco: "",
    dataAdmissao: "",
    observacoes: "",
    anexos: [],
  };
}
