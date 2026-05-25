import { describe, it, expect } from "vitest";
import { parseAhrefsCsv, dedupeByDomain, fetchBacklinks } from "../src/lib/dataforseo";

describe("parseAhrefsCsv", () => {
  it("parses comma CSV with quoted fields", () => {
    const csv = `"Referring page URL","Anchor","Domain rating"
"https://example.com/foo","click here","45"
"https://other.org/bar","read more","70"`;
    const out = parseAhrefsCsv(csv);
    expect(out.length).toBe(2);
    expect(out[0].domainFrom).toBe("example.com");
    expect(out[0].anchor).toBe("click here");
    expect(out[0].domainRank).toBe(45);
    expect(out[1].domainFrom).toBe("other.org");
  });

  it("handles tab-separated", () => {
    const csv = `Referring page URL\tAnchor\tDR\nhttps://x.it/a\tlink\t50`;
    const out = parseAhrefsCsv(csv);
    expect(out.length).toBe(1);
    expect(out[0].domainFrom).toBe("x.it");
  });

  it("returns empty for missing url AND domain columns", () => {
    expect(parseAhrefsCsv("anchor,dr\n'foo',5")).toEqual([]);
  });

  it("parses Ahrefs ref-domains export (Domain + DR + Is spam columns)", () => {
    const csv = `"Domain"\t"Is spam"\t"DR"\t"Traffic"
"luccianopignataro.it"\t"false"\t"65"\t"10000"
"buybacklinks.agency"\t"true"\t"79"\t"0"
"scattidigusto.it"\t"false"\t"61"\t"50000"`;
    const out = parseAhrefsCsv(csv);
    // Spam row filtered out. Domain becomes both domainFrom and a synthesized url.
    // Spam now kept (isSpam=true) since dataset has at least one quality link.
    expect(out.map((b) => b.domainFrom)).toEqual(["luccianopignataro.it", "buybacklinks.agency", "scattidigusto.it"]);
    expect(out.find((b) => b.domainFrom === "buybacklinks.agency")?.isSpam).toBe(true);
    expect(out.find((b) => b.domainFrom === "luccianopignataro.it")?.isSpam).toBe(false);
    expect(out[0].url).toBe("https://luccianopignataro.it/");
    expect(out[0].domainRank).toBe(65);
  });

  it("strips UTF-8 BOM from CSV header", () => {
    const csv = "﻿\"Domain\"\t\"DR\"\n\"x.it\"\t\"50\"";
    const out = parseAhrefsCsv(csv);
    expect(out.length).toBe(1);
    expect(out[0].domainFrom).toBe("x.it");
  });

  it("strips www. from domain", () => {
    const csv = `Referring page URL\nhttps://www.foo.com/x`;
    const out = parseAhrefsCsv(csv);
    expect(out[0].domainFrom).toBe("foo.com");
  });
});

describe("dedupeByDomain", () => {
  it("prefers earlier sources on conflict and sorts by DR desc", () => {
    const dfs = [
      { domainFrom: "a.com", url: "https://a.com/x", anchor: "1", domainRank: 80 },
      { domainFrom: "b.com", url: "https://b.com/x", anchor: "2", domainRank: 50 },
    ];
    const csv = [
      { domainFrom: "A.com", url: "https://A.com/y", anchor: "old", domainRank: 60 },
      { domainFrom: "c.com", url: "https://c.com/y", anchor: "3", domainRank: 70 },
    ];
    const merged = dedupeByDomain(dfs, csv);
    expect(merged.map((m) => m.domainFrom)).toEqual(["a.com", "c.com", "b.com"]);
    // a.com keeps the dfs version (DR 80, anchor "1")
    expect(merged[0].anchor).toBe("1");
    expect(merged[0].domainRank).toBe(80);
  });
});

describe("fetchBacklinks (mocked fetch)", () => {
  it("posts to DataForSEO live endpoint with basic auth", async () => {
    const captured: { url?: string; init?: RequestInit } = {};
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      captured.url = String(url);
      captured.init = init;
      return new Response(
        JSON.stringify({
          status_code: 20000,
          tasks: [
            { status_code: 20000, result: [{ items: [{ url_from: "https://x.it/a", domain_from: "x.it", anchor: "y", domain_from_rank: 60 }] }] },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const out = await fetchBacklinks({
      login: "u",
      password: "p",
      domain: "demo.it",
      fetcher: mockFetch as typeof fetch,
    });
    expect(out.length).toBe(1);
    expect(out[0].domainFrom).toBe("x.it");
    expect(captured.url).toContain("/v3/backlinks/backlinks/live");
    const body = JSON.parse(String(captured.init?.body));
    expect(body[0].target).toBe("demo.it");
    const auth = (captured.init?.headers as Record<string, string>).Authorization;
    expect(auth).toContain("Basic ");
  });

  it("throws on non-2xx", async () => {
    const mockFetch = async () => new Response("nope", { status: 500 });
    await expect(
      fetchBacklinks({ login: "u", password: "p", domain: "x.it", fetcher: mockFetch as typeof fetch }),
    ).rejects.toThrow(/DataForSEO 500/);
  });

  it("throws on non-20000 status_code", async () => {
    const mockFetch = async () => new Response(JSON.stringify({ status_code: 40400, status_message: "auth failed" }), { status: 200, headers: { "content-type": "application/json" } });
    await expect(
      fetchBacklinks({ login: "u", password: "p", domain: "x.it", fetcher: mockFetch as typeof fetch }),
    ).rejects.toThrow(/40400/);
  });
});
