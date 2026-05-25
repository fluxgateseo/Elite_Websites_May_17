import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import type { DB } from "./db";
import { eliteSessions, eliteUsers, type User } from "./schema";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(db: DB, input: CreateSessionInput): Promise<string> {
  const id = ulid();
  const now = Date.now();
  await db.insert(eliteSessions).values({
    id,
    userId: input.userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await db
    .update(eliteUsers)
    .set({ lastLoginAt: now, lastActiveAt: now })
    .where(eq(eliteUsers.id, input.userId));
  return id;
}

export type VerifyResult =
  | { ok: true; user: User; sessionId: string }
  | { ok: false };

export async function verifySession(db: DB, sessionId: string): Promise<VerifyResult> {
  const rows = await db
    .select({ session: eliteSessions, user: eliteUsers })
    .from(eliteSessions)
    .innerJoin(eliteUsers, eq(eliteSessions.userId, eliteUsers.id))
    .where(eq(eliteSessions.id, sessionId))
    .limit(1);

  if (rows.length === 0) return { ok: false };
  const { session, user } = rows[0];

  const now = Date.now();
  if (session.expiresAt <= now) return { ok: false };
  if (session.revokedAt !== null) return { ok: false };

  return { ok: true, user, sessionId };
}

export async function revokeSession(db: DB, sessionId: string): Promise<void> {
  await db
    .update(eliteSessions)
    .set({ revokedAt: Date.now() })
    .where(eq(eliteSessions.id, sessionId));
}

export async function touchSessionActivity(db: DB, sessionId: string): Promise<void> {
  const rows = await db
    .select({ userId: eliteSessions.userId })
    .from(eliteSessions)
    .where(eq(eliteSessions.id, sessionId))
    .limit(1);
  if (rows.length === 0) return;
  await db
    .update(eliteUsers)
    .set({ lastActiveAt: Date.now() })
    .where(eq(eliteUsers.id, rows[0].userId));
}
