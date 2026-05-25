import { describe, it, expect } from "vitest";
import { inferAccountFromDomain, cfAccountForDomain } from "../src/lib/cf-account";

describe("inferAccountFromDomain", () => {
  it.each([
    ["paginemarxiste.it", "IT"],
    ["something.eu", "IT"],
    ["foo.com", "EN"],
    ["fluxgate.com.au", "EN"],
    ["bar.co.uk", "EN"],
    ["baz.us", "EN"],
    ["qux.uk", "EN"],
    ["bellaciao.ai", "AMBIGUOUS"],
    ["something.io", "AMBIGUOUS"],
    ["weird.de", "AMBIGUOUS"],
    ["unknown.xyz", "AMBIGUOUS"],
    ["HTTPS://Mixed-Case.IT/path", "IT"],
  ])("%s → %s", (domain, expected) => {
    expect(inferAccountFromDomain(domain)).toBe(expected);
  });
});

describe("cfAccountForDomain", () => {
  const env = {
    CLOUDFLARE_API_TOKEN_IT: "it-token",
    CLOUDFLARE_ACCOUNT_ID_IT: "it-account",
    CLOUDFLARE_API_TOKEN_EN: "en-token",
    CLOUDFLARE_ACCOUNT_ID_EN: "en-account",
  };

  it("routes .it to IT credentials", () => {
    expect(cfAccountForDomain(env, "paginemarxiste.it")).toEqual({
      token: "it-token",
      accountId: "it-account",
      label: "IT",
    });
  });

  it("routes .com.au to EN credentials", () => {
    expect(cfAccountForDomain(env, "fluxgate.com.au")).toEqual({
      token: "en-token",
      accountId: "en-account",
      label: "EN",
    });
  });

  it("throws on ambiguous TLD without override", () => {
    expect(() => cfAccountForDomain(env, "thing.ai")).toThrow(/ambiguous/);
  });

  it("respects explicit override on ambiguous TLD", () => {
    expect(cfAccountForDomain(env, "thing.ai", "EN")).toEqual({
      token: "en-token",
      accountId: "en-account",
      label: "EN",
    });
  });

  it("throws when secrets are missing", () => {
    expect(() => cfAccountForDomain({}, "foo.it")).toThrow(/missing IT secrets/);
  });
});
