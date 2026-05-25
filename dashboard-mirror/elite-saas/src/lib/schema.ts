import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

// Users
export const eliteUsers = sqliteTable("elite_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified").notNull().default(0),
  googleSub: text("google_sub").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "member", "free"] }).notNull().default("free"),
  customQuotaJson: text("custom_quota_json"),
  createdAt: integer("created_at").notNull(),
  lastLoginAt: integer("last_login_at"),
  lastActiveAt: integer("last_active_at"),
}, (t) => ({
  email: index("idx_users_email").on(t.email),
  role: index("idx_users_role").on(t.role),
}));

// Sessions
export const eliteSessions = sqliteTable("elite_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => eliteUsers.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  revokedAt: integer("revoked_at"),
}, (t) => ({
  user: index("idx_sessions_user").on(t.userId),
  expires: index("idx_sessions_expires").on(t.expiresAt),
}));

// User spend
export const eliteUserSpend = sqliteTable("elite_user_spend", {
  userId: text("user_id").notNull().references(() => eliteUsers.id, { onDelete: "cascade" }),
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

// Sites (with user_id added)
export const eliteSites = sqliteTable("elite_sites", {
  domain: text("domain").primaryKey(),
  userId: text("user_id").references(() => eliteUsers.id),
  account: text("account").notNull().default("IT"),
  businessName: text("business_name").notNull(),
  status: text("status").notNull(),
  cloudflarePagesProject: text("cloudflare_pages_project"),
  githubRepo: text("github_repo"),
  agencyEmail: text("agency_email").notNull(),
  briefJson: text("brief_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (t) => ({
  user: index("idx_sites_user").on(t.userId),
}));

// Leads (with user_id added)
export const eliteLeads = sqliteTable("elite_leads", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => eliteUsers.id),
  domain: text("domain").notNull().references(() => eliteSites.domain),
  nome: text("nome").notNull(),
  email: text("email"),
  telefono: text("telefono"),
  messaggio: text("messaggio").notNull(),
  sourceIp: text("source_ip").notNull(),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("new"),
  notifiedAt: integer("notified_at"),
  receivedAt: integer("received_at").notNull(),
}, (t) => ({
  domainStatus: index("idx_leads_domain_status").on(t.domain, t.status),
  received: index("idx_leads_received").on(t.receivedAt),
  user: index("idx_leads_user").on(t.userId),
}));

// Jobs (with user_id added)
export const eliteJobs = sqliteTable("elite_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => eliteUsers.id),
  domain: text("domain").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  currentStage: text("current_stage"),
  workflowInstanceId: text("workflow_instance_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  finishedAt: integer("finished_at"),
}, (t) => ({
  status: index("idx_jobs_status").on(t.status),
  user: index("idx_jobs_user").on(t.userId),
}));

// Stage outputs (unchanged structure)
export const eliteStageOutputs = sqliteTable("elite_stage_outputs", {
  jobId: text("job_id").notNull().references(() => eliteJobs.id),
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

// Type exports for TypeScript consumers
export type User = typeof eliteUsers.$inferSelect;
export type NewUser = typeof eliteUsers.$inferInsert;
export type Session = typeof eliteSessions.$inferSelect;
export type NewSession = typeof eliteSessions.$inferInsert;
export type Role = "admin" | "member" | "free";
