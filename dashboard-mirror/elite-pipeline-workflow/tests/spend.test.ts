import { describe, it, expect } from "vitest";
import { estimateAnthropicCostCents, currentYearMonth } from "../src/lib/spend";

// Pricing constants in spend.ts:
//   input  = 0.0001 cents/token  (Haiku 4.5: $1/M)
//   output = 0.0005 cents/token  ($5/M)
//   cache_read_input = 0.00001 cents/token  ($0.10/M)

describe("estimateAnthropicCostCents (Haiku 4.5 pricing)", () => {
  it("computes cost without cache hits", () => {
    // 100k input + 50k output:
    //   input 100k * 0.0001 = 10 cents
    //   output 50k * 0.0005 = 25 cents
    //   total 35 cents
    const cents = estimateAnthropicCostCents({ inputTokens: 100000, outputTokens: 50000, cacheReadInputTokens: 0 });
    expect(cents).toBe(35);
  });

  it("discounts cache reads (90% saving on read tokens)", () => {
    // 50k input fully cache-read → 50k * 0.00001 = 0.5 cents → ceil to 1
    const cents = estimateAnthropicCostCents({ inputTokens: 50000, outputTokens: 0, cacheReadInputTokens: 50000 });
    expect(cents).toBe(1);
  });

  it("only charges non-cached input on top of cache-reads", () => {
    // 100k input, 80k cached → 20k billable input
    //   20k * 0.0001 = 2 cents + 80k * 0.00001 = 0.8 cents = 2.8 → ceil 3
    const cents = estimateAnthropicCostCents({ inputTokens: 100000, outputTokens: 0, cacheReadInputTokens: 80000 });
    expect(cents).toBe(3);
  });

  it("rounds up fractional cents (never under-bills)", () => {
    const cents = estimateAnthropicCostCents({ inputTokens: 1, outputTokens: 0, cacheReadInputTokens: 0 });
    expect(cents).toBe(1);
  });
});

describe("currentYearMonth", () => {
  it("returns YYYY-MM", () => {
    const ym = currentYearMonth(new Date(Date.UTC(2026, 4, 6)));
    expect(ym).toBe("2026-05");
  });
  it("zero-pads single-digit month", () => {
    const ym = currentYearMonth(new Date(Date.UTC(2026, 0, 1)));
    expect(ym).toBe("2026-01");
  });
});
