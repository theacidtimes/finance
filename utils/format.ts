const BRL2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL0 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** R$ 1.234,56 — com centavos (DRE, valores exatos) */
export function formatBRL(value: number): string {
  return BRL2.format(Number.isFinite(value) ? value : 0);
}

/** R$ 1.235 — sem centavos (KPIs, dashboard) */
export function formatBRL0(value: number): string {
  return BRL0.format(Number.isFinite(value) ? value : 0);
}

/** 0.4136 -> "41,4%" (fração 0–1, máx. 1 casa) */
export function formatPct(fraction: number, casas = 1): string {
  const v = Number.isFinite(fraction) ? fraction * 100 : 0;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;
}

/** ISO ou Date -> dd/mm/aaaa (texto livre passa direto) */
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
