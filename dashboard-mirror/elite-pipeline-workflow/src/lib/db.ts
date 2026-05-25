import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import { eliteSites, eliteJobs, eliteStageOutputs } from "./schema";
import { parseBrief, type Brief } from "./brief";

export type Db = DrizzleD1Database;

export function getDb(d1: D1Database): Db {
  return drizzle(d1);
}

export async function loadSiteByDomain(db: Db, domain: string) {
  const rows = await db.select().from(eliteSites).where(eq(eliteSites.domain, domain)).limit(1);
  return rows[0] ?? null;
}

export async function loadBriefByDomain(db: Db, domain: string): Promise<{ brief: Brief; account: "IT" | "EN" } | null> {
  const site = await loadSiteByDomain(db, domain);
  if (!site) return null;
  const brief = parseBrief(site.briefJson);
  const account = (site.account === "EN" ? "EN" : "IT") as "IT" | "EN";
  return { brief, account };
}

export async function setSiteStatus(db: Db, domain: string, status: string, extra?: Partial<typeof eliteSites.$inferInsert>) {
  await db
    .update(eliteSites)
    .set({ status, updatedAt: Date.now(), ...(extra ?? {}) })
    .where(eq(eliteSites.domain, domain));
}

export async function ensureJob(db: Db, args: { id: string; domain: string; userId: string | null; workflowInstanceId: string }) {
  const existing = await db.select().from(eliteJobs).where(eq(eliteJobs.id, args.id)).limit(1);
  if (existing.length > 0) return existing[0];
  const now = Date.now();
  await db.insert(eliteJobs).values({
    id: args.id,
    userId: args.userId ?? null,
    domain: args.domain,
    type: "pipeline",
    status: "running",
    currentStage: "intel",
    workflowInstanceId: args.workflowInstanceId,
    createdAt: now,
    updatedAt: now,
  });
  return { id: args.id };
}

export async function setJobStage(db: Db, jobId: string, stage: string) {
  await db
    .update(eliteJobs)
    .set({ currentStage: stage, updatedAt: Date.now() })
    .where(eq(eliteJobs.id, jobId));
}

export async function setJobFinished(db: Db, jobId: string, status: "done" | "error") {
  const now = Date.now();
  await db
    .update(eliteJobs)
    .set({ status, finishedAt: now, updatedAt: now })
    .where(eq(eliteJobs.id, jobId));
}

export async function recordStageOutput(db: Db, args: {
  jobId: string;
  stage: string;
  status: "ok" | "error";
  outputJson?: unknown;
  outputR2Key?: string;
  error?: string;
}) {
  const now = Date.now();
  const row = {
    jobId: args.jobId,
    stage: args.stage,
    status: args.status,
    outputJson: args.outputJson === undefined ? null : JSON.stringify(args.outputJson),
    outputR2Key: args.outputR2Key ?? null,
    error: args.error ?? null,
    startedAt: now,
    finishedAt: now,
  };
  // Upsert: stage-per-job is unique. INSERT OR REPLACE via ON CONFLICT.
  const existing = await db
    .select()
    .from(eliteStageOutputs)
    .where(and(eq(eliteStageOutputs.jobId, args.jobId), eq(eliteStageOutputs.stage, args.stage)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(eliteStageOutputs)
      .set(row)
      .where(and(eq(eliteStageOutputs.jobId, args.jobId), eq(eliteStageOutputs.stage, args.stage)));
  } else {
    await db.insert(eliteStageOutputs).values(row);
  }
}

export async function loadStageOutput<T>(db: Db, jobId: string, stage: string): Promise<T | null> {
  const rows = await db
    .select()
    .from(eliteStageOutputs)
    .where(and(eq(eliteStageOutputs.jobId, jobId), eq(eliteStageOutputs.stage, stage)))
    .limit(1);
  if (rows.length === 0 || !rows[0].outputJson) return null;
  return JSON.parse(rows[0].outputJson) as T;
}
