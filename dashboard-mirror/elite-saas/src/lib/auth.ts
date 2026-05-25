import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";
import { verifySession, revokeSession } from "./session";
import type { User } from "./schema";

const COOKIE_NAME = "pm_session";
const COOKIE_TTL_DAYS = 7;

function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SIGNING_SECRET;
  if (!raw) throw new Error("JWT_SIGNING_SECRET not set in worker secrets");
  return new TextEncoder().encode(raw);
}

/** Sign a JWT containing the session id. */
export async function signSessionCookie(sessionId: string): Promise<string> {
  return await new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_TTL_DAYS}d`)
    .sign(getJwtSecret());
}

/** Verify the JWT and extract session id. */
export async function readSessionCookie(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string") return null;
    return payload.sid;
  } catch {
    return null;
  }
}

/** Set the session cookie on the response. Server actions / route handlers only. */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const token = await signSessionCookie(sessionId);
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
  });
}

/** Clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

/** Get the current user from the cookie. Returns null if no session or invalid. */
export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const cookie = c.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  const sessionId = await readSessionCookie(cookie.value);
  if (!sessionId) return null;

  const db = getDb();
  const result = await verifySession(db, sessionId);
  return result.ok ? result.user : null;
}

/** Get user email for display in layouts. Returns null if not authenticated. */
export async function getUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}

/** Throws (redirects) if no current user. Use in server components that require auth. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  // redirect() throws (never returns); TS can't infer that via dynamic import
  return user!;
}

/** Throws (redirects) if user is not admin. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/sites?error=forbidden");
  }
  return user;
}

/** Logout: revoke session in DB + clear cookie. */
export async function logout(): Promise<void> {
  const c = await cookies();
  const cookie = c.get(COOKIE_NAME);
  if (cookie?.value) {
    const sessionId = await readSessionCookie(cookie.value);
    if (sessionId) {
      const db = getDb();
      await revokeSession(db, sessionId);
    }
  }
  await clearSessionCookie();
}
