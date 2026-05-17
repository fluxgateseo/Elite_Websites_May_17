# minimalist

**Source:** `Leonxlnx/taste-skill` → `skills/minimalist-skill/SKILL.md`

Editorial workspace aesthetic — document-style interfaces analogous to
top-tier productivity tools. Pulls from Swiss editorial typography +
modernist whitespace discipline. Anti-default by design.

## Pipeline mapping

| Layer | Value |
|-------|-------|
| `brief.step7.designSkill` | `"minimalist"` |
| Gallery preset id          | `minimalist-editorial` |
| `restaurant-templates.ts`  | palette `Neutri caldi`, font pairing `DM Serif + DM Sans`, hero `hero-split`, category `cat-list-thumb` |
| CSS layer                  | `[data-skill="minimalist"]` block in `elite-astro-template/src/styles/skills.css` |

## Visual rules (enforced by skills.css)

- **Strip all shadows.** `box-shadow: none !important` on sections, cards, articles.
- **Sharp corners.** `border-radius: 4px` max; rewrite `rounded-full` to a 4px corner.
- **Generous whitespace.** Section padding lifted to 6rem top + bottom.
- **Letter-spacing.** Headings carry `letter-spacing: -0.02em`.
- **OpenType features.** `font-feature-settings: "ss01", "cv01"` on body.

## What it BANS (upstream rules)

- Inter / Roboto / Open Sans
- Generic thin-line icon libs (Lucide / Feather default sets)
- Tailwind's default shadow scale (`shadow-md`, `shadow-lg`, `shadow-xl`)
- Primary-colored backgrounds on big elements (no bright blue hero bands)
- Gradients, neon, 3D glassmorphism (beyond subtle nav blur)
- Pill buttons on large surfaces
- Emojis in code, markup, or copy
- AI copywriting clichés (Elevate, Seamless, Unleash, Next-Gen, Delve…)

## Good for

Consulenze, studi legali, atelier creativi, brand premium senza fronzoli,
SaaS minimal a 1-2 prodotti.
