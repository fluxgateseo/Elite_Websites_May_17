// /fix-stage — dashboard-driven diagnosis + auto-fix of failed builds.
// Companion to /custom-prompt (content edits). Same x-pipeline-secret gate.
// See docs/dashboard-fix-stage-chat.md (meta repo) for the contract.
//
// action="diagnose"        → read-only: probe the site + GHA + CF Pages,
//                            return rootCause + evidence + proposedFixes[].
// action="confirm:<fixId>" → apply the named fix (mutates CF/GitHub), then
//                            re-run the Verify smoke checks and, if green,
//                            flip the site to "live".

import { smokeFetch } from "./lib/lighthouse";
import { getDb, loadSiteByDomain, setSiteStatus } from "./lib/db";
import { cfAccountForDomain, type CfAccountLabel } from "./lib/cf-account";
import {
  findZone,
  attachPagesCustomDomain,
  upsertCnameRecord,
  listDnsRecords,
  getPagesProject,
  setAlwaysUseHttps,
  upsertWwwApexRedirect,
} from "./lib/cf-api";
import { getLatestWorkflowRun, rerunWorkflowRun, commitFiles } from "./lib/github";
import type { Env } from "./pipeline";

export type FixId = "redeploy" | "apply-deploy-fix" | "bind-domain" | "canonical-redirects" | "mark-verify";

export type Fix = { id: FixId; label: string; destructive?: boolean };

export type Diagnosis = { rootCause: string; fixes: Fix[] };

const FIXES: Record<FixId, Fix> = {
  "apply-deploy-fix": { id: "apply-deploy-fix", label: "Sblocca il deploy: aggiungi .npmrc/.nvmrc al repo e ri-deploya" },
  redeploy: { id: "redeploy", label: "Rilancia il deploy (re-run dell'ultimo workflow GitHub Actions)" },
  "bind-domain": { id: "bind-domain", label: "Collega il dominio a Pages (custom domain + DNS, rimuove record A obsoleti)", destructive: true },
  "canonical-redirects": { id: "canonical-redirects", label: "Canonical: Always Use HTTPS + 301 www→apex" },
  "mark-verify": { id: "mark-verify", label: "Ri-verifica e segna 'live' se i path rispondono" },
};

export type VerifyProbe = {
  apexOk: boolean;
  pagesOk: boolean;
  sitemapOk: boolean;
  galleriaOk: boolean;
  ghaConclusion: string | null;
  pagesHasDeployment: boolean;
};

// Pure classifier (no IO) so it can be unit-tested. Maps the probe results to
// a root cause + the ordered fixes that address it.
export function classifyVerify(p: VerifyProbe): Diagnosis {
  if (!p.apexOk && !p.pagesOk) {
    const fixes: Fix[] = [];
    if (p.ghaConclusion === "failure" || !p.pagesHasDeployment) fixes.push(FIXES["apply-deploy-fix"]);
    fixes.push(FIXES.redeploy);
    return {
      rootCause:
        "Nessun deployment Pages sano: anche l'URL *.pages.dev non risponde. Il build di deploy non ha prodotto una versione servibile (tipicamente npm ci fallito).",
      fixes,
    };
  }
  if (!p.apexOk && p.pagesOk) {
    return {
      rootCause:
        "Il deployment è sano su *.pages.dev ma il dominio custom non instrada a Pages: binding del custom domain mancante o DNS che punta a un origin sbagliato.",
      fixes: [FIXES["bind-domain"]],
    };
  }
  // apex serves
  if (!p.sitemapOk || !p.galleriaOk) {
    return {
      rootCause:
        "Il sito risponde sulla home ma alcuni path falliscono (sitemap/galleria): problema di contenuto/build, non di routing.",
      fixes: [FIXES.redeploy, FIXES["mark-verify"]],
    };
  }
  return {
    rootCause:
      "Il sito risponde su tutti i path: verify probabilmente transiente, oppure manca solo la canonicalizzazione www/http.",
    fixes: [FIXES["canonical-redirects"], FIXES["mark-verify"]],
  };
}

type FixBody = { domain?: string; jobId?: string; action?: string; note?: string };

const DEFAULT_PATHS = ["/", "/sitemap.xml", "/robots.txt"];

