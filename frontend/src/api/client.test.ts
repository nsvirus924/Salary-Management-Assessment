import { describe, expect, it } from "vitest";
import { buildQuery, errorMessage } from "./client";

describe("buildQuery", () => {
  it("drops empty values", () => {
    expect(buildQuery({ q: "", country: "IN", page: 1, department: undefined })).toBe("?country=IN&page=1");
  });
  it("returns empty string when nothing is set", () => {
    expect(buildQuery({ q: "" })).toBe("");
  });
  it("encodes values", () => {
    expect(buildQuery({ q: "ada lovelace" })).toBe("?q=ada+lovelace");
  });
});

describe("errorMessage", () => {
  it("passes through string details", () => {
    expect(errorMessage("Employee 4 not found", "x")).toBe("Employee 4 not found");
  });
  it("summarises FastAPI validation errors", () => {
    const detail = [{ loc: ["body", "hire_date"], msg: "Input should be a valid date" }];
    expect(errorMessage(detail, "x")).toBe("hire date: Input should be a valid date");
  });
  it("falls back for unknown shapes", () => {
    expect(errorMessage({ weird: true }, "fallback")).toBe("fallback");
  });
});
