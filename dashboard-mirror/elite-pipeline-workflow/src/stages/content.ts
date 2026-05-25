import type { Brief } from "../lib/brief";
import { callAnthropic } from "../lib/anthropic";
import type { PageBlueprint } from "./strategy";

export type ContentOutput = {
  pages: { slug: string; markdown: string; usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number } }[];
};

export type ContentInput = {
  brief: Brief;
  pages: PageBlueprint[];
  env: { ANTHROPIC_API_KEY?: string };
  briefId: string;
  r2?: R2Bucket;
  fetcher?: typeof fetch;
};

function brandSystemPrompt(brief: Brief): string {
  const b = brief.step4;
  return `You write expressive, SEO-aware website copy in ${brief.step9?.lingua ?? "Italiano"}.
Output is Markdown ONLY, with frontmatter (---) at top containing: title, description, slug, image (use "PLACEHOLDER" — images come from a later stage).

Brand:
- Name: ${b?.businessName ?? ""}
- Industry: ${b?.industry ?? ""} / ${b?.subCategory ?? ""}
- Location: ${b?.city ?? ""} ${b?.address ?? ""}
- Description: ${b?.description ?? ""}
- Unique value: ${b?.usp ?? ""}

Voice:
- Formality: ${brief.step8?.toneFormal ?? 3} / 5
- Traits: ${(brief.step8?.voiceTraits ?? []).join(", ")}
- Brand keywords (use organically): ${brief.step8?.brandKeywords ?? ""}
- Forbidden words (NEVER use): ${brief.step8?.avoidWords ?? ""}

Hard rules:
- No invented facts. If a detail is missing in the brief, omit rather than invent.
- No hyperbolic claims ("the best", "leading", etc) unless the brief explicitly states them.
- Internal links: when relevant, link to other pages on the same site using markdown [text](/slug).
- Length: target the word count specified in the user prompt.`;
}

function pageUserPrompt(page: PageBlueprint): string {
  return JSON.stringify({
    slug: page.slug,
    title: page.title,
    h1: page.h1,
    pageBrief: page.brief,
    targetWords: page.targetWords,
    pageType: page.type,
    internalLinksTo: page.internalLinksTo,
  }, null, 2);
}

export async function runContent(input: ContentInput): Promise<ContentOutput> {
  if (!input.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const system = brandSystemPrompt(input.brief);
  const out: ContentOutput["pages"] = [];

  for (const p of input.pages) {
    const result = await callAnthropic({
      apiKey: input.env.ANTHROPIC_API_KEY,
      model: "claude-haiku-4-5-20251001",
      systemBlocks: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: pageUserPrompt(p) }],
      maxTokens: Math.max(1500, p.targetWords * 3),
      fetcher: input.fetcher,
    });

    const md = stripCodeFence(result.text);
    out.push({
      slug: p.slug,
      markdown: md,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cacheReadInputTokens: result.usage.cacheReadInputTokens,
      },
    });

    if (input.r2) {
      await input.r2.put(`content/${input.briefId}/${p.slug}.md`, md, { httpMetadata: { contentType: "text/markdown; charset=utf-8" } });
    }
  }

  return { pages: out };
}

export function stripCodeFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}
