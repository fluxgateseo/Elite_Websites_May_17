import { describe, it, expect } from "vitest";
import { pathAllowed } from "../src/custom-prompt";

describe("custom-prompt pathAllowed", () => {
  it("content scope: articoli + pages markdown only", () => {
    expect(pathAllowed("src/content/articoli/foo.md", "content")).toBe(true);
    expect(pathAllowed("src/content/pages/home.md", "content")).toBe(true);
    expect(pathAllowed("src/site.config.ts", "content")).toBe(false);
    expect(pathAllowed("extra-redirects.txt", "content")).toBe(false);
    expect(pathAllowed("src/content/articoli/sub/x.md", "content")).toBe(false);
    expect(pathAllowed("src/content/articoli/x.txt", "content")).toBe(false);
    expect(pathAllowed("../etc/passwd", "content")).toBe(false);
  });
  it("config scope: only site.config.ts", () => {
    expect(pathAllowed("src/site.config.ts", "config")).toBe(true);
    expect(pathAllowed("src/content/articoli/x.md", "config")).toBe(false);
    expect(pathAllowed("extra-redirects.txt", "config")).toBe(false);
  });
  it("all scope: content + config + redirects", () => {
    expect(pathAllowed("src/content/articoli/x.md", "all")).toBe(true);
    expect(pathAllowed("src/content/pages/about.md", "all")).toBe(true);
    expect(pathAllowed("src/site.config.ts", "all")).toBe(true);
    expect(pathAllowed("extra-redirects.txt", "all")).toBe(true);
    expect(pathAllowed("package.json", "all")).toBe(false);
    expect(pathAllowed("src/layouts/BaseLayout.astro", "all")).toBe(false);
  });
});
