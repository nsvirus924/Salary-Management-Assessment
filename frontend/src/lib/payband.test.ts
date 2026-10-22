import { describe, expect, it } from "vitest";
import { bandPosition, bandRange, scaleStats, sharedRange } from "./payband";

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

describe("sharedRange", () => {
  it("spans every row", () => {
    expect(sharedRange([{ min: 10, max: 50 }, { min: 30, max: 90 }])).toEqual({ min: 10, max: 90 });
  });
  it("is undefined for no rows", () => expect(sharedRange([])).toBeUndefined());
});

describe("scaleStats", () => {
  it("converts every figure but keeps the count", () => {
    const usd = scaleStats(stats, 0.5);
    expect(usd).toMatchObject({ count: 4, min: 50, median: 75, max: 100 });
  });
});
