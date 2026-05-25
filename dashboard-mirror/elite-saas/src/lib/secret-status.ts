import { SECRETS, SecretBinding } from "./secrets-config";

export type SecretStatus = "set" | "missing" | "placeholder";

export const SCRIPT_NAMES: Record<SecretBinding, string> = {
  dashboard: "elite-saas",
  workflow: "elite-pipeline-workflow",
  "leads-worker": "elite-leads-worker",
};

// First account the token can see — lets the status check work with just
// CLOUDFLARE_API_TOKEN (no separate CLOUDFLARE_ACCOUNT_ID needed).
async function deriveAccountId(token: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=2", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { id: string }[] };
    return data.result?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchDeployedSecretNames(
  scriptName: string,
  token: string,
  accountId: string,
): Promise<Set<string>> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return new Set();
    const data = (await res.json()) as { result?: { name: string }[] };
    return new Set((data.result ?? []).map((r) => r.name));
  } catch {
    return new Set();
  }
}

/**
 * Determine the "set" / "missing" status of every configured secret by
 * asking the Cloudflare API which secrets are actually deployed on each
 * Worker script. A secret is "set" only if present on every binding it
 * declares. Falls back to local process.env when CF creds are unavailable
 * (e.g. local dev without a real token) — that's the legacy path and
 * misses cross-worker bindings.
 */
export async function getSecretStatuses(): Promise<Record<string, SecretStatus>> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  // Account ID can be set explicitly, but it's a var with no UI to set it —
  // so when it's absent we derive it from the token (first account it can
  // see), exactly like the secret-write route does. This is what makes the
  // status light actually turn green once CLOUDFLARE_API_TOKEN is set,
  // instead of staying blind-red.
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (token && !accountId) {
    accountId = (await deriveAccountId(token)) ?? undefined;
  }

  if (!token || !accountId) {
    const out: Record<string, SecretStatus> = {};
    for (const s of SECRETS) {
      const v = process.env[s.name];
      out[s.name] = !v ? "missing" : v.startsWith("placeholder_") ? "placeholder" : "set";
    }
    return out;
  }

  const uniqueScripts = Array.from(
    new Set(SECRETS.flatMap((s) => s.bindings.map((b) => SCRIPT_NAMES[b]))),
  );
  const lists = await Promise.all(
    uniqueScripts.map((s) => fetchDeployedSecretNames(s, token, accountId)),
  );
  const byScript: Record<string, Set<string>> = {};
  uniqueScripts.forEach((s, i) => {
    byScript[s] = lists[i];
  });

  const out: Record<string, SecretStatus> = {};
  for (const s of SECRETS) {
    const required = s.bindings.map((b) => SCRIPT_NAMES[b]);
    const everywhere = required.every((script) => byScript[script]?.has(s.name));
    out[s.name] = everywhere ? "set" : "missing";
  }
  return out;
}
