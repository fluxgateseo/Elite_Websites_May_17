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

## Visual rules — currently enforced by skills.css

What the `[data-skill="emil-eng"]` block actually does today:

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

## Upstream contract (the real SKILL.md is far richer)

The current CSS is a thin simplification. The upstream
`emil-design-eng` is a full **animation-engineering framework**. The
parts that should drive any emil-eng motion work (and `/custom-prompt`
edits) but are **not yet in skills.css**:

- **Custom easings (prescribed):**
  `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`,
  `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`,
  `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
  **Never `ease-in` on UI.** Enter/exit → `ease-out`; move/morph →
  `ease-in-out`; hover/color → `ease`; constant → `linear`.
- **Durations:** button press 100-160ms, tooltips 125-200ms, dropdowns
  150-250ms, modals/drawers 200-500ms. UI < 300ms.
- **Press feedback:** `:active { transform: scale(0.97) }` on all
  pressables (0.95-0.98).
- **Never animate from `scale(0)`** — start `scale(0.95)` + `opacity:0`.
- **Stagger:** 30-80ms between items, decorative, never blocks input.
- **Animate only `transform`/`opacity`** (GPU; skip layout/paint).
- **`prefers-reduced-motion`:** keep opacity/color, drop movement.
- **Hover gated** behind `@media (hover:hover) and (pointer:fine)`.
- Animation-frequency rule: things done 100+×/day get **no** animation.

> ⚠ **Drift flagged:** skills.css uses `cubic-bezier(0.4, 0, 0.2, 1)`
> (Material standard) — this is **not** one of the skill's prescribed
> curves. When the template is next touched, align emil-eng motion to
> `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and adopt the press /
> stagger / reduced-motion rules above. Until then this file is the
> source of truth for *intended* emil-eng behaviour; the CSS is the
> *current* approximation.

## Philosophy

> "Everything looks simple but every detail is millimetrically placed."

When applying via `/custom-prompt`, instruct Claude to **reduce** rather
than add. Strip emoji, gimmicks, extra animations. Keep one strong type
choice + one strong color. The discipline is what looks expensive.

## Good for

Product studios, indie SaaS, designer freelance, newsletter/community
premium, brand portfolio sites.
