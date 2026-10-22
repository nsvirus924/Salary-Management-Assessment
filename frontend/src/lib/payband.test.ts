import { describe, expect, it } from "vitest";
import { bandPosition, bandRange } from "./payband";

const stats = { count: 4, min: 100, max: 200, mean: 150, median: 150, p25: 125, p75: 175 };

describe("bandPosition", () => {
  it("maps values linearly and clamps", () => {
    expect(bandPosition(150, stats)).toBe(50);
    expect(bandPosition(50, stats)).toBe(0);
    expect(bandPosition(300, stats)).toBe(100);
  });
  it("centres when the band has no width", () => {
    expect(bandPosition(5, { min: 5, max: 5 })).toBe(50);
  });
});

describe("bandRange", () => {
  it("extends to include an outlier employee", () => {
    expect(bandRange(stats, 80)).toEqual({ min: 80, max: 200 });
    expect(bandRange(stats)).toEqual({ min: 100, max: 200 });
  });
});
