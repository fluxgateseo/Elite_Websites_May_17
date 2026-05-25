import { describe, it, expect } from "vitest";
import { renderSiteConfig } from "../src/stages/repo";

describe("renderSiteConfig", () => {
  it("renders defineSiteConfig call with mapped SiteConfig shape", () => {
    const out = renderSiteConfig({
      account: "EN",
      repoFullName: "andreabbo/site-demo",
      brief: {
        step1: { domain: "demo.com" },
        step4: { businessName: "Demo Co", industry: "Tech/SaaS", subCategory: "SaaS", city: "Milano", address: "via X 1", phone: "+39 02 0000", email: "hi@demo.com" },
        step7: { designStyle: "Modern", palette: "Bold", customColors: { primary: "#111", accent: "#f00", background: "#fff" }, fontPairing: "Inter + Inter" },
        step8: { toneFormal: 4, voiceTraits: ["Caldo"], brandKeywords: "demo, qualità", avoidWords: "lusso" },
      },
    });
    // Should be a defineSiteConfig call, NOT a hardcoded const export.
    expect(out).toMatch(/import \{ defineSiteConfig \} from ".\/lib\/site-config"/);
    expect(out).toMatch(/export default defineSiteConfig\(/);
    // Industry is mapped to template's lowercase enum.
    expect(out).toMatch(/"industry": "tech"/);
    expect(out).toMatch(/"name": "Demo Co"/);
    expect(out).toMatch(/"primary": "#111"/);
    // Style mapped to lowercase
    expect(out).toMatch(/"style": "modern"/);
    // Account label is in the leading comment but not in the SiteConfig data
    expect(out).toMatch(/Account: EN/);
  });

  it("falls back to safe defaults when optional steps missing", () => {
    const out = renderSiteConfig({
      account: "IT",
      repoFullName: "andreabbo/site-bare",
      brief: { step1: { domain: "bare.it" } },
    });
    expect(out).toMatch(/"name": ""/);
    // Default style is editorial (lowercase)
    expect(out).toMatch(/"style": "editorial"/);
    expect(out).toMatch(/"industry": "altro"/);
  });
});
