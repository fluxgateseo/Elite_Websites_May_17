import { describe, it, expect } from "vitest";
import { runIntel } from "../src/stages/intel";

describe("runIntel", () => {
  it("returns empty when source skipped", async () => {
    const out = await runIntel({
      brief: { step1: { domain: "x.it" }, step6: { sources: ["skip"] } },
      env: {},
      briefId: "b1",
    });
    expect(out.backlinks).toEqual([]);
    expect(out.warnings[0]).toMatch(/skip/);
  });

  it("calls DataForSEO when source includes dataforseo", async () => {
    let called = false;
    const mockFetch = async () => {
      called = true;
      return new Response(JSON.stringify({
        status_code: 20000,
        tasks: [{ status_code: 20000, result: [{ items: [{ url_from: "https://r.it/p", domain_from: "r.it", anchor: "a", domain_from_rank: 70 }] }] }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await runIntel({
      brief: { step1: { domain: "x.it" }, step6: { sources: ["dataforseo"] } },
      env: { DATAFORSEO_LOGIN: "u", DATAFORSEO_PASSWORD: "p" },
      briefId: "b1",
      fetcher: mockFetch as typeof fetch,
    });
    expect(called).toBe(true);
    expect(out.sourceCounts.dataforseo).toBe(1);
    expect(out.sourceCounts.merged).toBe(1);
  });

  it("throws when DATAFORSEO secrets missing", async () => {
    await expect(runIntel({
      brief: { step1: { domain: "x.it" }, step6: { sources: ["dataforseo"] } },
      env: {},
      briefId: "b1",
    })).rejects.toThrow(/DATAFORSEO/);
  });
});
