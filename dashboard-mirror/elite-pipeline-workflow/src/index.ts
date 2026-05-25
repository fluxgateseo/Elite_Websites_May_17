import { PipelineWorkflow, type Env, type PipelineParams } from "./pipeline";
import { handleCustomPrompt } from "./custom-prompt";
import { handleFixStage } from "./fix-stage";

export { PipelineWorkflow };
export type { Env, PipelineParams };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "elite-pipeline-workflow", ts: Date.now() });
    }

    // Trigger and status endpoints are gated by a shared secret to keep them
    // off the public internet. The dashboard sends this header on cross-worker
    // calls (or, for now, the operator passes it via curl).
    const auth = request.headers.get("x-pipeline-secret");
    const expected = (env as unknown as { PIPELINE_SHARED_SECRET?: string }).PIPELINE_SHARED_SECRET;
    const authorized = expected && auth === expected;

    if (url.pathname === "/trigger" && request.method === "POST") {
      if (!authorized) return new Response("Unauthorized", { status: 401 });
      let params: PipelineParams;
      try {
        params = (await request.json()) as PipelineParams;
      } catch {
        return new Response("Bad JSON", { status: 400 });
      }
      if (!params.domain || !params.briefId || !params.jobId) {
        return new Response("Missing domain/briefId/jobId", { status: 400 });
      }
      const instance = await env.PIPELINE.create({ params });
      return Response.json({ id: instance.id, status: await instance.status() });
    }
    if (url.pathname.startsWith("/status/") && request.method === "GET") {
      if (!authorized) return new Response("Unauthorized", { status: 401 });
      const instanceId = url.pathname.replace(/^\/status\//, "");
      const instance = await env.PIPELINE.get(instanceId);
      return Response.json({ id: instanceId, status: await instance.status() });
    }

    // Resume just Stage 6 (CF Pages) for an already-built domain. Used when
    // earlier stages succeeded but Stage 6 failed for an external reason
    // (e.g., CF Pages GitHub App not yet authorized) — avoids re-paying for
    // the Anthropic content generation in stages 1-3.
    if (url.pathname === "/resume-pages" && request.method === "POST") {
      if (!authorized) return new Response("Unauthorized", { status: 401 });
      let body: { domain?: string; repoFullName?: string; account?: "IT" | "EN" };
      try {
        body = (await request.json()) as { domain?: string; repoFullName?: string; account?: "IT" | "EN" };
      } catch {
        return new Response("Bad JSON", { status: 400 });
      }
      if (!body.domain || !body.repoFullName || !body.account) {
        return new Response("Need {domain, repoFullName, account}", { status: 400 });
      }
      const { runPagesZoneCheck, runPagesProjectCreate, runPagesCustomDomain, runPagesDns } = await import("./stages/pages");
      try {
        const zone = await runPagesZoneCheck({ domain: body.domain, account: body.account, env: env as Parameters<typeof runPagesZoneCheck>[0]["env"] });
        const project = await runPagesProjectCreate({
          brief: { step1: { domain: body.domain, preflightDone: false } },
          account: body.account,
          repoFullName: body.repoFullName,
          env: env as Parameters<typeof runPagesProjectCreate>[0]["env"],
        });
        await runPagesCustomDomain({ domain: body.domain, projectName: project.projectName, account: body.account, env: env as Parameters<typeof runPagesCustomDomain>[0]["env"] });
        await runPagesDns({ domain: body.domain, zoneId: zone.zoneId, projectSubdomain: project.projectSubdomain, account: body.account, env: env as Parameters<typeof runPagesDns>[0]["env"] });
        return Response.json({
          ok: true,
          projectName: project.projectName,
          projectSubdomain: project.projectSubdomain,
          zoneId: zone.zoneId,
          customDomain: body.domain,
        });
      } catch (err) {
        return Response.json({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }, { status: 502 });
      }
    }

    // Dashboard-driven site edits. See custom-prompt.ts + the meta repo
    // docs/custom-prompt.md. Same shared-secret gate as /trigger.
    if (url.pathname === "/custom-prompt" && request.method === "POST") {
      if (!authorized) return new Response("Unauthorized", { status: 401 });
      try {
        return await handleCustomPrompt(request, env);
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : String(err) },
          { status: 502 },
        );
      }
    }

    // Dashboard-driven diagnosis + auto-fix of failed builds. See
    // fix-stage.ts + the meta repo docs/dashboard-fix-stage-chat.md.
    if (url.pathname === "/fix-stage" && request.method === "POST") {
      if (!authorized) return new Response("Unauthorized", { status: 401 });
      try {
        return await handleFixStage(request, env);
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : String(err) },
          { status: 502 },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
