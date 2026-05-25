import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteJobs, eliteStageOutputs, eliteSites } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPipelineStatus } from "@/lib/pipeline-trigger";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["intel", "strategy", "content", "images", "repo", "pages", "verify"] as const;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const domain = url.searchParams.get("domain");
  if (!jobId && !domain) {
    return NextResponse.json({ ok: false, error: "Need jobId or domain query param" }, { status: 400 });
  }

  const db = getDb();
  let job;
  if (jobId) {
    const rows = await db.select().from(eliteJobs).where(eq(eliteJobs.id, jobId)).limit(1);
    job = rows[0];
  } else if (domain) {
    const rows = await db
      .select()
      .from(eliteJobs)
      .where(eq(eliteJobs.domain, domain))
      .orderBy(desc(eliteJobs.createdAt))
      .limit(1);
    job = rows[0];
  }
  if (!job) return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });

  const stages = await db
    .select()
    .from(eliteStageOutputs)
    .where(eq(eliteStageOutputs.jobId, job.id));

  const stageMap = new Map(stages.map((s) => [s.stage, s]));
  const stagesOrdered = STAGE_ORDER.map((s) => {
    const row = stageMap.get(s);
    return {
      stage: s,
      status: row?.status ?? null,
      error: row?.error ?? null,
      finishedAt: row?.finishedAt ?? null,
    };
  });

  // Optionally peek at workflow instance (best-effort).
  let workflowStatus: string | null = null;
  if (job.workflowInstanceId && process.env.PIPELINE_WORKFLOW_URL && process.env.PIPELINE_SHARED_SECRET) {
    try {
      const r = await getPipelineStatus({
        workflowUrl: process.env.PIPELINE_WORKFLOW_URL,
        sharedSecret: process.env.PIPELINE_SHARED_SECRET,
        instanceId: job.workflowInstanceId,
      });
      workflowStatus = r.status?.status ?? null;
    } catch {
      // swallow
    }
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      domain: job.domain,
      status: job.status,
      currentStage: job.currentStage,
      workflowInstanceId: job.workflowInstanceId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt,
    },
    stages: stagesOrdered,
    workflowStatus,
  });
}

export async function POST(req: NextRequest) {
  // POST = reset stuck "building" → "draft" (operator escape hatch)
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  let body: { domain?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain) return NextResponse.json({ ok: false, error: "Domain required" }, { status: 400 });

  const db = getDb();
  const sites = await db.select().from(eliteSites).where(eq(eliteSites.domain, domain)).limit(1);
  if (sites.length === 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Mark any running jobs for this domain as cancelled.
  await db
    .update(eliteJobs)
    .set({ status: "cancelled", updatedAt: Date.now(), finishedAt: Date.now() })
    .where(and(eq(eliteJobs.domain, domain), eq(eliteJobs.status, "running")));
  // Same for queued.
  await db
    .update(eliteJobs)
    .set({ status: "cancelled", updatedAt: Date.now(), finishedAt: Date.now() })
    .where(and(eq(eliteJobs.domain, domain), eq(eliteJobs.status, "queued")));

  // Reset site status if it was building.
  if (sites[0].status === "building") {
    await db
      .update(eliteSites)
      .set({ status: "draft", updatedAt: Date.now() })
      .where(eq(eliteSites.domain, domain));
  }

  return NextResponse.json({ ok: true, domain, reset: sites[0].status === "building" });
}
