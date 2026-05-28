import { describe, it, expect } from "vitest";
import { renderSiteConfig, parseFrontmatter, toArticoloMarkdown, buildGalleryJson } from "../src/stages/repo";
import type { PageBlueprint } from "../src/stages/strategy";
import type { ImagesOutput } from "../src/stages/images";

const blogPage: PageBlueprint = {
  slug: "carbonara-storia",
  title: "La storia della carbonara",
  h1: "La vera storia della carbonara",
  brief: "Origini e ricetta autentica della carbonara romana.",
  internalLinksTo: [],
  targetWords: 600,
  type: "blog-article",
};

const images: ImagesOutput = {
  pages: [
    { slug: "carbonara-storia", hero: { url: "https://img/hero1.jpg", source: "freepik" }, body: [{ url: "https://img/body1.jpg", source: "unsplash" }] },
    { slug: "home", hero: { url: "https://img/hero1.jpg", source: "freepik" }, body: [{ url: "https://img/body2.jpg", source: "unsplash" }] },
  ],
  warnings: [],
};

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

describe("parseFrontmatter", () => {
  it("splits flat frontmatter from body", () => {
    const { data, body } = parseFrontmatter(`---\ntitle: "Hi"\ndescription: A test\nslug: hi\n---\n\nBody text here.`);
    expect(data.title).toBe("Hi");
    expect(data.description).toBe("A test");
    expect(data.slug).toBe("hi");
    expect(body).toBe("Body text here.");
  });

  it("returns whole input as body when no frontmatter", () => {
    expect(parseFrontmatter("just text").body).toBe("just text");
  });
});

describe("toArticoloMarkdown", () => {
  const md = `---\ntitle: "La storia della carbonara"\ndescription: "Origini del piatto romano"\nslug: carbonara-storia\nimage: PLACEHOLDER\n---\n\nLa carbonara nasce a Roma.`;

  it("adds the required articoli schema fields (date/category/excerpt) and keeps body", () => {
    const out = toArticoloMarkdown(md, blogPage, images);
    expect(out).toMatch(/^---\n/);
    expect(out).toMatch(/date: "\d{4}-\d{2}-\d{2}"/);
    expect(out).toMatch(/category: "Blog"/);
    // description is renamed to excerpt
    expect(out).toMatch(/excerpt: "Origini del piatto romano"/);
    expect(out).not.toMatch(/description:/);
    expect(out).toContain("La carbonara nasce a Roma.");
  });

  it("injects hero{src,alt} from the matching Stage-4 image", () => {
    const out = toArticoloMarkdown(md, blogPage, images);
    expect(out).toMatch(/hero:\n {2}src: "https:\/\/img\/hero1\.jpg"/);
    expect(out).toMatch(/alt: "La storia della carbonara"/);
  });

  it("falls back to page fields when frontmatter is missing", () => {
    const out = toArticoloMarkdown("no frontmatter body", blogPage, { pages: [], warnings: [] });
    expect(out).toMatch(/title: "La storia della carbonara"/);
    expect(out).toContain("no frontmatter body");
    expect(out).not.toMatch(/hero:/);
  });
});

describe("buildGalleryJson", () => {
  it("aggregates hero+body images, deduped by URL, captioned by page label", () => {
    const json = JSON.parse(buildGalleryJson(images, [blogPage, { ...blogPage, slug: "home", h1: "Home", title: "Home", type: "home" }]));
    const srcs = json.map((g: { src: string }) => g.src);
    // hero1 appears on two pages but is deduped
    expect(srcs).toEqual(["https://img/hero1.jpg", "https://img/body1.jpg", "https://img/body2.jpg"]);
    expect(json[0]).toMatchObject({ src: "https://img/hero1.jpg", caption: "La vera storia della carbonara" });
  });

  it("returns an empty array when there are no images", () => {
    expect(JSON.parse(buildGalleryJson({ pages: [], warnings: [] }, []))).toEqual([]);
  });
});
