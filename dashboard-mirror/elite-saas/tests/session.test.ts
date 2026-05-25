import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { eliteUsers, eliteSessions } from "../src/lib/schema";
import { createSession, verifySession, revokeSession } from "../src/lib/session";

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("./migrations/0001_initial.sql", "utf-8"));
  sqlite.exec(readFileSync("./migrations/0002_multi_tenant.sql", "utf-8"));
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle(sqlite) };
}

describe("session manager", () => {
  it("createSession inserts a row with 7-day TTL and returns a ULID", async () => {
    const { sqlite, db } = freshDb();
    const id = await createSession(db as any, {
      userId: "01j0000000andreaabbondanza00",
      ipAddress: "1.2.3.4",
      userAgent: "test/1.0",
    });
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ulid: 26 chars Crockford base32
    const rows = db.select().from(eliteSessions).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe("01j0000000andreaabbondanza00");
    expect(rows[0].ipAddress).toBe("1.2.3.4");
    expect(rows[0].userAgent).toBe("test/1.0");
    const ttl = rows[0].expiresAt - rows[0].createdAt;
    expect(ttl).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
    sqlite.close();
  });

  it("createSession updates user.last_login_at and last_active_at", async () => {
    const { sqlite, db } = freshDb();
    await createSession(db as any, { userId: "01j0000000andreaabbondanza00" });
    const user = db.select().from(eliteUsers).all()[0];
    expect(user.lastLoginAt).toBeGreaterThan(0);
    expect(user.lastActiveAt).toBeGreaterThan(0);
    sqlite.close();
  });

  it("verifySession returns ok=true with user when active", async () => {
    const { sqlite, db } = freshDb();
    const id = await createSession(db as any, { userId: "01j0000000andreaabbondanza00" });
    const result = await verifySession(db as any, id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe("brianzadigitale@gmail.com");
      expect(result.user.role).toBe("admin");
      expect(result.sessionId).toBe(id);
    }
    sqlite.close();
  });

  it("verifySession returns ok=false for unknown id", async () => {
    const { sqlite, db } = freshDb();
    const result = await verifySession(db as any, "01JNONEXISTENT00000000000XX");
    expect(result.ok).toBe(false);
    sqlite.close();
  });

  it("verifySession returns ok=false for expired session", async () => {
    const { sqlite, db } = freshDb();
    const past = Date.now() - 1000;
    sqlite.exec(`INSERT INTO elite_sessions (id, user_id, created_at, expires_at)
      VALUES ('s-old', '01j0000000andreaabbondanza00', ${past - 1000}, ${past})`);
    const result = await verifySession(db as any, "s-old");
    expect(result.ok).toBe(false);
    sqlite.close();
  });

  it("verifySession returns ok=false for revoked session", async () => {
    const { sqlite, db } = freshDb();
    const id = await createSession(db as any, { userId: "01j0000000andreaabbondanza00" });
    await revokeSession(db as any, id);
    const result = await verifySession(db as any, id);
    expect(result.ok).toBe(false);
    sqlite.close();
  });

  it("revokeSession sets revoked_at", async () => {
    const { sqlite, db } = freshDb();
    const id = await createSession(db as any, { userId: "01j0000000andreaabbondanza00" });
    await revokeSession(db as any, id);
    const session = db.select().from(eliteSessions).all()[0];
    expect(session.revokedAt).toBeGreaterThan(0);
    sqlite.close();
  });
});
