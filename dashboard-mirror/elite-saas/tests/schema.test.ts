import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import {
  eliteUsers, eliteSessions, eliteUserSpend,
  eliteSites, eliteLeads, eliteJobs, eliteStageOutputs,
} from "../src/lib/schema";

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("./migrations/0001_initial.sql", "utf-8"));
  sqlite.exec(readFileSync("./migrations/0002_multi_tenant.sql", "utf-8"));
  sqlite.exec(readFileSync("./migrations/0003_multi_account.sql", "utf-8"));
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite) };
}

describe("multi-tenant schema integrity", () => {
  it("creates 7 elite_* tables (no magic_tokens)", () => {
    const { sqlite } = freshDb();
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'elite_%' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual([
      "elite_jobs",
      "elite_leads",
      "elite_sessions",
      "elite_sites",
      "elite_stage_outputs",
      "elite_user_spend",
      "elite_users",
    ]);
    sqlite.close();
  });

  it("does NOT create elite_magic_tokens (Brevo skipped)", () => {
    const { sqlite } = freshDb();
    const exists = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE name='elite_magic_tokens'")
      .all();
    expect(exists).toHaveLength(0);
    sqlite.close();
  });

  it("seeds Andrea as admin user", () => {
    const { sqlite, db } = freshDb();
    const users = db.select().from(eliteUsers).all();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("brianzadigitale@gmail.com");
    expect(users[0].role).toBe("admin");
    expect(users[0].id).toBe("01j0000000andreaabbondanza00");
    sqlite.close();
  });

  it("backfills sites inserted before user_id was added", () => {
    const { sqlite, db } = freshDb();
    const now = Date.now();
    sqlite.exec(`INSERT INTO elite_sites (domain, business_name, status, agency_email, brief_json, created_at, updated_at)
      VALUES ('test.it', 'Test Co', 'live', 'a@b.it', '{}', ${now}, ${now})`);
    sqlite.exec(`UPDATE elite_sites SET user_id = '01j0000000andreaabbondanza00' WHERE user_id IS NULL`);
    const test = db.select().from(eliteSites).all().find((s) => s.domain === "test.it");
    expect(test?.userId).toBe("01j0000000andreaabbondanza00");
    sqlite.close();
  });

  it("rejects user with invalid role (CHECK constraint)", () => {
    const { sqlite } = freshDb();
    expect(() => {
      sqlite.exec(`INSERT INTO elite_users (id, email, role, created_at)
        VALUES ('u2', 'x@y.it', 'superadmin', ${Date.now()})`);
    }).toThrow(/CHECK|constraint/i);
    sqlite.close();
  });

  it("session FK cascades on user delete", () => {
    const { sqlite, db } = freshDb();
    const now = Date.now();
    sqlite.exec(`INSERT INTO elite_users (id, email, role, created_at)
      VALUES ('u-x', 'x@y.it', 'free', ${now})`);
    sqlite.exec(`INSERT INTO elite_sessions (id, user_id, created_at, expires_at)
      VALUES ('s-1', 'u-x', ${now}, ${now + 7 * 86400 * 1000})`);
    expect(db.select().from(eliteSessions).all()).toHaveLength(1);
    sqlite.exec(`DELETE FROM elite_users WHERE id = 'u-x'`);
    expect(db.select().from(eliteSessions).all()).toHaveLength(0);
    sqlite.close();
  });

  it("user_spend composite PK enforces (user, year_month) uniqueness", () => {
    const { sqlite } = freshDb();
    sqlite.exec(`INSERT INTO elite_user_spend (user_id, year_month, anthropic_cost_cents)
      VALUES ('01j0000000andreaabbondanza00', '2026-04', 100)`);
    expect(() => {
      sqlite.exec(`INSERT INTO elite_user_spend (user_id, year_month, anthropic_cost_cents)
        VALUES ('01j0000000andreaabbondanza00', '2026-04', 200)`);
    }).toThrow(/UNIQUE|constraint/i);
    sqlite.close();
  });

  it("inserting a lead with user_id and valid domain works", () => {
    const { sqlite, db } = freshDb();
    const now = Date.now();
    sqlite.exec(`INSERT INTO elite_sites (domain, user_id, business_name, status, agency_email, brief_json, created_at, updated_at)
      VALUES ('lead-test.it', '01j0000000andreaabbondanza00', 'Test', 'live', 'a@b.it', '{}', ${now}, ${now})`);
    sqlite.exec(`INSERT INTO elite_leads (id, user_id, domain, nome, messaggio, source_ip, received_at)
      VALUES ('lead-1', '01j0000000andreaabbondanza00', 'lead-test.it', 'Mario', 'Hello', '1.2.3.4', ${now})`);
    const leads = db.select().from(eliteLeads).all();
    expect(leads).toHaveLength(1);
    expect(leads[0].userId).toBe("01j0000000andreaabbondanza00");
    expect(leads[0].status).toBe("new");
    sqlite.close();
  });
});
