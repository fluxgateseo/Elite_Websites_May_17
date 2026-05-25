import type { CfAccount } from "./cf-account";

const BASE = "https://api.cloudflare.com/client/v4";

async function cfFetch(account: CfAccount, path: string, init?: RequestInit, fetcher: typeof fetch = fetch): Promise<unknown> {
  const res = await fetcher(`${BASE}${path}`, {
    ...(init ?? {}),
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${account.token}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json()) as { success: boolean; result: unknown; errors?: { code: number; message: string }[] };
  if (!res.ok || !json.success) {
    const err = json.errors?.[0];
    throw new Error(`CF ${path} ${res.status}: ${err?.code ?? "?"} ${err?.message ?? "unknown"}`);
  }
  return json.result;
}

export async function findZone(account: CfAccount, domain: string, fetcher?: typeof fetch): Promise<{ id: string; status: string } | null> {
  const result = (await cfFetch(account, `/zones?name=${encodeURIComponent(domain)}&account.id=${account.accountId}`, undefined, fetcher)) as { id: string; status: string }[];
  if (result.length === 0) return null;
  return { id: result[0].id, status: result[0].status };
}

export async function createPagesProject(account: CfAccount, args: {
  projectName: string;
  repoOwner?: string;
  repoName?: string;
  productionBranch?: string;
  buildCommand?: string;
  destinationDir?: string;
  envVars?: Record<string, string>;
  /** When false (default), no GitHub source is wired — project is in Direct
   * Upload mode. Builds happen externally (GH Actions, local CLI, etc.) and
   * deployments are pushed via the deployments API. This avoids CF Pages'
   * GitHub App authorization quirks entirely. */
  useGitHubSource?: boolean;
  fetcher?: typeof fetch;
}): Promise<{ name: string; subdomain: string }> {
  const productionBranch = args.productionBranch ?? "main";
  const body: Record<string, unknown> = {
    name: args.projectName,
    production_branch: productionBranch,
    deployment_configs: {
      production: {
        env_vars: args.envVars
          ? Object.fromEntries(Object.entries(args.envVars).map(([k, v]) => [k, { value: v }]))
          : {},
      },
    },
  };
  if (args.useGitHubSource && args.repoOwner && args.repoName) {
    body.build_config = {
      build_command: args.buildCommand ?? "pnpm build",
      destination_dir: args.destinationDir ?? "dist",
      root_dir: "",
    };
    body.source = {
      type: "github",
      config: {
        owner: args.repoOwner,
        repo_name: args.repoName,
        production_branch: productionBranch,
        deployments_enabled: true,
      },
    };
  }
  const result = (await cfFetch(account, `/accounts/${account.accountId}/pages/projects`, {
    method: "POST",
    body: JSON.stringify(body),
  }, args.fetcher)) as { name: string; subdomain: string };
  return { name: result.name, subdomain: result.subdomain };
}

export async function attachPagesCustomDomain(account: CfAccount, args: { projectName: string; domain: string; fetcher?: typeof fetch }): Promise<void> {
  await cfFetch(account, `/accounts/${account.accountId}/pages/projects/${encodeURIComponent(args.projectName)}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: args.domain }),
  }, args.fetcher);
}

export async function upsertCnameRecord(account: CfAccount, args: { zoneId: string; name: string; content: string; proxied?: boolean; fetcher?: typeof fetch }): Promise<void> {
  // Look up ALL records at this hostname (any type). Apex domains often have
  // pre-existing A/AAAA from prior setups; CF rejects creating a CNAME at a
  // host that already has another record type. Delete the conflicting types
  // first, then upsert the CNAME.
  const all = (await cfFetch(account, `/zones/${args.zoneId}/dns_records?name=${encodeURIComponent(args.name)}`, undefined, args.fetcher)) as { id: string; type: string }[];
  const cname = all.find((r) => r.type === "CNAME");
  const conflicting = all.filter((r) => r.type === "A" || r.type === "AAAA");

  // Remove A/AAAA so the CNAME can take that hostname.
  for (const r of conflicting) {
    await cfFetch(account, `/zones/${args.zoneId}/dns_records/${r.id}`, {
      method: "DELETE",
    }, args.fetcher);
  }

  const body = {
    type: "CNAME" as const,
    name: args.name,
    content: args.content,
    proxied: args.proxied ?? true,
    ttl: 1,
  };
  if (cname) {
    await cfFetch(account, `/zones/${args.zoneId}/dns_records/${cname.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }, args.fetcher);
  } else {
    await cfFetch(account, `/zones/${args.zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(body),
    }, args.fetcher);
  }
}

// --- fix-stage helpers ---------------------------------------------------

export async function listDnsRecords(account: CfAccount, zoneId: string, name: string, fetcher?: typeof fetch): Promise<{ type: string; content: string; proxied: boolean }[]> {
  const result = (await cfFetch(account, `/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`, undefined, fetcher)) as { type: string; content: string; proxied?: boolean }[];
  return result.map((r) => ({ type: r.type, content: r.content, proxied: r.proxied ?? false }));
}

export async function getPagesProject(account: CfAccount, projectName: string, fetcher?: typeof fetch): Promise<{ subdomain: string; hasDeployment: boolean; deployState: string | null }> {
  const result = (await cfFetch(account, `/accounts/${account.accountId}/pages/projects/${encodeURIComponent(projectName)}`, undefined, fetcher)) as {
    subdomain?: string;
    latest_deployment?: { latest_stage?: { status?: string } } | null;
  };
  const ld = result.latest_deployment ?? null;
  return {
    subdomain: result.subdomain ?? `${projectName}.pages.dev`,
    hasDeployment: ld !== null,
    deployState: ld?.latest_stage?.status ?? null,
  };
}

export async function setAlwaysUseHttps(account: CfAccount, zoneId: string, fetcher?: typeof fetch): Promise<void> {
  await cfFetch(account, `/zones/${zoneId}/settings/always_use_https`, {
    method: "PATCH",
    body: JSON.stringify({ value: "on" }),
  }, fetcher);
}

// Idempotent www→apex 301 via the dynamic-redirect ruleset. Preserves any
// existing redirect rules; adds ours only if not already present (matched by
// description). target = https://<apex><path>, query string preserved.
export async function upsertWwwApexRedirect(account: CfAccount, zoneId: string, apex: string, fetcher?: typeof fetch): Promise<{ added: boolean }> {
  const phase = "http_request_dynamic_redirect";
  const description = `www->apex 301 (elite fix-stage) ${apex}`;
  type Rule = { description?: string; [k: string]: unknown };
  let existing: Rule[] = [];
  try {
    const ep = (await cfFetch(account, `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`, undefined, fetcher)) as { rules?: Rule[] };
    existing = ep.rules ?? [];
  } catch {
    existing = [];
  }
  if (existing.some((r) => r.description === description)) return { added: false };
  const rule = {
    action: "redirect",
    action_parameters: {
      from_value: {
        status_code: 301,
        target_url: { expression: `concat("https://${apex}", http.request.uri.path)` },
        preserve_query_string: true,
      },
    },
    expression: `(http.host eq "www.${apex}")`,
    description,
    enabled: true,
  };
  await cfFetch(account, `/zones/${zoneId}/rulesets/phases/${phase}/entrypoint`, {
    method: "PUT",
    body: JSON.stringify({ rules: [...existing, rule] }),
  }, fetcher);
  return { added: true };
}
