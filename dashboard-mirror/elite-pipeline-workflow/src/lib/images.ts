export type ImageHit = {
  url: string;
  width?: number;
  height?: number;
  source: "freepik" | "unsplash";
  attribution?: string;
};

export async function searchFreepik(args: { apiKey: string; query: string; limit?: number; fetcher?: typeof fetch }): Promise<ImageHit[]> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher(`https://api.freepik.com/v1/resources?term=${encodeURIComponent(args.query)}&limit=${args.limit ?? 5}&order=relevance`, {
    headers: { "x-freepik-api-key": args.apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Freepik ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: { url?: string; image?: { source?: { url?: string }; thumbnail?: { url?: string } } }[] };
  return (json.data ?? [])
    .map((d) => d.image?.source?.url ?? d.image?.thumbnail?.url ?? d.url)
    .filter((u): u is string => Boolean(u))
    .map((u) => ({ url: u, source: "freepik" as const }));
}

export async function searchUnsplash(args: { accessKey: string; query: string; limit?: number; fetcher?: typeof fetch }): Promise<ImageHit[]> {
  const fetcher = args.fetcher ?? fetch;
  const res = await fetcher(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(args.query)}&per_page=${args.limit ?? 5}`, {
    headers: { Authorization: `Client-ID ${args.accessKey}`, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Unsplash ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { results?: { urls?: { regular?: string; full?: string }; user?: { name?: string }; width?: number; height?: number }[] };
  return (json.results ?? [])
    .map((r) => ({
      url: r.urls?.regular ?? r.urls?.full ?? "",
      width: r.width,
      height: r.height,
      source: "unsplash" as const,
      attribution: r.user?.name,
    }))
    .filter((h) => h.url);
}

export async function verifyImageUrl(url: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  // HEAD request — image must resolve. Lesson from paginemarxiste rebuild.
  try {
    const res = await fetcher(url, { method: "HEAD", redirect: "follow" });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}
