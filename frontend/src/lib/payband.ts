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
