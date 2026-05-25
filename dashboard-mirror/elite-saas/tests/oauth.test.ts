import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("Google OAuth", () => {
  it("throws when GOOGLE_OAUTH_CLIENT_ID is missing", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    vi.stubEnv("DASHBOARD_HOSTNAME", "app.chefconnect.it");
    const { getGoogleClient } = await import("../src/lib/oauth-google");
    expect(() => getGoogleClient()).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });

  it("throws when GOOGLE_OAUTH_CLIENT_SECRET is missing", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("DASHBOARD_HOSTNAME", "app.chefconnect.it");
    const { getGoogleClient } = await import("../src/lib/oauth-google");
    expect(() => getGoogleClient()).toThrow(/GOOGLE_OAUTH_CLIENT_SECRET/);
  });

  it("createAuthorizationUrl returns Google authorization URL with state + codeVerifier", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "test-client.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    vi.stubEnv("DASHBOARD_HOSTNAME", "app.chefconnect.it");
    const { createAuthorizationUrl } = await import("../src/lib/oauth-google");
    const { url, state, codeVerifier } = await createAuthorizationUrl();
    expect(url.toString()).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.chefconnect.it/api/auth/google/callback");
    const scopes = url.searchParams.get("scope")?.split(" ").sort();
    expect(scopes).toEqual(["email", "openid", "profile"].sort());
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
