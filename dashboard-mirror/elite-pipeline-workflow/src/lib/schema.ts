import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const eliteUserSpend = sqliteTable("elite_user_spend", {
  userId: text("user_id").notNull(),
  yearMonth: text("year_month").notNull(),
  anthropicInputTokens: integer("anthropic_input_tokens").notNull().default(0),
  anthropicOutputTokens: integer("anthropic_output_tokens").notNull().default(0),
  anthropicCostCents: integer("anthropic_cost_cents").notNull().default(0),
  dataforseoCalls: integer("dataforseo_calls").notNull().default(0),
  dataforseoCostCents: integer("dataforseo_cost_cents").notNull().default(0),
  freepikCalls: integer("freepik_calls").notNull().default(0),
  unsplashCalls: integer("unsplash_calls").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.yearMonth] }),
}));

export const eliteSites = sqliteTable("elite_sites", {
  domain: text("domain").primaryKey(),
  userId: text("user_id"),
  account: text("account").notNull().default("IT"),
  businessName: text("business_name").notNull(),
  status: text("status").notNull(),
  cloudflarePagesProject: text("cloudflare_pages_project"),
  githubRepo: text("github_repo"),
  agencyEmail: text("agency_email").notNull(),
  briefJson: text("brief_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const eliteJobs = sqliteTable("elite_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  domain: text("domain").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  currentStage: text("current_stage"),
  workflowInstanceId: text("workflow_instance_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  finishedAt: integer("finished_at"),
});

export const eliteStageOutputs = sqliteTable("elite_stage_outputs", {
  jobId: text("job_id").notNull(),
  stage: text("stage").notNull(),
  status: text("status").notNull(),
  outputJson: text("output_json"),
  outputR2Key: text("output_r2_key"),
  error: text("error"),
  startedAt: integer("started_at"),
  finishedAt: integer("finished_at"),
}, (t) => ({
  pk: primaryKey({ columns: [t.jobId, t.stage] }),
}));
