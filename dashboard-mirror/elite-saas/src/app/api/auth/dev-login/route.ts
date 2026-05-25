import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eliteUsers } from "@/lib/schema";
import { createSession } from "@/lib/session";
import { setSessionCookie } from "@/lib/auth";

const SEED_ADMIN_USER_ID = "01j0000000andreaabbondanza00";

/**
 * Dev-only mock login endpoint. Creates a session as the seed admin user.
 * GATED by AUTH_DEV_MODE === "true" env var. In production (without the var
 * set), returns 404 so the endpoint is invisible.
 *
 * Wired to the "Dev login (mock)" button on the login page when AUTH_DEV_MODE
 * is enabled. Used during dashboard development before real Google OAuth
 * credentials are configured.
 */
export async function POST(req: NextRequest) {
  if (process.env.AUTH_DEV_MODE !== "true") {
    return new Response("Not Found", { status: 404 });
  }

  const db = getDb();
  const users = await db
    .select()
    .from(eliteUsers)
    .where(eq(eliteUsers.id, SEED_ADMIN_USER_ID))
    .limit(1);

  if (users.length === 0) {
    return NextResponse.json(
      { error: "Seed admin user not found in DB. Apply migration 0002 first." },
      { status: 500 },
    );
  }

  const ipAddress = req.headers.get("cf-connecting-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const sessionId = await createSession(db, {
    userId: SEED_ADMIN_USER_ID,
    ipAddress,
    userAgent,
  });
  await setSessionCookie(sessionId);

  return NextResponse.redirect(
    new URL("/sites", req.url),
    303, // See Other — POST → GET redirect
  );
}
