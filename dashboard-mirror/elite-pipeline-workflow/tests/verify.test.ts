import { describe, it, expect } from "vitest";
import { runVerify } from "../src/stages/verify";

describe("runVerify", () => {
  it("returns ok when all smoke + lighthouse green", async () => {
    const mockFetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("pagespeedonline")) {
        return new Response(JSON.stringify({
          lighthouseResult: {
            categories: {
              performance: { score: 0.85 },
              accessibility: { score: 0.95 },
              "best-practices": { score: 0.92 },
              seo: { score: 0.95 },
            },
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      // smoke fetches all 200
      return new Response("ok", { status: 200 });
    };
    const out = await runVerify({ domain: "demo.it", fetcher: mockFetch as typeof fetch });
    expect(out.ok).toBe(true);
    expect(out.smoke.length).toBe(3);
    expect(out.lighthouse?.performance).toBe(85);
    expect(out.lighthouse?.seo).toBe(95);
    expect(out.failures).toEqual([]);
  });

  it("flags performance below 50", async () => {
    const mockFetch = async (url: RequestInfo | URL) => {
      if (String(url).includes("pagespeedonline")) {
        return new Response(JSON.stringify({
          lighthouseResult: {
            categories: { performance: { score: 0.3 }, accessibility: { score: 0.9 }, "best-practices": { score: 0.9 }, seo: { score: 0.9 } },
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("ok", { status: 200 });
    };
    const out = await runVerify({ domain: "demo.it", fetcher: mockFetch as typeof fetch });
    expect(out.ok).toBe(false);
    expect(out.failures.some((f) => f.includes("performance"))).toBe(true);
  });

  it("fails on smoke 404", async () => {
    const mockFetch = async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("pagespeedonline")) {
        return new Response(JSON.stringify({ lighthouseResult: { categories: {} } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (u.endsWith("/sitemap.xml")) return new Response("not found", { status: 404 });
      return new Response("ok", { status: 200 });
    };
    const out = await runVerify({ domain: "demo.it", fetcher: mockFetch as typeof fetch });
    expect(out.ok).toBe(false);
    expect(out.failures.some((f) => f.includes("/sitemap.xml"))).toBe(true);
  });

  it("survives lighthouse rate-limit (PSI 429)", async () => {
    const mockFetch = async (url: RequestInfo | URL) => {
      if (String(url).includes("pagespeedonline")) {
        return new Response("rate limited", { status: 429 });
      }
      return new Response("ok", { status: 200 });
    };
    const out = await runVerify({ domain: "demo.it", fetcher: mockFetch as typeof fetch });
    // Smoke is green, lighthouse skipped → still NOT ok because lighthouse failure is recorded
    expect(out.smoke.every((s) => s.ok)).toBe(true);
    expect(out.lighthouse).toBe(null);
    expect(out.ok).toBe(false);
    expect(out.failures.some((f) => f.includes("lighthouse"))).toBe(true);
  });
});
