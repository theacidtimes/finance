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

/**
 * Texto de data digitado pelo usuário -> ISO aaaa-mm-dd (coluna `date` do banco).
 * Aceita dd/mm, dd/mm/aa, dd/mm/aaaa (também com - ou .) e ISO. Sem ano, usa o ano
 * atual. Data inválida ou vazia -> null (nunca deixa o insert falhar).
 */
export function parseDateBR(value: string | null | undefined): string | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  let d: number, m: number, y: number;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const br = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (br) {
    d = Number(br[1]);
    m = Number(br[2]);
    y = br[3] ? Number(br[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
