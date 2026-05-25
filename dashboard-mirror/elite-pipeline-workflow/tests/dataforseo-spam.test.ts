import { describe, it, expect } from "vitest";
import { parseAhrefsCsv } from "../src/lib/dataforseo";

describe("parseAhrefsCsv quality gate", () => {
  it("returns empty when ALL rows are spam (no quality anchor → unsafe topic)", () => {
    const csv = `"Domain"\t"Is spam"\t"DR"
"buybacklinks.agency"\t"true"\t"79"
"rank-your.website"\t"true"\t"76"`;
    expect(parseAhrefsCsv(csv)).toEqual([]);
  });

  it("keeps spam-flagged rows when at least one quality row exists", () => {
    const csv = `"Domain"\t"Is spam"\t"DR"
"buybacklinks.agency"\t"true"\t"79"
"luccianopignataro.it"\t"false"\t"65"`;
    const out = parseAhrefsCsv(csv);
    expect(out.length).toBe(2);
    expect(out.find((b) => b.domainFrom === "buybacklinks.agency")?.isSpam).toBe(true);
    expect(out.find((b) => b.domainFrom === "luccianopignataro.it")?.isSpam).toBe(false);
  });
});
