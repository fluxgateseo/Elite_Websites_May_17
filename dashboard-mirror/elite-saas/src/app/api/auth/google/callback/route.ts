import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { exchangeCodeForProfile } from "@/lib/oauth-google";
import { getDb } from "@/lib/db";
import { eliteUsers } from "@/lib/schema";
import { createSession } from "@/lib/session";
import { setSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateFromGoogle = url.searchParams.get("state");
  const c = await cookies();
  const stateCookie = c.get("g_state")?.value;
  const codeVerifier = c.get("g_code_verifier")?.value;

  if (
    !code ||
    !stateFromGoogle ||
    !stateCookie ||
    stateCookie !== stateFromGoogle ||
    !codeVerifier
  ) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_state_mismatch", url.origin),
    );
  }

  c.delete("g_state");
  c.delete("g_code_verifier");

  let profile;
  try {
    profile = await exchangeCodeForProfile(code, codeVerifier);
  } catch (e) {
    console.error("OAuth exchange failed:", e);
    return NextResponse.redirect(
      new URL("/login?error=oauth_exchange_failed", url.origin),
    );
  }

  if (!profile.email_verified) {
    return NextResponse.redirect(
      new URL("/login?error=email_not_verified", url.origin),
    );
  }

  const db = getDb();
  const email = profile.email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(eliteUsers)
    .where(eq(eliteUsers.email, email))
    .limit(1);

  let userId: string;

  if (existing.length > 0) {
    const u = existing[0];
    userId = u.id;
    await db
      .update(eliteUsers)
      .set({
        googleSub: u.googleSub ?? profile.sub,
        displayName: u.displayName ?? profile.name,
        avatarUrl: u.avatarUrl ?? profile.picture,
        emailVerified: 1,
      })
      .where(eq(eliteUsers.id, userId));
  } else {
    userId = ulid();
    const now = Date.now();
    await db.insert(eliteUsers).values({
      id: userId,
      email,
      emailVerified: 1,
      googleSub: profile.sub,
      displayName: profile.name,
      avatarUrl: profile.picture,
      role: "free",
      createdAt: now,
    });
  }

  const ipAddress = req.headers.get("cf-connecting-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const sessionId = await createSession(db, { userId, ipAddress, userAgent });
  await setSessionCookie(sessionId);

  return NextResponse.redirect(new URL("/sites", url.origin));
}
