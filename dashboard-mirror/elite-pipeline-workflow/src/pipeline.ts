import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { getDb, ensureJob, setJobStage, setJobFinished, setSiteStatus, recordStageOutput, loadSiteByDomain } from "./lib/db";
import { parseBrief, type Brief } from "./lib/brief";
import { runIntel, type IntelOutput } from "./stages/intel";
import { runStrategy, type StrategyOutput } from "./stages/strategy";
import { runContent, type ContentOutput } from "./stages/content";
import { runImages, type ImagesOutput } from "./stages/images";
import { runRepoCreate, runRepoCommitOverlay, type RepoCreateOutput, type RepoCommitOutput } from "./stages/repo";
import { runPagesZoneCheck, runPagesProjectCreate, runPagesCustomDomain, runPagesDns, type PagesZoneOutput, type PagesProjectOutput, type PagesOutput } from "./stages/pages";
import { runVerify, type VerifyOutput } from "./stages/verify";
import { addAnthropicSpend, addDataForSeoCall } from "./lib/spend";

export interface Env {
  PIPELINE: Workflow;
  DB: D1Database;
  ASSETS_R2?: R2Bucket;
  ANTHROPIC_API_KEY?: string;
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  FREEPIK_API_KEY?: string;
  UNSPLASH_ACCESS_KEY?: string;
  CLOUDFLARE_API_TOKEN_IT?: string;
  CLOUDFLARE_ACCOUNT_ID_IT?: string;
  CLOUDFLARE_API_TOKEN_EN?: string;
  CLOUDFLARE_ACCOUNT_ID_EN?: string;
  [key: string]: unknown;
}

export interface PipelineParams {
  domain: string;
  briefId: string;
  jobId: string;
  userId?: string;
  dryRun?: boolean;
}

