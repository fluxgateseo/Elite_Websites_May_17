# soft-premium

**Source:** `Leonxlnx/taste-skill` → `skills/soft-skill/SKILL.md`

"$150k agency-level" aesthetic — Awwwards-tier dark surfaces with
cinematic spatial rhythm, obsessive micro-interactions, and fluid
motion. Pulls from Apple / Linear / premium SaaS landing pages.

## Pipeline mapping

| Layer | Value |
|-------|-------|
| `brief.step7.designSkill` | `"soft-premium"` |
| Gallery preset id          | `soft-premium` |
| `restaurant-templates.ts`  | palette `Mono dark`, custom `#050505` bg, `#FFFFFF` fg, `#A78BFA` accent; font pairing `DM Serif + DM Sans`; hero `hero-fullbleed`; category `cat-magazine` |
| CSS layer                  | `[data-skill="soft-premium"]` block in `elite-astro-template/src/styles/skills.css` |

## Visual rules (enforced by skills.css)

- **OLED background + mesh.** Two radial gradients layered over
  `--color-bg`: one ellipse at 50%/-10% from accent (18%), one at 90%/110%
  (12%). Creates the "studio under spotlight" feel.
- **Glass cards.** `backdrop-filter: blur(20px) saturate(140%)` with
  `rgba(255,255,255,0.04)` fill and 1px hairline at 8% alpha.
- **Inset top highlight.** Cards carry `box-shadow: 0 1px 0 0
  rgba(255,255,255,0.04) inset` to suggest light from above.
- **Heading weights.** H1/H2 at 500 weight with `letter-spacing: -0.025em`.
- **Motion timing.** All links/buttons transition with
  `cubic-bezier(0.32, 0.72, 0, 1)` over 220ms.

## Banned (upstream)

- Inter / Roboto / Arial / Open Sans / Helvetica
- Thick-stroked Lucide / FontAwesome / Material Icons
- 1px solid gray borders, harsh dark drop shadows
- Edge-to-edge sticky navbars glued to top
- Symmetrical 3-column Bootstrap grids
- `linear` or `ease-in-out` transitions

## Good for

SaaS premium, brand tech, location esperienziali, cocktail bar di ricerca,
agenzie creative, indie product studios.
