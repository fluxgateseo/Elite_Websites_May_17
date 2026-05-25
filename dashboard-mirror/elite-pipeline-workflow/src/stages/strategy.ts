import type { Brief } from "../lib/brief";
import { callAnthropic } from "../lib/anthropic";
import type { Backlink } from "../lib/dataforseo";

export type PageBlueprint = {
  slug: string;
  title: string;
  h1: string;
  brief: string;
  internalLinksTo: string[];
  targetWords: number;
  type: "home" | "chi-siamo" | "servizi" | "galleria" | "eventi" | "blog-index" | "blog-article" | "faq" | "contatti";
  linkEquityDestination?: boolean;
};

export type StrategyOutput = {
  pages: PageBlueprint[];
  rationale: string;
};

export type StrategyInput = {
  brief: Brief;
  intel: { backlinks: Backlink[] };
  env: { ANTHROPIC_API_KEY?: string };
  fetcher?: typeof fetch;
};

const SYSTEM_PROMPT = `You are a senior SEO content strategist. Given a business brief and a list of high-DR
historical backlinks pointing at an expired domain, output a coherent multi-page Astro site outline that:
1) Recovers the link equity of the expired domain by mapping old anchor topics into current pages.
2) Reflects the brand voice and avoids forbidden words.
3) Builds an internal-link graph that pushes link juice INTO the pages that
   match high-DR backlink anchors (the "link-equity destinations"). These
   destination pages should receive multiple inbound internal links from
   shorter / less-important pages — concretely: the home page and at least
   2-3 other pages must link TO each link-equity destination, while the
   destinations themselves link out sparingly. This is how recovered backlink
   juice gets distributed across the new site.
4) Reflects the elite-astro-template docs/internal-linking.md conventions
   (2-4 cross-links per page minimum, anchor text varied).

You MUST respond with ONLY valid JSON matching this TypeScript shape:
{
  "rationale": string,
  "pages": Array<{
    "slug": string,
    "title": string,
    "h1": string,
    "brief": string,
    "internalLinksTo": string[],
    "targetWords": number,
    "type": "home" | "chi-siamo" | "servizi" | "galleria" | "eventi" | "blog-index" | "blog-article" | "faq" | "contatti",
    "linkEquityDestination": boolean
  }>
}

Constraints:
- Total pages: 8-15. Always include "home" + "contatti".
- Slugs are URL-safe lowercase, no leading slash.
- Internal-link targets must be slugs that exist in the same response.
- targetWords: 600-1500 for content pages, 250-400 for shorter ones.
- For each page where linkEquityDestination=true: at least 3 OTHER pages
  must include this slug in their internalLinksTo array. Verify before
  responding.`;

function buildUserPrompt(args: { brief: Brief; intel: { backlinks: Backlink[] } }): string {
  const b = args.brief;
  const top = args.intel.backlinks.slice(0, 30);
  return JSON.stringify({
    domain: b.step1.domain,
    business: b.step4 ?? {},
    designStyle: b.step7?.designStyle,
    palette: b.step7?.palette,
    tone: { formal: b.step8?.toneFormal, traits: b.step8?.voiceTraits, avoid: b.step8?.avoidWords, keywords: b.step8?.brandKeywords },
    desiredPages: b.step9?.pages ?? {},
    blogArticleCount: b.step9?.pages?.blogArticoli ?? 0,
    lingua: b.step9?.lingua ?? "Italiano",
    backlinksTopByDr: top.map((l) => ({ from: l.domainFrom, anchor: l.anchor, dr: l.domainRank, isSpam: l.isSpam ?? false })),
    backlinkPolicyNote: "Some referring domains are flagged isSpam=true (Ahrefs heuristic). They are still useful signal IF the dataset also contains quality (non-spam) domains — which it does, since this list reached you. Prefer quality domains as link-equity destinations, but don't ignore spam ones entirely if their anchor topic is also covered by a non-spam domain.",
  }, null, 2);
}

export async function runStrategy(input: StrategyInput): Promise<StrategyOutput> {
  if (!input.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const result = await callAnthropic({
    apiKey: input.env.ANTHROPIC_API_KEY,
    model: "claude-haiku-4-5-20251001",
    systemBlocks: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserPrompt({ brief: input.brief, intel: input.intel }) }],
    maxTokens: 8000,
    fetcher: input.fetcher,
  });

  const parsed = parseStrategyJson(result.text);
  return parsed;
}

export function parseStrategyJson(raw: string): StrategyOutput {
  // The model may wrap JSON in ```json fences. Strip them.
  let s = raw.trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) s = fenceMatch[1].trim();
  const json = JSON.parse(s) as StrategyOutput;
  if (!Array.isArray(json.pages) || json.pages.length === 0) {
    throw new Error("strategy output: pages array missing or empty");
  }
  // Validate cross-links resolve
  const slugs = new Set(json.pages.map((p) => p.slug));
  for (const p of json.pages) {
    p.internalLinksTo = (p.internalLinksTo ?? []).filter((s) => slugs.has(s));
  }
  return json;
}
