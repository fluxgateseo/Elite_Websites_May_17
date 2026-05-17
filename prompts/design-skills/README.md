# Design skills

Four curated design philosophies selectable from the wizard Step 7
template gallery. Each maps to:

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

The fifth referenced skill, `pbakaus/impeccable`, is a meta polish layer
with 23 commands. **Not** wired as a separate preset — it's intended as
an audit/critique overlay run via the `/custom-prompt` endpoint (give it
the prompt "polish typography + spacing per impeccable rules"). Future
work: surface as a dedicated dashboard action.

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
