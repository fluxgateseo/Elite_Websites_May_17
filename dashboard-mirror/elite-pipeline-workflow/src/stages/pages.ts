import type { Brief } from "../lib/brief";
import { cfAccountForDomain, type CfAccountLabel } from "../lib/cf-account";
import { findZone, createPagesProject, attachPagesCustomDomain, upsertCnameRecord } from "../lib/cf-api";

export type PagesZoneOutput = {
  zoneId: string;
  status: string;
  account: CfAccountLabel;
};

export type PagesProjectOutput = {
  projectName: string;
  projectSubdomain: string;
  account: CfAccountLabel;
};

export type PagesOutput = {
  projectName: string;
  projectSubdomain: string;
  customDomain: string;
  zoneId: string;
  account: CfAccountLabel;
};

export type PagesEnv = {
  CLOUDFLARE_API_TOKEN_IT?: string;
  CLOUDFLARE_ACCOUNT_ID_IT?: string;
  CLOUDFLARE_API_TOKEN_EN?: string;
  CLOUDFLARE_ACCOUNT_ID_EN?: string;
};

export async function runPagesZoneCheck(args: { domain: string; account: CfAccountLabel; env: PagesEnv; fetcher?: typeof fetch }): Promise<PagesZoneOutput> {
  const cf = cfAccountForDomain(args.env, args.domain, args.account);
  const zone = await findZone(cf, args.domain, args.fetcher);
  if (!zone) {
    throw new Error(
      `Zone "${args.domain}" not found on account ${args.account}. Move it to the correct CF account before retry; cross-account zone move is not supported.`,
    );
  }
  if (zone.status !== "active") {
    throw new Error(`Zone "${args.domain}" status is "${zone.status}", expected "active"`);
  }
  return { zoneId: zone.id, status: zone.status, account: args.account };
}

export async function runPagesProjectCreate(args: {
  brief: Brief;
  account: CfAccountLabel;
  repoFullName: string;
  env: PagesEnv;
  fetcher?: typeof fetch;
}): Promise<PagesProjectOutput> {
  const domain = args.brief.step1.domain;
  const cf = cfAccountForDomain(args.env, domain, args.account);
  const slugBase = domain.replace(/^www\./, "").split(".")[0];
  const projectName = `site-${slugBase}`;
  const [repoOwner, repoName] = args.repoFullName.split("/");

  let projectSubdomain = `${projectName}.pages.dev`;
  try {
    const proj = await createPagesProject(cf, {
      projectName,
      repoOwner,
      repoName,
      productionBranch: "main",
      buildCommand: "pnpm install && pnpm build",
      destinationDir: "dist",
      envVars: { DOMAIN: domain, ACCOUNT: args.account },
      fetcher: args.fetcher,
    });
    projectSubdomain = proj.subdomain;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|already added|409|8000018/i.test(msg)) throw err;
  }
  return { projectName, projectSubdomain, account: args.account };
}

export async function runPagesCustomDomain(args: {
  domain: string;
  projectName: string;
  account: CfAccountLabel;
  env: PagesEnv;
  fetcher?: typeof fetch;
}): Promise<{ ok: true }> {
  const cf = cfAccountForDomain(args.env, args.domain, args.account);
  try {
    await attachPagesCustomDomain(cf, { projectName: args.projectName, domain: args.domain, fetcher: args.fetcher });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists|already added|409|8000018/i.test(msg)) throw err;
  }
  return { ok: true };
}

export async function runPagesDns(args: {
  domain: string;
  zoneId: string;
  projectSubdomain: string;
  account: CfAccountLabel;
  env: PagesEnv;
  fetcher?: typeof fetch;
}): Promise<{ ok: true }> {
  const cf = cfAccountForDomain(args.env, args.domain, args.account);
  await upsertCnameRecord(cf, {
    zoneId: args.zoneId,
    name: args.domain,
    content: args.projectSubdomain,
    proxied: true,
    fetcher: args.fetcher,
  });
  return { ok: true };
}
