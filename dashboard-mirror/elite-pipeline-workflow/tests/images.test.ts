import { describe, it, expect } from "vitest";
import { runImages } from "../src/stages/images";
import { searchFreepik, searchUnsplash, verifyImageUrl } from "../src/lib/images";

describe("verifyImageUrl", () => {
  it("returns true on 200 with image content-type", async () => {
    const mockFetch = async () => new Response("", { status: 200, headers: { "content-type": "image/jpeg" } });
    expect(await verifyImageUrl("https://x/y.jpg", mockFetch as typeof fetch)).toBe(true);
  });
  it("returns false on 404", async () => {
    const mockFetch = async () => new Response("", { status: 404 });
    expect(await verifyImageUrl("https://x/y.jpg", mockFetch as typeof fetch)).toBe(false);
  });
  it("returns false on non-image content-type", async () => {
    const mockFetch = async () => new Response("", { status: 200, headers: { "content-type": "text/html" } });
    expect(await verifyImageUrl("https://x/y", mockFetch as typeof fetch)).toBe(false);
  });
  it("returns false when fetch throws", async () => {
    const mockFetch = async () => { throw new Error("net"); };
    expect(await verifyImageUrl("https://x/y", mockFetch as typeof fetch)).toBe(false);
  });
});

describe("searchFreepik", () => {
  it("sends api-key header and parses thumbnail when source missing", async () => {
    const captured: { headers?: HeadersInit } = {};
    const mockFetch = async (_u: RequestInfo | URL, init?: RequestInit) => {
      captured.headers = init?.headers;
      return new Response(JSON.stringify({ data: [{ image: { thumbnail: { url: "https://t/1" } } }, { image: { source: { url: "https://s/2" } } }] }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await searchFreepik({ apiKey: "k", query: "demo", fetcher: mockFetch as typeof fetch });
    expect(out.length).toBe(2);
    expect(out[0].url).toBe("https://t/1");
    expect((captured.headers as Record<string, string>)["x-freepik-api-key"]).toBe("k");
  });
});

describe("searchUnsplash", () => {
  it("uses Client-ID auth and returns regular size", async () => {
    const mockFetch = async () => new Response(JSON.stringify({ results: [{ urls: { regular: "https://u/r", full: "https://u/f" }, user: { name: "alice" } }] }), { status: 200, headers: { "content-type": "application/json" } });
    const out = await searchUnsplash({ accessKey: "k", query: "x", fetcher: mockFetch as typeof fetch });
    expect(out[0].url).toBe("https://u/r");
    expect(out[0].source).toBe("unsplash");
    expect(out[0].attribution).toBe("alice");
  });
});

describe("runImages", () => {
  it("warns when API keys missing but doesn't throw", async () => {
    const out = await runImages({
      brief: { step1: { domain: "x.it" }, step4: { businessName: "Demo", industry: "Food" } },
      pages: [{ slug: "home", title: "H", h1: "Home", brief: "b", internalLinksTo: [], targetWords: 600, type: "home" }],
      env: {},
    });
    expect(out.warnings.some((w) => w.includes("FREEPIK"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("UNSPLASH"))).toBe(true);
    expect(out.pages[0].hero).toBe(null);
    expect(out.pages[0].body).toEqual([]);
  });

  it("verifies hero candidates and records warning on all-broken", async () => {
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("freepik")) {
        return new Response(JSON.stringify({ data: [{ image: { source: { url: "https://broken/1.jpg" } } }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (init?.method === "HEAD") return new Response("", { status: 404 });
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await runImages({
      brief: { step1: { domain: "x.it" }, step4: { businessName: "Demo", industry: "Food" } },
      pages: [{ slug: "home", title: "H", h1: "Home", brief: "b", internalLinksTo: [], targetWords: 600, type: "home" }],
      env: { FREEPIK_API_KEY: "k", UNSPLASH_ACCESS_KEY: "u" },
      fetcher: mockFetch as typeof fetch,
    });
    expect(out.pages[0].hero).toBe(null);
    expect(out.warnings.some((w) => w.includes("hero verification failed"))).toBe(true);
  });
});