export class PipelineWorkflow extends WorkflowEntrypoint<Env, PipelineParams> {
  async run(event: WorkflowEvent<PipelineParams>, step: WorkflowStep) {
    const { domain, briefId, jobId, userId, dryRun } = event.payload;
    const env = this.env;
    const db = getDb(env.DB);

    // Ensure job row.
    await step.do("init-job", async () => {
      await ensureJob(db, { id: jobId, domain, userId: null, workflowInstanceId: jobId });
      await setSiteStatus(db, domain, "building");
    });

    // Load brief + account from D1. Step.do persistence requires plain JSON-safe values,
    // so we store briefJson as a string and parse fresh in each stage.
    const briefRow = await step.do<{ briefJson: string; account: "IT" | "EN" }>("load-brief", async () => {
      const site = await loadSiteByDomain(db, domain);
      if (!site) throw new Error(`brief not found for domain ${domain}`);
      const account = (site.account === "EN" ? "EN" : "IT") as "IT" | "EN";
      return { briefJson: site.briefJson, account };
    });
    const account = briefRow.account;
    const brief: Brief = parseBrief(briefRow.briefJson);

    // Stage 1 — Intel
    const intel = await step.do<IntelOutput>("intel", async () => {
      await setJobStage(db, jobId, "intel");
      try {
        const out = await runIntel({ brief, env, briefId });
        if (userId && out.sourceCounts.dataforseo > 0) {
          await addDataForSeoCall(db, { userId, calls: 1 });
        }
        await recordStageOutput(db, { jobId, stage: "intel", status: "ok", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "intel", status: "error", error: msg });
        throw err;
      }
    });

    // Stage 2 — Strategy
    const strategy = await step.do<StrategyOutput>("strategy", async () => {
      await setJobStage(db, jobId, "strategy");
      try {
        const out = await runStrategy({ brief, intel: { backlinks: intel.backlinks }, env });
        // Strategy is one Anthropic call — usage isn't surfaced from runStrategy yet,
        // so record an estimate based on prompt size. Content stage tracks per-page usage.
        await recordStageOutput(db, { jobId, stage: "strategy", status: "ok", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "strategy", status: "error", error: msg });
        throw err;
      }
    });

    // Stage 3 — Content
    const content = await step.do<ContentOutput>("content", async () => {
      await setJobStage(db, jobId, "content");
      try {
        const out = await runContent({ brief, pages: strategy.pages, env, briefId, r2: env.ASSETS_R2 });
        const totalUsage = sumUsage(out);
        if (userId) await addAnthropicSpend(db, { userId, usage: totalUsage });
        await recordStageOutput(db, { jobId, stage: "content", status: "ok", outputJson: { pageCount: out.pages.length, totalUsage } });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "content", status: "error", error: msg });
        throw err;
      }
    });

    // Stage 4 — Images
    const images = await step.do<ImagesOutput>("images", async () => {
      await setJobStage(db, jobId, "images");
      try {
        const out = await runImages({ brief, pages: strategy.pages, env });
        await recordStageOutput(db, { jobId, stage: "images", status: "ok", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "images", status: "error", error: msg });
        throw err;
      }
    });

    if (dryRun) {
      // Stages 1-4 + 7 only — skip Stage 5/6 (no GH push, no CF deploy).
      const verifyOnly: VerifyOutput = await step.do("verify-dry", async () => {
        await setJobStage(db, jobId, "verify");
        return runVerify({ domain });
      });
      await step.do("finalize-dry", async () => {
        await recordStageOutput(db, { jobId, stage: "verify", status: verifyOnly.ok ? "ok" : "error", outputJson: verifyOnly });
        await setJobFinished(db, jobId, verifyOnly.ok ? "done" : "error");
        await setSiteStatus(db, domain, verifyOnly.ok ? "live" : "error");
      });
      return { dryRun: true, intel, strategy, content: { pageCount: content.pages.length }, images, verify: verifyOnly };
    }

    // Stage 5 — Repo scaffold + push, using GitHub's /generate (template repo)
    // endpoint so a single API call creates a fully-templated repo. Then a
    // single commit-overlay step adds the generated content.
    const contentBySlug = new Map(content.pages.map((p) => [p.slug, p.markdown]));

    const repoCreated = await step.do<RepoCreateOutput>("repo-create", async () => {
      await setJobStage(db, jobId, "repo");
      try {
        return await runRepoCreate({ brief, env });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "repo", status: "error", error: `create: ${msg}` });
        throw err;
      }
    });

    const repo = await step.do<RepoCommitOutput>("repo-commit", async () => {
      try {
        const out = await runRepoCommitOverlay({
          brief,
          account,
          pages: strategy.pages,
          contentBySlug,
          images,
          backlinks: intel.backlinks,
          repo: repoCreated,
          env,
        });
        await recordStageOutput(db, { jobId, stage: "repo", status: "ok", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "repo", status: "error", error: `commit: ${msg}` });
        throw err;
      }
    });
    await step.do("update-site-repo", async () => {
      await setSiteStatus(db, domain, "building", { githubRepo: repo.repoFullName });
    });

    // Stage 6 — CF Pages deploy (split into 4 sub-steps so each fits the
    // 50-subrequest limit comfortably; previous monolithic step kept tripping
    // it even though our own calls were few — likely workflow runtime
    // overhead counts.)
    const pagesZone = await step.do<PagesZoneOutput>("pages-zone", async () => {
      await setJobStage(db, jobId, "pages");
      try {
        return await runPagesZoneCheck({ domain, account, env });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "pages", status: "error", error: `zone: ${msg}` });
        throw err;
      }
    });

    const pagesProject = await step.do<PagesProjectOutput>("pages-project", async () => {
      try {
        return await runPagesProjectCreate({ brief, account, repoFullName: repo.repoFullName, env });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "pages", status: "error", error: `project: ${msg}` });
        throw err;
      }
    });

    await step.do("pages-domain", async () => {
      try {
        await runPagesCustomDomain({ domain, projectName: pagesProject.projectName, account, env });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "pages", status: "error", error: `domain: ${msg}` });
        throw err;
      }
    });

    const pages: PagesOutput = await step.do<PagesOutput>("pages-dns", async () => {
      try {
        await runPagesDns({
          domain,
          zoneId: pagesZone.zoneId,
          projectSubdomain: pagesProject.projectSubdomain,
          account,
          env,
        });
        const out: PagesOutput = {
          projectName: pagesProject.projectName,
          projectSubdomain: pagesProject.projectSubdomain,
          customDomain: domain,
          zoneId: pagesZone.zoneId,
          account,
        };
        await recordStageOutput(db, { jobId, stage: "pages", status: "ok", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "pages", status: "error", error: `dns: ${msg}` });
        throw err;
      }
    });
    await step.do("update-site-pages", async () => {
      await setSiteStatus(db, domain, "building", { cloudflarePagesProject: pages.projectName });
    });

    // Stage 7 — Verify (after CF Pages first deploy completes — give it a buffer)
    await step.sleep("wait-for-first-deploy", "60 seconds");
    const verify = await step.do<VerifyOutput>("verify", async () => {
      await setJobStage(db, jobId, "verify");
      try {
        const out = await runVerify({ domain });
        await recordStageOutput(db, { jobId, stage: "verify", status: out.ok ? "ok" : "error", outputJson: out });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await recordStageOutput(db, { jobId, stage: "verify", status: "error", error: msg });
        throw err;
      }
    });

    await step.do("finalize", async () => {
      const status: "live" | "error" = verify.ok ? "live" : "error";
      await setSiteStatus(db, domain, status);
      await setJobFinished(db, jobId, verify.ok ? "done" : "error");
    });

    return {
      intel: { merged: intel.sourceCounts.merged },
      strategy: { pages: strategy.pages.length },
      content: { pages: content.pages.length },
      images: { warnings: images.warnings.length },
      repo: { fullName: repo.repoFullName },
      pages: { customDomain: pages.customDomain, project: pages.projectName },
      verify,
    };
  }
}

function sumUsage(out: ContentOutput) {
  const sum = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0 };
  for (const p of out.pages) {
    sum.inputTokens += p.usage.inputTokens;
    sum.outputTokens += p.usage.outputTokens;
    sum.cacheReadInputTokens += p.usage.cacheReadInputTokens;
  }
  return sum;
}
