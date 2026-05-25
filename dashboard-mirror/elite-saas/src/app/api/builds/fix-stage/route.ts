import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteSites, eliteJobs } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type FixBody = {
  domain?: string;
  // "diagnose" (read-only) | "<fixId>" | "confirm:<fixId>"
  action?: string;
  note?: string;
};

// Proxies the dashboard fix-stage chat to the pipeline worker's /fix-stage.
// Diagnosis is read-only; any "confirm:<fixId>" mutates CF/GitHub, so the
// route is admin-only and the x-pipeline-secret is forwarded server-side
// (never exposed to the browser). See docs/dashboard-fix-stage-chat.md.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  let body: FixBody;
  try {
    body = (await req.json()) as FixBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json({ ok: false, error: "Domain required" }, { status: 400 });
  }

  const action = (body.action ?? "diagnose").trim() || "diagnose";
  if (!/^[a-z0-9:_-]{1,100}$/i.test(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }
  const note = (body.note ?? "").trim().slice(0, 500);

  const db = getDb();
  const sites = await db
    .select()
    .from(eliteSites)
    .where(eq(eliteSites.domain, domain))
    .limit(1);
  if (sites.length === 0) {
    return NextResponse.json({ ok: false, error: `Site ${domain} not found` }, { status: 404 });
  }
  if (sites[0].status !== "error" && sites[0].status !== "building") {
    return NextResponse.json(
      { ok: false, error: `Site ${domain} is ${sites[0].status}; fix-stage applies to error/building builds` },
      { status: 409 },
    );
  }

  // Latest job for the domain (the worker defaults to this, but pin it).
  const jobs = await db
    .select({ id: eliteJobs.id })
    .from(eliteJobs)
    .where(eq(eliteJobs.domain, domain))
    .orderBy(desc(eliteJobs.createdAt))
    .limit(1);
  const jobId = jobs[0]?.id ?? null;

  const workflowUrl = process.env.PIPELINE_WORKFLOW_URL;
  const sharedSecret = process.env.PIPELINE_SHARED_SECRET;
  if (!workflowUrl || !sharedSecret) {
    return NextResponse.json(
      { ok: false, error: "PIPELINE_WORKFLOW_URL or PIPELINE_SHARED_SECRET not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(`${workflowUrl.replace(/\/$/, "")}/fix-stage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pipeline-secret": sharedSecret,
    },
    body: JSON.stringify({ domain, jobId, action, note }),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { ok: false, error: `worker non-JSON ${res.status}: ${text.slice(0, 300)}` },
      { status: 502 },
    );
  }
  return NextResponse.json(parsed, { status: res.status });
}
