import { NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteSites, eliteJobs } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { triggerPipeline } from "@/lib/pipeline-trigger";
import type { WizardState } from "@/lib/wizard-types";

export const dynamic = "force-dynamic";

// A build can only run if the wizard brief has the same minimum the wizard
// submit enforces: domain (step1) + business name (step4) + scenario (step3).
// Without it the pipeline has nothing to generate, so we send the operator
// back into the wizard instead of starting an empty build.
function briefComplete(briefJson: string | null): boolean {
  if (!briefJson) return false;
  try {
    const s = JSON.parse(briefJson) as Partial<WizardState>;
    return Boolean(
      s?.step1?.domain &&
        s?.step4?.businessName?.trim() &&
        s?.step3?.scenario,
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { domain?: string; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ ok: false, error: "Domain required" }, { status: 400 });
  }

  const workflowUrl = process.env.PIPELINE_WORKFLOW_URL;
  const sharedSecret = process.env.PIPELINE_SHARED_SECRET;
  if (!workflowUrl || !sharedSecret) {
    return NextResponse.json({
      ok: false,
      error: "Pipeline not configured: set PIPELINE_WORKFLOW_URL + PIPELINE_SHARED_SECRET secrets on this worker.",
    }, { status: 500 });
  }

  const db = getDb();
  const sites = await db.select().from(eliteSites).where(eq(eliteSites.domain, domain)).limit(1);
  if (sites.length === 0) {
    return NextResponse.json({ ok: false, error: `Site ${domain} not found` }, { status: 404 });
  }
  const site = sites[0];
  if (site.status === "live") {
    return NextResponse.json({ ok: false, error: `${domain} already live; nothing to build` }, { status: 409 });
  }
  if (site.status === "building") {
    return NextResponse.json({ ok: false, error: `${domain} already building` }, { status: 409 });
  }

  // Guard: no build without a complete brief — guide the operator into the
  // wizard (prefilled with the domain) to collect the site info first.
  if (!briefComplete(site.briefJson)) {
    return NextResponse.json(
      {
        ok: false,
        needsBrief: true,
        wizardUrl: `/nuovo-sito?domain=${encodeURIComponent(domain)}`,
        error: `${domain} non ha un brief completo. Completa il wizard prima di avviare la build.`,
      },
      { status: 422 },
    );
  }

  const jobId = ulid();
  const briefId = ulid();
  const now = Date.now();

  await db.insert(eliteJobs).values({
    id: jobId,
    userId: user.id,
    domain,
    type: "pipeline",
    status: "queued",
    currentStage: null,
    workflowInstanceId: null,
    createdAt: now,
    updatedAt: now,
  });

  let triggered: { id: string };
  try {
    triggered = await triggerPipeline({
      workflowUrl,
      sharedSecret,
      domain,
      briefId,
      jobId,
      userId: user.id,
      dryRun: body.dryRun === true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown trigger error";
    await db.update(eliteJobs).set({ status: "error", updatedAt: Date.now() }).where(eq(eliteJobs.id, jobId));
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }

  await db
    .update(eliteJobs)
    .set({ status: "running", workflowInstanceId: triggered.id, updatedAt: Date.now() })
    .where(eq(eliteJobs.id, jobId));

  return NextResponse.json({ ok: true, jobId, instanceId: triggered.id, dryRun: body.dryRun === true });
}
