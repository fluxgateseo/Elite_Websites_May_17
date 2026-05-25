import { NextRequest, NextResponse } from "next/server";
import { SECRETS } from "@/lib/secrets-config";
import { SCRIPT_NAMES } from "@/lib/secret-status";
import { getCurrentUser } from "@/lib/auth";

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

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, value } = body;

  const spec = SECRETS.find((s) => s.name === name);
  if (!spec) {
    return NextResponse.json({ ok: false, error: "Unknown secret name" }, { status: 400 });
  }

  if (!value || typeof value !== "string" || value.trim() === "") {
    return NextResponse.json({ ok: false, error: "Value must be non-empty" }, { status: 400 });
  }

  // Bootstrap: setting CLOUDFLARE_API_TOKEN uses the incoming value as the auth
  // for the CF API call (env may be empty on first run).
  const apiToken =
    name === "CLOUDFLARE_API_TOKEN" ? value.trim() : process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { ok: false, error: "Set CLOUDFLARE_API_TOKEN first — it authorizes every other secret push." },
      { status: 400 }
    );
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? (await deriveAccountId(apiToken));
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: "Cloudflare account not found. Token must include 'Account Settings: Read' or be account-scoped." },
      { status: 400 }
    );
  }

  // Push secret to each binding's Worker script
  const results: { binding: string; ok: boolean; error?: string }[] = [];

  for (const binding of spec.bindings) {
    const scriptName = SCRIPT_NAMES[binding];
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;

    let bindingOk = false;
    let bindingError: string | undefined;

    try {
      const cfRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          text: value,
          type: "secret_text",
        }),
      });

      if (cfRes.ok) {
        bindingOk = true;
      } else {
        // Read error message from CF response but never include the secret value
        const data = (await cfRes.json().catch(() => ({}))) as { errors?: { message: string }[] };
        const msg =
          data?.errors?.[0]?.message ?? `HTTP ${cfRes.status}`;
        bindingError = `CF API error for ${binding}: ${msg}`;
      }
    } catch (err) {
      bindingError = `Network error for ${binding}: ${err instanceof Error ? err.message : "unknown"}`;
    }

    results.push({ binding, ok: bindingOk, error: bindingError });
  }

  const allOk = results.every((r) => r.ok);

  return NextResponse.json(
    { ok: allOk, results },
    { status: allOk ? 200 : 500 }
  );
}
