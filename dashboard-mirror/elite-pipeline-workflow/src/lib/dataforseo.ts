export type Backlink = {
  domainFrom: string;
  url: string;
  anchor: string;
  domainRank: number;
  pageRank?: number;
  firstSeen?: string;
  lastSeen?: string;
  isSpam?: boolean;
};

type DfsResponse = {
  status_code: number;
  status_message: string;
  tasks?: {
    status_code: number;
    result?: {
      total_count?: number;
      items?: {
        url_from?: string;
        domain_from?: string;
        anchor?: string;
        domain_from_rank?: number;
        rank?: number;
        first_seen?: string;
        last_seen?: string;
      }[];
    }[];
  }[];
};

export type FetchBacklinksArgs = {
  login: string;
  password: string;
  domain: string;
  limit?: number;
  fetcher?: typeof fetch;
};

export async function fetchBacklinks(args: FetchBacklinksArgs): Promise<Backlink[]> {
  const fetcher = args.fetcher ?? fetch;
  const auth = btoa(`${args.login}:${args.password}`);
  const res = await fetcher("https://api.dataforseo.com/v3/backlinks/backlinks/live", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        target: args.domain,
        mode: "one_per_domain",
        limit: args.limit ?? 250,
        order_by: ["domain_from_rank,desc"],
      },
    ]),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DataForSEO ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = (await res.json()) as DfsResponse;
  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO status ${json.status_code}: ${json.status_message}`);
  }
  const items = json.tasks?.[0]?.result?.[0]?.items ?? [];
  return items
    .filter((it) => it.url_from && it.domain_from)
    .map((it) => ({
      domainFrom: it.domain_from!,
      url: it.url_from!,
      anchor: it.anchor ?? "",
      domainRank: it.domain_from_rank ?? 0,
      pageRank: it.rank,
      firstSeen: it.first_seen,
      lastSeen: it.last_seen,
    }));
}

export function parseAhrefsCsv(csv: string): Backlink[] {
  // Ahrefs has two export shapes we accept:
  //   (a) Per-link: "Referring page URL", "Anchor", "Domain rating"
  //   (b) Per-domain ref-domains: "Domain", "DR", "Is spam", "Traffic", ...
  // Strip UTF-8 BOM if present.
  const cleaned = csv.replace(/^﻿/, "");
  const rows = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rows.length < 2) return [];
  const headerRaw = rows[0];
  const sep = headerRaw.includes("\t") ? "\t" : ",";
  const splitCsv = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
        continue;
      }
      if (ch === sep && !inQuote) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = splitCsv(headerRaw).map((h) => h.toLowerCase().trim());
  const idxUrl = header.findIndex((h) => h.includes("referring page url") || h === "url");
  const idxDomain = header.findIndex((h) => h === "domain" || h === "referring domain");
  const idxAnchor = header.findIndex((h) => h.includes("anchor"));
  const idxDr = header.findIndex((h) => h.includes("domain rating") || h === "dr");
  const idxSpam = header.findIndex((h) => h.includes("is spam") || h === "spam");

  const all: Backlink[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = splitCsv(rows[i]);
    const isSpam = idxSpam >= 0 && (cells[idxSpam] ?? "").trim().toLowerCase() === "true";

    let domain = "";
    let url = "";
    if (idxUrl >= 0 && cells[idxUrl]?.trim()) {
      url = cells[idxUrl].trim();
      try {
        domain = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
    } else if (idxDomain >= 0 && cells[idxDomain]?.trim()) {
      domain = cells[idxDomain].trim().replace(/^www\./, "");
      url = `https://${domain}/`;
    } else {
      continue;
    }
    if (!domain) continue;

    all.push({
      domainFrom: domain,
      url,
      anchor: idxAnchor >= 0 ? (cells[idxAnchor] ?? "").trim() : "",
      domainRank: idxDr >= 0 ? Number(cells[idxDr]) || 0 : 0,
      isSpam,
    });
  }

  // Quality gate: include spam-flagged links only if at least one quality
  // (non-spam) link exists in the dataset. If everything is spam, return [].
  const hasQuality = all.some((b) => !b.isSpam);
  return hasQuality ? all : [];
}

export function dedupeByDomain(...sources: Backlink[][]): Backlink[] {
  // Prefer earlier sources on conflict (per Plan C: DataForSEO preferred over CSV).
  const seen = new Map<string, Backlink>();
  for (const src of sources) {
    for (const link of src) {
      const key = link.domainFrom.toLowerCase();
      if (!seen.has(key)) seen.set(key, link);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.domainRank - a.domainRank);
}
