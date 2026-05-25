import { describe, it, expect } from "vitest";
import { stripCodeFence, runContent } from "../src/stages/content";

describe("stripCodeFence", () => {
  it("strips ```markdown fence", () => {
    expect(stripCodeFence("```markdown\n# H\nbody\n```")).toBe("# H\nbody");
  });
  it("strips ```md fence", () => {
    expect(stripCodeFence("```md\nx\n```")).toBe("x");
  });
  it("strips bare ``` fence", () => {
    expect(stripCodeFence("```\nx\n```")).toBe("x");
  });
  it("returns content unchanged when no fence", () => {
    expect(stripCodeFence("just text")).toBe("just text");
  });
});

describe("runContent (mocked Anthropic)", () => {
  it("calls Anthropic per page with brand system prompt + cache control", async () => {
    const captured: { systemTexts: string[]; bodies: unknown[] } = { systemTexts: [], bodies: [] };
    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      captured.bodies.push(body);
      captured.systemTexts.push(body.system?.[0]?.text ?? "");
      return new Response(JSON.stringify({
        content: [{ type: "text", text: `# ${body.messages[0].content[0].text}\n\nbody` }],
        usage: { input_tokens: 50, output_tokens: 100, cache_read_input_tokens: 10 },
        stop_reason: "end_turn",
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const out = await runContent({
      brief: {
        step1: { domain: "demo.it" },
        step4: { businessName: "Demo Co", description: "Describes a demo" },
        step8: { brandKeywords: "demo, qualità", avoidWords: "cheap" },
        step9: { lingua: "Italiano" },
      },
      pages: [
        { slug: "home", title: "Home", h1: "Home", brief: "Home page", internalLinksTo: [], targetWords: 600, type: "home" },
        { slug: "chi-siamo", title: "Chi", h1: "Chi", brief: "About", internalLinksTo: ["home"], targetWords: 400, type: "chi-siamo" },
      ],
      env: { ANTHROPIC_API_KEY: "sk-test" },
      briefId: "b1",
      fetcher: mockFetch as typeof fetch,
    });

    expect(out.pages.length).toBe(2);
    expect(captured.bodies.length).toBe(2);
    // Both calls share the same cached system block
    expect(captured.systemTexts[0]).toContain("Demo Co");
    expect(captured.systemTexts[0]).toContain("demo, qualità");
    expect(captured.systemTexts[0]).toContain("cheap"); // forbidden words listed
    const firstBody = captured.bodies[0] as { system: { cache_control?: { type: string } }[] };
    expect(firstBody.system[0].cache_control).toEqual({ type: "ephemeral" });
    // Cache hit usage propagated
    expect(out.pages[0].usage.cacheReadInputTokens).toBe(10);
  });

  it("throws without ANTHROPIC_API_KEY", async () => {
    await expect(runContent({
      brief: { step1: { domain: "x.it" } },
      pages: [{ slug: "home", title: "H", h1: "H", brief: "", internalLinksTo: [], targetWords: 500, type: "home" }],
      env: {},
      briefId: "b1",
    })).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
