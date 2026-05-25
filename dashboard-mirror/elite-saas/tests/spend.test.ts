import { describe, it, expect } from "vitest";
import { formatCents, formatTokens, currentYearMonth } from "../src/lib/spend";

describe("formatCents", () => {
  it("0 → $0", () => expect(formatCents(0)).toBe("$0"));
  it("under 100 cents → cents notation", () => {
    expect(formatCents(1)).toBe("1¢");
    expect(formatCents(42)).toBe("42¢");
    expect(formatCents(99)).toBe("99¢");
  });
  it("≥ 100 cents → dollars with 2 decimals", () => {
    expect(formatCents(100)).toBe("$1.00");
    expect(formatCents(525)).toBe("$5.25");
    expect(formatCents(12345)).toBe("$123.45");
  });
});

describe("formatTokens", () => {
  it("0 → 0", () => expect(formatTokens(0)).toBe("0"));
  it("< 1000 → raw", () => expect(formatTokens(999)).toBe("999"));
  it("< 1M → k notation, one decimal", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(15400)).toBe("15.4k");
    expect(formatTokens(999999)).toBe("1000.0k");
  });
  it("≥ 1M → M notation, two decimals", () => {
    expect(formatTokens(1_000_000)).toBe("1.00M");
    expect(formatTokens(2_345_678)).toBe("2.35M");
  });
});

describe("currentYearMonth", () => {
  it("returns YYYY-MM padded", () => {
    expect(currentYearMonth(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(currentYearMonth(new Date(Date.UTC(2026, 11, 1)))).toBe("2026-12");
  });
});
