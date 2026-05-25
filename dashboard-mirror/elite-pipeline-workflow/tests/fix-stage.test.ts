import { describe, it, expect } from "vitest";
import { classifyVerify, type VerifyProbe } from "../src/fix-stage";

const base: VerifyProbe = {
  apexOk: false,
  pagesOk: false,
  sitemapOk: false,
  galleriaOk: false,
  ghaConclusion: null,
  pagesHasDeployment: false,
};

describe("fix-stage classifyVerify", () => {
  it("apex + pages.dev both down → no healthy deployment; offers deploy fixes", () => {
    const d = classifyVerify({ ...base, ghaConclusion: "failure" });
    expect(d.rootCause).toMatch(/Nessun deployment/i);
    const ids = d.fixes.map((f) => f.id);
    expect(ids).toContain("apply-deploy-fix");
    expect(ids).toContain("redeploy");
    // apply-deploy-fix first (the documented root cause)
    expect(ids[0]).toBe("apply-deploy-fix");
  });

  it("no deployment present (even without GHA failure) still offers apply-deploy-fix", () => {
    const d = classifyVerify({ ...base, ghaConclusion: "success", pagesHasDeployment: false });
    expect(d.fixes.map((f) => f.id)).toContain("apply-deploy-fix");
  });

  it("pages.dev healthy but apex down → bind-domain (DNS/binding)", () => {
    const d = classifyVerify({ ...base, pagesOk: true, pagesHasDeployment: true });
    expect(d.rootCause).toMatch(/custom/i);
    expect(d.fixes.map((f) => f.id)).toEqual(["bind-domain"]);
    expect(d.fixes[0].destructive).toBe(true);
  });

  it("apex serves but sitemap/galleria fail → content/build, redeploy + re-verify", () => {
    const d = classifyVerify({ ...base, apexOk: true, pagesOk: true, pagesHasDeployment: true, sitemapOk: false, galleriaOk: false });
    expect(d.fixes.map((f) => f.id)).toEqual(["redeploy", "mark-verify"]);
  });

  it("everything serves → canonical/transient, offers canonical-redirects + re-verify", () => {
    const d = classifyVerify({
      apexOk: true,
      pagesOk: true,
      sitemapOk: true,
      galleriaOk: true,
      ghaConclusion: "success",
      pagesHasDeployment: true,
    });
    expect(d.fixes.map((f) => f.id)).toEqual(["canonical-redirects", "mark-verify"]);
  });
});
