import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("session cookie helpers", () => {
  it("throws when JWT_SIGNING_SECRET is unset", async () => {
    vi.stubEnv("JWT_SIGNING_SECRET", "");
    const { signSessionCookie } = await import("../src/lib/auth");
    await expect(signSessionCookie("sid-1")).rejects.toThrow(/JWT_SIGNING_SECRET/);
  });

  it("signs and verifies a session cookie roundtrip", async () => {
    vi.stubEnv("JWT_SIGNING_SECRET", "a".repeat(64));
    const { signSessionCookie, readSessionCookie } = await import("../src/lib/auth");
    const token = await signSessionCookie("sid-abc");
    const sid = await readSessionCookie(token);
    expect(sid).toBe("sid-abc");
  });

  it("readSessionCookie returns null for malformed token", async () => {
    vi.stubEnv("JWT_SIGNING_SECRET", "a".repeat(64));
    const { readSessionCookie } = await import("../src/lib/auth");
    expect(await readSessionCookie("not.a.jwt")).toBeNull();
  });

  it("readSessionCookie returns null for token signed with different secret", async () => {
    vi.stubEnv("JWT_SIGNING_SECRET", "a".repeat(64));
    const { signSessionCookie } = await import("../src/lib/auth");
    const token = await signSessionCookie("sid-x");

    vi.unstubAllEnvs();
    vi.stubEnv("JWT_SIGNING_SECRET", "b".repeat(64));
    vi.resetModules();
    const { readSessionCookie } = await import("../src/lib/auth");
    expect(await readSessionCookie(token)).toBeNull();
  });

  it("readSessionCookie returns null when payload has no sid claim", async () => {
    vi.stubEnv("JWT_SIGNING_SECRET", "a".repeat(64));
    // Manually craft a JWT without sid claim using jose
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("a".repeat(64));
    const token = await new SignJWT({ other: "value" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);
    const { readSessionCookie } = await import("../src/lib/auth");
    expect(await readSessionCookie(token)).toBeNull();
  });
});
