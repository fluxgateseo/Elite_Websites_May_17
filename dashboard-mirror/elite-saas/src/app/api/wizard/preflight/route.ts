import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cfAccountForDomain, inferAccountFromDomain, type CfAccountLabel } from "@/lib/cf-account";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(domain)) {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const result: {
    whois?: { registered_until?: string; registrar?: string };
    ns?: string[];
    cf_zone?: { present: boolean; status?: string; id?: string; account?: CfAccountLabel };
    error?: string;
  } = {};

  // 1. WHOIS via rdap.org
  try {
    const rdapRes = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (rdapRes.ok) {
      const rdap = await rdapRes.json() as {
        events?: { eventAction: string; eventDate: string }[];
        entities?: { roles: string[]; vcardArray?: unknown[] }[];
      };

      const expiry = rdap.events?.find(
        (e) => e.eventAction === "expiration"
      )?.eventDate;

      // Try to extract registrar name from entities
      let registrar: string | undefined;
      const registrarEntity = rdap.entities?.find((e) => e.roles?.includes("registrar"));
      if (registrarEntity?.vcardArray) {
        const vcard = registrarEntity.vcardArray as [string, unknown[]][];
        if (Array.isArray(vcard) && Array.isArray(vcard[1])) {
          const fnEntry = (vcard[1] as unknown[]).find(
            (entry) => Array.isArray(entry) && (entry as unknown[])[0] === "fn"
          );
          if (fnEntry && Array.isArray(fnEntry)) {
            registrar = String((fnEntry as unknown[])[3] ?? "");
          }
        }
      }

      result.whois = {
        registered_until: expiry,
        registrar: registrar ?? "N/A",
      };
    } else {
      result.whois = { registered_until: undefined, registrar: "RDAP lookup failed" };
    }
  } catch {
    result.whois = { registered_until: undefined, registrar: "Timeout or error" };
  }

  // 2. DNS NS records via Cloudflare DNS-over-HTTPS
  try {
    const dnsRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`,
      {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (dnsRes.ok) {
      const dnsData = await dnsRes.json() as { Answer?: { type: number; data: string }[] };
      const nsRecords = (dnsData.Answer ?? [])
        .filter((r) => r.type === 2)
        .map((r) => r.data.replace(/\.$/, ""));
      result.ns = nsRecords;
    } else {
      result.ns = [];
    }
  } catch {
    result.ns = [];
  }

  // 3. Check Cloudflare zone — route to correct account by TLD
  let apiToken: string | undefined;
  let accountId: string | undefined;
  let accountLabel: CfAccountLabel | undefined;

  const inference = inferAccountFromDomain(domain);
  if (inference === "AMBIGUOUS") {
    // .ai/.io/other: wizard will let the operator pick later. Default to host account.
    apiToken = process.env.CLOUDFLARE_API_TOKEN;
    accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  } else {
    try {
      const account = cfAccountForDomain(process.env, domain);
      apiToken = account.token;
      accountId = account.accountId;
      accountLabel = account.label;
    } catch {
      // Suffixed secrets not yet set (e.g. fresh deploy): fall back to host pair.
      apiToken = process.env.CLOUDFLARE_API_TOKEN;
      accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    }
  }

  if (apiToken && accountId) {
    try {
      const zoneRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${domain}&account.id=${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (zoneRes.ok) {
        const zoneData = await zoneRes.json() as {
          success: boolean;
          result: { id: string; status: string }[];
        };

        if (zoneData.success && zoneData.result.length > 0) {
          const zone = zoneData.result[0];
          result.cf_zone = {
            present: true,
            status: zone.status,
            id: zone.id,
            account: accountLabel,
          };
        } else {
          result.cf_zone = { present: false, account: accountLabel };
        }
      } else {
        result.cf_zone = { present: false };
      }
    } catch {
      result.cf_zone = { present: false };
    }
  } else {
    // No CF token — can't check zone
    result.cf_zone = { present: false };
  }

  return NextResponse.json(result);
}
