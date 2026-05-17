# emil-eng

**Source:** `emilkowalski/skill` → `skills/emil-design-eng/SKILL.md`

Design-engineering aesthetic from Emil Kowalski (Sonner, Vaul). The
through-line: **restraint**. One strong typographic choice, tight
spacing, refined motion. The product is the show, not the effects.

## Pipeline mapping

| Layer | Value |
|-------|-------|
| `brief.step7.designSkill` | `"emil-eng"` |
| Gallery preset id          | `emil-design-eng` |
| `restaurant-templates.ts`  | palette `Neutri freddi`, custom `#FAFAFA` bg, `#0A0A0A` fg, `#1E1E1E` accent; font pairing `Playfair + Inter`; hero `hero-split`; category `cat-list-thumb` |
| CSS layer                  | `[data-skill="emil-eng"]` block in `elite-astro-template/src/styles/skills.css` |

## Visual rules (enforced by skills.css)

- **Tight motion.** `transition: 180ms cubic-bezier(0.4, 0, 0.2, 1)` on
  links/buttons across color, background, opacity, transform.
- **Hover dim.** `opacity: 0.7` on hover for links/buttons (no color
  shifts — restraint).
- **Heading weights.** H1 at 500 / `letter-spacing: -0.035em`. H2 at
  500 / `-0.02em`.
- **Open type features.** Body sets `cv11`, `ss01`, `ss03`.
- **Section breathing.** 5rem top + bottom padding (less than minimalist's
  6rem — emil packs tighter).
- **Card hairlines.** 1px solid `--color-divider`, no shadow.

## Philosophy

> "Everything looks simple but every detail is millimetrically placed."

When applying via `/custom-prompt`, instruct Claude to **reduce** rather
than add. Strip emoji, gimmicks, extra animations. Keep one strong type
choice + one strong color. The discipline is what looks expensive.

## Good for

Product studios, indie SaaS, designer freelance, newsletter/community
premium, brand portfolio sites.
