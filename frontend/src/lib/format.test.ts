import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, percentChange } from "./format";

describe("formatMoney", () => {
  it("formats whole units in the given currency", () => {
    expect(formatMoney(85000, "USD")).toBe("$85,000");
    expect(formatMoney(70000, "EUR")).toBe("€70,000");
  });
  it("supports compact notation for charts", () => {
    expect(formatMoney(1_250_000, "USD", true)).toBe("$1.3M");
  });
});

describe("formatDate", () => {
  it("does not shift plain dates across time zones", () => {
    expect(formatDate("2024-01-01")).toBe("Jan 1, 2024");
  });
});

describe("percentChange", () => {
  it("returns a signed percentage", () => {
    expect(percentChange(100_000, 108_000)).toBe("+8.0%");
    expect(percentChange(100_000, 95_000)).toBe("-5.0%");
  });
  it("returns null without a previous value", () => {
    expect(percentChange(null, 50_000)).toBeNull();
  });
});
