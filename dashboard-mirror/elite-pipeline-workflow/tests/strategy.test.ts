import { describe, it, expect } from "vitest";
import { parseStrategyJson, runStrategy } from "../src/stages/strategy";

describe("parseStrategyJson", () => {
  it("parses raw JSON", () => {
    const raw = `{"rationale":"r","pages":[{"slug":"home","title":"H","h1":"H","brief":"b","internalLinksTo":[],"targetWords":600,"type":"home"}]}`;
    const out = parseStrategyJson(raw);
    expect(out.pages.length).toBe(1);
    expect(out.pages[0].slug).toBe("home");
  });

  it("strips ```json fences", () => {
    const raw = "```json\n{\"rationale\":\"r\",\"pages\":[{\"slug\":\"x\",\"title\":\"x\",\"h1\":\"x\",\"brief\":\"\",\"internalLinksTo\":[],\"targetWords\":500,\"type\":\"home\"}]}\n```";
    const out = parseStrategyJson(raw);
    expect(out.pages[0].slug).toBe("x");
  });

  it("filters internalLinksTo to existing slugs", () => {
    const raw = JSON.stringify({
      rationale: "r",
      pages: [
        { slug: "home", title: "H", h1: "H", brief: "b", internalLinksTo: ["servizi", "missing"], targetWords: 600, type: "home" },
        { slug: "servizi", title: "S", h1: "S", brief: "b", internalLinksTo: [], targetWords: 600, type: "servizi" },
      ],
    });
    const out = parseStrategyJson(raw);
    expect(out.pages[0].internalLinksTo).toEqual(["servizi"]);
  });

  it("throws on empty pages array", () => {
    expect(() => parseStrategyJson(`{"rationale":"r","pages":[]}`)).toThrow(/empty/);
  });
});

describe("runStrategy (mocked Anthropic)", () => {
  it("calls Anthropic with cache-control system block and parses output", async () => {
    let captured: { url?: string; init?: RequestInit } = {};
    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify({
        content: [{ type: "text", text: JSON.stringify({ rationale: "r", pages: [{ slug: "home", title: "H", h1: "H", brief: "b", internalLinksTo: [], targetWords: 600, type: "home" }] }) }],
        usage: { input_tokens: 100, output_tokens: 200 },
        stop_reason: "end_turn",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const out = await runStrategy({
      brief: { step1: { domain: "demo.it" } },
      intel: { backlinks: [] },
      env: { ANTHROPIC_API_KEY: "sk-test" },
      fetcher: mockFetch as typeof fetch,
    });
    expect(out.pages.length).toBe(1);
    expect(captured.url).toContain("api.anthropic.com");
    const body = JSON.parse(String(captured.init?.body));
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.model).toBe("claude-haiku-4-5-20251001");
  });

  it("throws when ANTHROPIC_API_KEY missing", async () => {
    await expect(runStrategy({
      brief: { step1: { domain: "x.it" } },
      intel: { backlinks: [] },
      env: {},
    })).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
