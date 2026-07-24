const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** R$ 1.234,56 */
export function formatBRL(value: number): string {
  return BRL.format(Number.isFinite(value) ? value : 0);
}

/** 1.234,56 (sem símbolo) */
export function formatNumber(value: number): string {
  return NUM.format(Number.isFinite(value) ? value : 0);
}

/** 0.4136 -> "41,4%" (fração 0–1). casas = 1 por padrão */
export function formatPct(fraction: number, casas = 1): string {
  const v = Number.isFinite(fraction) ? fraction * 100 : 0;
  return `${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** 41.36 -> "41,36%" (valor já em pontos percentuais) */
export function formatPctPoints(points: number, casas = 1): string {
  const v = Number.isFinite(points) ? points : 0;
  return `${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** ISO ou Date -> dd/mm/aaaa */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return typeof value === "string" ? value : "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
