import { runLighthouse, smokeFetch, type LighthouseScores } from "../lib/lighthouse";

export type VerifyOutput = {
  ok: boolean;
  smoke: { path: string; status: number; ok: boolean }[];
  lighthouse: LighthouseScores | null;
  failures: string[];
};

export type VerifyInput = {
  domain: string;
  fetcher?: typeof fetch;
  smokePaths?: string[];
};

const DEFAULT_PATHS = ["/", "/sitemap.xml", "/robots.txt"];

export async function runVerify(input: VerifyInput): Promise<VerifyOutput> {
  const base = `https://${input.domain}`;
  const paths = input.smokePaths ?? DEFAULT_PATHS;
  const failures: string[] = [];

  // 1. Smoke checks
  const smoke = [];
  for (const p of paths) {
    const r = await smokeFetch(base + p, input.fetcher);
    smoke.push({ path: p, status: r.status, ok: r.ok });
    if (!r.ok) failures.push(`${p} returned ${r.status}`);
  }

  // 2. Lighthouse (best-effort — if PSI is rate-limited, skip but don't fail).
  let lighthouse: LighthouseScores | null = null;
  try {
    lighthouse = await runLighthouse({ url: base, fetcher: input.fetcher });
    if (lighthouse.performance < 50) failures.push(`PSI performance ${lighthouse.performance} < 50`);
    if (lighthouse.seo < 80) failures.push(`PSI seo ${lighthouse.seo} < 80`);
  } catch (err) {
    failures.push(`lighthouse skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    ok: failures.length === 0 && smoke.every((s) => s.ok),
    smoke,
    lighthouse,
    failures,
  };
}
