# Design skills

Eleven curated design philosophies selectable from the wizard Step 7
template gallery (4 original + 7 from the `frontend-design` menu). Each
maps to:

- A `restaurant-templates.ts` preset (palette + fonts + hero variant +
  section list + category layout).
- A `designSkill: <id>` value that flows brief.step7 → Stage 5
  renderSiteConfig → `site.config.design.skill`.
- A `data-skill="<id>"` attribute on `<html>` in the rendered site,
  paired with a scoped CSS layer in
  `elite-astro-template/src/styles/skills.css`.

| Skill id        | Aesthetic                                         | Source SKILL.md (GitHub) |
|-----------------|---------------------------------------------------|--------------------------|
| `minimalist`    | Editorial workspace, warm monochrome, ultra-flat. No shadows. | `Leonxlnx/taste-skill` → `skills/minimalist-skill/SKILL.md` |
| `brutalist`     | Swiss grid + tactical terminal. Monospace, uppercase H2s, hairline dividers, red accent. | `Leonxlnx/taste-skill` → `skills/brutalist-skill/SKILL.md` |
| `soft-premium`  | OLED bg with mesh radial gradients, glass cards, backdrop-blur. Tight motion. | `Leonxlnx/taste-skill` → `skills/soft-skill/SKILL.md` |
| `emil-eng`      | Design-engineering restraint. Tight type, refined transitions. | `emilkowalski/skill` → `skills/emil-design-eng/SKILL.md` |
| `maximalist`    | Dense, layered, loud — intentional chaos. | `frontend-design` menu |
| `retro-futuristic` | Dark + neon, CRT/synth-grid, optimistic sci-fi. | `frontend-design` menu |
| `luxury`        | Quiet wealth: serif display, extreme whitespace, one accent. | `frontend-design` menu |
| `organic`       | Earthy, soft forms, tactile texture, warm motion. | `frontend-design` menu |
| `playful`       | Bright candy palette, chunky rounded type, springy motion. | `frontend-design` menu |
| `art-deco`      | 1920s glamour: gold-on-dark, symmetry, geometric ornament. | `frontend-design` menu |
| `industrial`    | Clean utilitarian, engineered grid, mono data, zero ornament. | `frontend-design` menu |

The 7 `frontend-design`-menu variants ship their **design contract**
(visual rules / banned / good-for); their `restaurant-templates.ts`
preset and `skills.css` block are **TODO** until `elite-saas` / the
template are touched.

## Non-preset quality layers

Two referenced skills are **not** selectable presets — they govern/audit
every variant instead:

- **`frontend-design`** (`anthropics/claude-code`) — the governing
  quality gate: bold, intentional aesthetic direction, no AI slop. Every
  variant and every `/custom-prompt` edit must satisfy it. It also
  enumerates the sanctioned aesthetic directions that are the candidate
  pool for **new** variants (maximalist, retro-futuristic, luxury,
  art-deco, organic, industrial, …). See `frontend-design.md`.
- **`pbakaus/impeccable`** — a meta polish/critique layer: 23 commands,
  7 reference docs, 27 anti-patterns, built on `frontend-design`. Run as
  a post-generation overlay via `/custom-prompt`. See `impeccable.md`.

New variants are added by picking an open direction from
`frontend-design.md`'s menu, then authoring `<id>.md` with the same
contract as the four below (its `restaurant-templates.ts` preset + the
`skills.css` block are filled when `elite-saas` / the template are
touched — flag those as TODO until then).

## Design diversity / anti-footprint

The goal is that generated sites are not pattern-detectable as one
network. **Combinatorial count is not the metric — correlated
invariants are.** Theming variety alone (palette/font/skill) does not
defeat footprint analysis if structure and infra stay constant.

Verified design knobs (from `elite-saas` `wizard-types.ts`, Step 7):

| Axis | Distinct values |
|------|-----------------|
| `designStyle` | 4 |
| `palette` | 5 fixed + Custom (unbounded) |
| `fontPairing` | 3 |
| `designSkill` (`data-skill`) | 4 today → **11** with the frontend-design menu |
| `hero` variant | 6 |
| `categoryLayout` | 6 |
| `sections` (ordered subset of 12) | hundreds of sensible arrangements |
| voice tone × traits, industry, copy | per-site, Claude-generated (effectively unbounded) |

Floor estimate (fixed presets, ~100 section arrangements):
`4·5·3·4·6·6·100 ≈ 8.6×10⁵` visual+structural configs today;
≈ `2.4×10⁶` with `designSkill` at 11. Copy is non-deterministic on top.

**The honest caveat:** every site still shares one Astro template →
identical component DOM, identical `skills.css` mechanism + `data-skill`
attribute, identical build artifacts, sitemap/robots/llms.txt shape,
the same `fluxgateseo/site-<slug>` + CF Pages + DNS pattern. Those are
the real fingerprint and **none of them are touched by design
variants**. De-correlating them (markup/class variance, build-artifact
variance, hosting/owner/registration spread) is pipeline + template +
infra work that lives in `elite-saas` / `elite-astro-template` / CF —
**out of scope for this meta-repo**, flag separately.

Anti-footprint levers, strongest first:
1. **Structural variance** — vary the section *set + order*, `hero`,
   and `categoryLayout` per site (changes DOM order; in-template).
2. **Visual axis** — expand `designSkill` 4 → 11 (frontend-design menu).
3. **Copy divergence** — enforce per-site tone/voice; ban shared
   boilerplate (frontend-design mandate + `impeccable` `quieter`/
   `bolder`/`distill`).
4. **Infra/markup de-correlation** — *out of scope here*; the levers
   that actually defeat footprint tools.

## How to update

When a source skill's SKILL.md changes upstream:

1. Pull the latest from `~/Code/skills/<skill>/` (or re-clone from
   GitHub).
2. Read the SKILL.md and identify what changed.
3. Update the corresponding bundle file here (`<id>.md`) — keep it
   concise; this is a pointer not a copy.
4. Update CSS rules in
   `elite-astro-template/src/styles/skills.css` if the visual rules
   shifted.
5. Update `restaurant-templates.ts` preset (palette/fonts/hero/sections)
   in `elite-saas` if the recommended starting tokens changed.
6. Commit + push template; redeploy nothing else (CSS hot-flows on the
   next site build).

## What this is NOT

- Not a copy of the upstream SKILL.md text — those evolve, ours stays
  pinned. Read upstream for the latest detail; treat the bundle file
  here as the contract for what our pipeline implements.
- Not Claude system prompt overlays. The skill influences `data-skill`
  CSS only. If you want the skill philosophy to drive *content*
  generation too, use `/custom-prompt` with an explicit instruction
  referencing the skill rules.
