import type { Brief } from "../lib/brief";
import { fetchBacklinks, parseAhrefsCsv, dedupeByDomain, type Backlink } from "../lib/dataforseo";

export type IntelInput = {
  brief: Brief;
  env: { DATAFORSEO_LOGIN?: string; DATAFORSEO_PASSWORD?: string; ASSETS_R2?: R2Bucket };
  briefId: string;
  fetcher?: typeof fetch;
};

export type IntelOutput = {
  backlinks: Backlink[];
  sourceCounts: { dataforseo: number; csv: number; merged: number };
  warnings: string[];
};

export async function runIntel(input: IntelInput): Promise<IntelOutput> {
  const sources = input.brief.step6?.sources ?? [input.brief.step6?.source].filter((s): s is string => typeof s === "string");
  const warnings: string[] = [];

  if (sources.length === 0 || sources.includes("skip")) {
    return { backlinks: [], sourceCounts: { dataforseo: 0, csv: 0, merged: 0 }, warnings: ["sources: skip"] };
  }

  let dataforseoLinks: Backlink[] = [];
  let csvLinks: Backlink[] = [];

  if (sources.includes("dataforseo")) {
    if (!input.env.DATAFORSEO_LOGIN || !input.env.DATAFORSEO_PASSWORD) {
      throw new Error("DATAFORSEO_LOGIN/PASSWORD secrets not set");
    }
    dataforseoLinks = await fetchBacklinks({
      login: input.env.DATAFORSEO_LOGIN,
      password: input.env.DATAFORSEO_PASSWORD,
      domain: input.brief.step1.domain,
      fetcher: input.fetcher,
    });
  }

  if (sources.includes("csv")) {
    if (!input.env.ASSETS_R2) {
      throw new Error("ASSETS_R2 binding not present — needed to read uploaded CSV");
    }
    const key = `briefs/${input.briefId}/ahrefs.csv`;
    const obj = await input.env.ASSETS_R2.get(key);
    if (!obj) {
      warnings.push(`csv source declared but R2 key missing: ${key}`);
    } else {
      const text = await obj.text();
      csvLinks = parseAhrefsCsv(text);
    }
  }

  // Per Plan C: dedupe by referring domain, prefer DataForSEO over CSV.
  const merged = dedupeByDomain(dataforseoLinks, csvLinks);

  return {
    backlinks: merged,
    sourceCounts: { dataforseo: dataforseoLinks.length, csv: csvLinks.length, merged: merged.length },
    warnings,
  };
}
