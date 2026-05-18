# frontend-design (governing skill — not a preset)

**Source:** `anthropics/claude-code` →
`plugins/frontend-design/skills/frontend-design/SKILL.md`
(https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)

This is **not** a selectable visual language like `minimalist` /
`brutalist` / `soft-premium` / `emil-eng`. It is the **quality gate**
every variant — and every generated/custom-prompted page — must satisfy.
The four concrete variants are *specific executions*; `frontend-design`
is the rule for *how* any aesthetic direction is chosen and executed.

## The mandate

Pick a **bold, intentional** aesthetic direction and execute it with
precision. Both refined minimalism and maximalist intensity are valid —
the non-negotiable is **intentionality, not intensity**. No design
should be generic; no two generations should converge on the same
defaults.

## Sanctioned aesthetic directions (the menu for new variants)

The skill explicitly enumerates extremes to commit to. These are the
candidate pool when adding a new `prompts/design-skills/<id>.md`:

- brutally minimal · maximalist chaos · retro-futuristic
- organic / natural · luxury / refined · playful / toy-like
- editorial / magazine · brutalist / raw · art deco / geometric
- soft / pastel · industrial / utilitarian

Current coverage: `minimalist` (≈ brutally minimal / editorial),
`brutalist` (≈ brutalist / raw), `soft-premium` (≈ refined dark),
`emil-eng` (≈ refined restraint). The rest are **open** for new
variants.

## Hard rules (apply to all variants + custom-prompt edits)

- **Typography:** distinctive, characterful pairing — a display font +
  a refined body font. **Banned:** Inter, Roboto, Arial, system fonts;
  do **not** converge on Space Grotesk across generations.
- **Color:** one cohesive committed direction via CSS variables;
  dominant colors + sharp accents, not timid evenly-spread palettes.
  **Banned:** purple gradients on white (the canonical AI-slop tell).
- **Motion:** high-impact moments over scattered micro-interactions —
  one orchestrated staggered page-load (`animation-delay`) beats noise.
  CSS-only for plain HTML; Motion lib for React when available.
- **Spatial:** unexpected layouts — asymmetry, overlap, diagonal flow,
  grid-breaking, deliberate negative space *or* controlled density.
- **Backgrounds:** atmosphere and depth, not flat fills — gradient
  meshes, noise/grain, geometric patterns, layered transparency,
  dramatic shadows, custom cursors.
- **Implementation complexity must match the vision:** maximalist ⇒
  elaborate code; minimal/refined ⇒ restraint and millimetric precision.

## How it relates to the pipeline

- It does **not** get a `data-skill` value or a `restaurant-templates.ts`
  preset. It is the acceptance criteria a variant's `skills.css` block
  and preset must meet.
- For `/custom-prompt` edits: instruct Claude to honor these hard rules
  explicitly (the endpoint has no `data-skill` leverage on content).
- Pairs with `pbakaus/impeccable` (the polish/critique overlay) as the
  two non-preset quality layers.