export async function handleFixStage(request: Request, env: Env): Promise<Response> {
  let body: FixBody;
  try {
    body = (await request.json()) as FixBody;
  } catch {
    return Response.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const domain = (body.domain ?? "").trim().toLowerCase().replace(/^www\./, "");
  const action = (body.action ?? "diagnose").trim() || "diagnose";
  if (!domain) return Response.json({ ok: false, error: "domain required" }, { status: 400 });

  const db = getDb(env.DB);
  const site = await loadSiteByDomain(db, domain);
  if (!site) return Response.json({ ok: false, error: `site ${domain} not found` }, { status: 404 });

  const label: CfAccountLabel = site.account === "EN" ? "EN" : "IT";
  const slug = domain.split(".")[0];
  const projectName = site.cloudflarePagesProject ?? `site-${slug}`;
  const cfEnv = env as unknown as Record<string, string | undefined>;

  if (action.startsWith("confirm:")) {
    const fixId = action.slice("confirm:".length) as FixId;
    if (!(fixId in FIXES)) return Response.json({ ok: false, error: `unknown fix ${fixId}` }, { status: 400 });
    return applyFix(fixId, { env, db, domain, label, projectName, githubRepo: site.githubRepo, cfEnv });
  }

  // diagnose (read-only)
  const base = `https://${domain}`;
  const [apex, sitemap, robots, galleria] = await Promise.all([
    smokeFetch(`${base}/`),
    smokeFetch(`${base}/sitemap.xml`),
    smokeFetch(`${base}/robots.txt`),
    smokeFetch(`${base}/galleria`),
  ]);

  let projectSubdomain = `${projectName}.pages.dev`;
  let pagesHasDeployment = false;
  try {
    const cf = cfAccountForDomain(cfEnv, domain, label);
    const proj = await getPagesProject(cf, projectName);
    projectSubdomain = proj.subdomain || projectSubdomain;
    pagesHasDeployment = proj.hasDeployment;
  } catch {
    /* project missing or CF token absent — left as defaults */
  }
  const pagesDev = await smokeFetch(`https://${projectSubdomain}/`);

  let ghaConclusion: string | null = null;
  if (site.githubRepo && env.GITHUB_TOKEN) {
    const [owner, repo] = site.githubRepo.split("/");
    try {
      const run = await getLatestWorkflowRun({ token: env.GITHUB_TOKEN, owner, repo });
      ghaConclusion = run?.conclusion ?? null;
    } catch {
      /* ignore */
    }
  }

  let apexDns: string | null = null;
  try {
    const cf = cfAccountForDomain(cfEnv, domain, label);
    const zone = await findZone(cf, domain);
    if (zone) {
      const recs = await listDnsRecords(cf, zone.id, domain);
      apexDns = recs.map((r) => `${r.type}${r.proxied ? "(proxied)" : ""}→${r.content}`).join(", ") || null;
    }
  } catch {
    /* ignore */
  }

  const { rootCause, fixes } = classifyVerify({
    apexOk: apex.ok,
    pagesOk: pagesDev.ok,
    sitemapOk: sitemap.ok,
    galleriaOk: galleria.ok,
    ghaConclusion,
    pagesHasDeployment,
  });

  return Response.json({
    ok: true,
    stage: "verify",
    rootCause,
    evidence: {
      "/": apex.status,
      "/sitemap.xml": sitemap.status,
      "/robots.txt": robots.status,
      "/galleria": galleria.status,
      [`${projectSubdomain}`]: pagesDev.status,
      gha: ghaConclusion ?? "n/a",
      pagesDeployment: pagesHasDeployment ? "present" : "none",
      apexDns: apexDns ?? "n/a",
    },
    proposedFixes: fixes,
  });
}

async function applyFix(
  fixId: FixId,
  ctx: {
    env: Env;
    db: ReturnType<typeof getDb>;
    domain: string;
    label: CfAccountLabel;
    projectName: string;
    githubRepo: string | null;
    cfEnv: Record<string, string | undefined>;
  },
): Promise<Response> {
  const { env, db, domain, label, projectName, githubRepo, cfEnv } = ctx;
  let applied = "";
  try {
    switch (fixId) {
      case "redeploy": {
        if (!githubRepo || !env.GITHUB_TOKEN) throw new Error("githubRepo or GITHUB_TOKEN missing");
        const [owner, repo] = githubRepo.split("/");
        const run = await getLatestWorkflowRun({ token: env.GITHUB_TOKEN, owner, repo });
        if (!run) throw new Error("no workflow run to re-run");
        await rerunWorkflowRun({ token: env.GITHUB_TOKEN, owner, repo, runId: run.id });
        applied = `re-run ${run.name} (${run.htmlUrl})`;
        break;
      }
      case "apply-deploy-fix": {
        if (!githubRepo || !env.GITHUB_TOKEN) throw new Error("githubRepo or GITHUB_TOKEN missing");
        const [owner, repo] = githubRepo.split("/");
        const { commitSha } = await commitFiles({
          token: env.GITHUB_TOKEN,
          owner,
          repo,
          branch: "main",
          message: "fix-stage: unblock CF Pages deploy (.npmrc legacy-peer-deps + .nvmrc)",
          files: [
            { path: ".npmrc", content: "legacy-peer-deps=true\n", encoding: "utf-8" },
            { path: ".nvmrc", content: "22.12.0\n", encoding: "utf-8" },
          ],
        });
        applied = `commit ${commitSha.slice(0, 7)} (triggers deploy)`;
        break;
      }
      case "bind-domain": {
        const cf = cfAccountForDomain(cfEnv, domain, label);
        const zone = await findZone(cf, domain);
        if (!zone) throw new Error(`zone ${domain} not found on account ${label}`);
        const proj = await getPagesProject(cf, projectName);
        const subdomain = proj.subdomain || `${projectName}.pages.dev`;
        try {
          await attachPagesCustomDomain(cf, { projectName, domain });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!/already exists|already added|409|8000018/i.test(msg)) throw err;
        }
        await upsertCnameRecord(cf, { zoneId: zone.id, name: domain, content: subdomain, proxied: true });
        applied = `bound ${domain} → ${subdomain}`;
        break;
      }
      case "canonical-redirects": {
        const cf = cfAccountForDomain(cfEnv, domain, label);
        const zone = await findZone(cf, domain);
        if (!zone) throw new Error(`zone ${domain} not found on account ${label}`);
        await setAlwaysUseHttps(cf, zone.id);
        const r = await upsertWwwApexRedirect(cf, zone.id, domain);
        applied = `Always Use HTTPS on; www→apex 301 ${r.added ? "created" : "already present"}`;
        break;
      }
      case "mark-verify": {
        applied = "re-verify";
        break;
      }
    }
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  // Re-run the Verify smoke checks; flip to live if green.
  const base = `https://${domain}`;
  const checks = await Promise.all(DEFAULT_PATHS.map((p) => smokeFetch(base + p)));
  const verify: Record<string, number> = {};
  DEFAULT_PATHS.forEach((p, i) => (verify[p] = checks[i].status));
  const verifyOk = checks.every((c) => c.ok);
  if (verifyOk) await setSiteStatus(db, domain, "live");

  return Response.json({ ok: true, applied, verify, status: verifyOk ? "live" : "error" });
}
