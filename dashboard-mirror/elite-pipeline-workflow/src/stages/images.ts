import type { Brief } from "../lib/brief";
import type { PageBlueprint } from "./strategy";
import { searchFreepik, searchUnsplash, verifyImageUrl, type ImageHit } from "../lib/images";

export type ImagesOutput = {
  pages: { slug: string; hero: ImageHit | null; body: ImageHit[] }[];
  warnings: string[];
};

export type ImagesInput = {
  brief: Brief;
  pages: PageBlueprint[];
  env: { FREEPIK_API_KEY?: string; UNSPLASH_ACCESS_KEY?: string };
  fetcher?: typeof fetch;
};

export async function runImages(input: ImagesInput): Promise<ImagesOutput> {
  const warnings: string[] = [];
  const industry = input.brief.step4?.industry ?? "";
  const out: ImagesOutput["pages"] = [];

  const freepikKey = input.env.FREEPIK_API_KEY;
  const unsplashKey = input.env.UNSPLASH_ACCESS_KEY;
  if (!freepikKey) warnings.push("FREEPIK_API_KEY not set — hero images skipped");
  if (!unsplashKey) warnings.push("UNSPLASH_ACCESS_KEY not set — body images skipped");

  for (const p of input.pages) {
    const heroQuery = `${p.h1} ${industry}`.trim();
    let hero: ImageHit | null = null;

    if (freepikKey) {
      const candidates = await searchFreepik({ apiKey: freepikKey, query: heroQuery, limit: 5, fetcher: input.fetcher });
      hero = await firstVerified(candidates, input.fetcher);
      if (!hero) warnings.push(`hero verification failed for ${p.slug}`);
    }

    let body: ImageHit[] = [];
    if (unsplashKey) {
      const candidates = await searchUnsplash({ accessKey: unsplashKey, query: heroQuery, limit: 5, fetcher: input.fetcher });
      const verified: ImageHit[] = [];
      for (const c of candidates) {
        if (verified.length >= 2) break;
        if (await verifyImageUrl(c.url, input.fetcher)) verified.push(c);
      }
      body = verified;
    }

    out.push({ slug: p.slug, hero, body });
  }

  return { pages: out, warnings };
}

async function firstVerified(candidates: ImageHit[], fetcher?: typeof fetch): Promise<ImageHit | null> {
  for (const c of candidates) {
    if (await verifyImageUrl(c.url, fetcher)) return c;
  }
  return null;
}
