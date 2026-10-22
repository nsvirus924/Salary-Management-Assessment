import type { SalaryStats } from "../api/types";

/** Map a salary to a 0-100 position on a band running from range.min to range.max. */
export function bandPosition(value: number, range: Pick<SalaryStats, "min" | "max">): number {
  if (range.max === range.min) return 50;
  const pct = ((value - range.min) / (range.max - range.min)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** Widen the range so an employee outside the peer range still shows on the strip. */
export function bandRange(stats: SalaryStats, value?: number): Pick<SalaryStats, "min" | "max"> {
  if (value === undefined) return { min: stats.min, max: stats.max };
  return { min: Math.min(stats.min, value), max: Math.max(stats.max, value) };
}

/** One scale for a whole table of bands, so rows can be compared visually. */
export function sharedRange(all: Pick<SalaryStats, "min" | "max">[]): Pick<SalaryStats, "min" | "max"> | undefined {
  if (all.length === 0) return undefined;
  return { min: Math.min(...all.map((s) => s.min)), max: Math.max(...all.map((s) => s.max)) };
}

/** Convert local-currency stats to USD with a fixed rate (for cross-country bands). */
export function scaleStats(stats: SalaryStats, rate: number): SalaryStats {
  const r = (v: number) => Math.round(v * rate);
  return { ...stats, min: r(stats.min), max: r(stats.max), mean: r(stats.mean),
           median: r(stats.median), p25: r(stats.p25), p75: r(stats.p75) };
}
