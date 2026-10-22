import type { EmploymentType } from "../api/types";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: string, compact = false): string {
  const key = `${currency}:${compact}`;
  let fmt = moneyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? "compact" : "standard",
    });
    moneyFormatters.set(key, fmt);
  }
  return fmt.format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Dates from the API are plain "YYYY-MM-DD"; format in UTC so they never shift a day. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(isoDate.length === 10 ? `${isoDate}T00:00:00Z` : isoDate));
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contractor: "Contractor",
};

/** Signed percentage change, e.g. "+8.0%". Null when there is no previous value. */
export function percentChange(previous: number | null, next: number): string | null {
  if (previous === null || previous === 0) return null;
  const pct = ((next - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
