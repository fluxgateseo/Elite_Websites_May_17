export type LighthouseScores = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
};

export async function runLighthouse(args: { url: string; fetcher?: typeof fetch }): Promise<LighthouseScores> {
  const fetcher = args.fetcher ?? fetch;
  // PageSpeed Insights API (no key for ≤25k req/day per CF docs).
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(args.url)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
  const res = await fetcher(psiUrl);
  if (!res.ok) {
    throw new Error(`PSI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    lighthouseResult?: { categories?: { performance?: { score: number }; accessibility?: { score: number }; "best-practices"?: { score: number }; seo?: { score: number } } };
  };
  const cats = json.lighthouseResult?.categories ?? {};
  return {
    performance: Math.round((cats.performance?.score ?? 0) * 100),
    accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
    seo: Math.round((cats.seo?.score ?? 0) * 100),
  };
}

export async function smokeFetch(url: string, fetcher: typeof fetch = fetch): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await fetcher(url, { redirect: "follow" });
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
}
