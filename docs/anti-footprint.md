# Anti-footprint strategy

Goal: generated sites must not be detectable as one network. This doc is
the **work plan** for the structural/infra de-correlation that design
variants alone do **not** solve. The design-variant axis is covered in
`prompts/design-skills/README.md` (§ Design diversity / anti-footprint).

> **Scope:** most levers below live in `andreabbo/elite-saas`,
> `fluxgateseo/elite-astro-template`, and Cloudflare — **not** in this
> meta-repo. This is a specification to execute there, tracked here.

## Why count ≠ safety

~10⁶ visual/structural combinations exist (see design-skills README),
but footprint analysis keys on **correlated invariants** that every site
currently shares, regardless of theme:

1. One Astro template → identical component DOM & class names.
2. Identical `skills.css` mechanism + `data-skill` attribute on `<html>`.
3. Identical build artifacts (OpenNext/Pages output shape,
   `scripts/post-build.mjs` sitemap alias).
4. Identical `sitemap`/`robots.txt`/`llms.txt` generation.
5. Same repo pattern `fluxgateseo/site-<slug>`, same CF Pages project
   naming `site-<slug>`, same DNS shape (CNAME → `*.pages.dev`).
6. Similar internal-linking density, frontmatter, JSON-LD helpers.

## Levers, strongest first

### A. Structural variance (template — highest ROI, in our control)
- Randomise section **set + order** per site from the 12 `SectionId`s;
  vary `hero` (6) and `categoryLayout` (6). Changes rendered DOM order.
- Per-site component-markup variance: alternate wrapper structures /
  class-name schemes (e.g. hashed utility prefix per site) so the DOM
  diff between two sites is non-trivial.
- Vary `scripts/post-build.mjs` output and meta/generator tags so build
  artifacts are not byte-pattern-identical.

### B. Visual axis (template + elite-saas — done at the contract level)
- 11 `data-skill` variants now defined; wire the 7 new presets +
  `skills.css` blocks. Pick per site, not per operator-default.

### C. Copy divergence (pipeline — Stage 2/3)
- Enforce per-site tone/voice (`Step8`); ban shared boilerplate strings;
  vary heading/section phrasing. `frontend-design` mandate + `impeccable`
  `quieter`/`bolder`/`distill` shift intensity per instance.

### D. Infra de-correlation (CF / GitHub — operational)
- Spread across the two CF accounts (IT/EN) per TLD already; consider
  not reusing one predictable `site-<slug>` scheme.
- Vary DNS/record patterns where possible; stagger registration &
  go-live timing; avoid identical analytics/footer/contact blocks.

## Status

| Lever | Owner repo | State |
|-------|-----------|-------|
| 11 design contracts | this meta-repo | ✅ defined |
| `designSkill` wizard selector (11 variants) | elite-saas | ✅ patch delivered (`feat/design-skill-selector`) |
| `designSkill` → Stage 5 `renderSiteConfig` → `data-skill` | elite-pipeline-workflow | ⬜ TODO (private, out of access) |
| Design canned prompts in `/custom-prompt` | elite-saas | ▣ spec'd in `docs/custom-prompt.md` |
| 7 new `skills.css` `[data-skill]` blocks | elite-astro-template | ✅ patch delivered (`feat/skills-css-7-variants`) |
| 7 new `restaurant-templates.ts` presets | elite-saas | ⬜ TODO (file absent from 2026-05-10 snapshot) |
| Section/hero/category randomisation per site | template + Stage 5 | ⬜ TODO |
| Markup/class-name variance | template | ⬜ TODO |
| Build-artifact variance | template | ⬜ TODO |
| Copy-divergence enforcement | pipeline Stage 2/3 | ⬜ TODO |
| Infra/DNS/timing spread | CF / ops | ⬜ TODO |

Items B–D require touching the private `andreabbo/*` repos / the public
template / CF; deliver via the patch flow or once repo access is
arranged (see `memory.md` § Access reality).
