import { describe, it, expect } from "vitest";
import { inferAccountFromDomain, cfAccountForDomain } from "../src/lib/cf-account";

describe("inferAccountFromDomain", () => {
  it.each([
    ["paginemarxiste.it", "IT"],
    ["foo.eu", "IT"],
    ["bar.com", "EN"],
    ["baz.com.au", "EN"],
    ["fluxgate.co.uk", "EN"],
    ["site.us", "EN"],
    ["site.uk", "EN"],
    ["bellaciao.ai", "AMBIGUOUS"],
    ["thing.io", "AMBIGUOUS"],
    ["site.de", "AMBIGUOUS"],
  ])("%s → %s", (d, expected) => {
    expect(inferAccountFromDomain(d)).toBe(expected);
  });
});

describe("cfAccountForDomain", () => {
  const env = {
    CLOUDFLARE_API_TOKEN_IT: "tit",
    CLOUDFLARE_ACCOUNT_ID_IT: "aid_it",
    CLOUDFLARE_API_TOKEN_EN: "ten",
    CLOUDFLARE_ACCOUNT_ID_EN: "aid_en",
  };

  it("routes IT TLDs", () => {
    expect(cfAccountForDomain(env, "paginemarxiste.it").label).toBe("IT");
  });
  it("routes EN TLDs (multi-part)", () => {
    expect(cfAccountForDomain(env, "fluxgate.com.au").label).toBe("EN");
  });
  it("throws on ambiguous", () => {
    expect(() => cfAccountForDomain(env, "site.ai")).toThrow(/ambiguous/);
  });
  it("respects override", () => {
    expect(cfAccountForDomain(env, "site.ai", "EN").label).toBe("EN");
  });
  it("throws when secrets missing", () => {
    expect(() => cfAccountForDomain({}, "x.it")).toThrow(/missing IT/);
  });
});
