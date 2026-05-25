import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAuthorizationUrl } from "@/lib/oauth-google";

export async function GET() {
  const { url, state, codeVerifier } = await createAuthorizationUrl();
  const c = await cookies();
  c.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  c.set("g_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(url.toString());
}
