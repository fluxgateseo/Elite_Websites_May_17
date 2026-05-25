import { Google, generateCodeVerifier, generateState } from "arctic";

let cachedClient: Google | null = null;

export function getGoogleClient(): Google {
  if (cachedClient) return cachedClient;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const host = process.env.DASHBOARD_HOSTNAME ?? "app.chefconnect.it";
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not set");
  if (!clientSecret) throw new Error("GOOGLE_OAUTH_CLIENT_SECRET not set");
  cachedClient = new Google(
    clientId,
    clientSecret,
    `https://${host}/api/auth/google/callback`,
  );
  return cachedClient;
}

export interface AuthorizationParams {
  url: URL;
  state: string;
  codeVerifier: string;
}

export async function createAuthorizationUrl(): Promise<AuthorizationParams> {
  const google = getGoogleClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);
  return { url, state, codeVerifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified: boolean;
}

export async function exchangeCodeForProfile(code: string, codeVerifier: string): Promise<GoogleProfile> {
  const google = getGoogleClient();
  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const accessToken = tokens.accessToken();

  const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Google userinfo fetch failed: ${r.status}`);
  const profile = await r.json() as Record<string, unknown>;

  return {
    sub: String(profile.sub),
    email: String(profile.email),
    name: typeof profile.name === "string" ? profile.name : undefined,
    picture: typeof profile.picture === "string" ? profile.picture : undefined,
    email_verified: profile.email_verified === true,
  };
}
