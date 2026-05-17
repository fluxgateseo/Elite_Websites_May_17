# brutalist

**Source:** `Leonxlnx/taste-skill` → `skills/brutalist-skill/SKILL.md`

Industrial brutalism — fuses 1960s Swiss corporate identity with
mid-century industrial manuals and retro-futuristic aerospace/military
terminal interfaces. Pick **one** archetype per site, never mix them:

- **Swiss Industrial Print** — high-contrast light mode, monolithic
  sans-serifs, visible structural grids, asymmetric whitespace, primary
  red accent.
- **Tactical Telemetry / CRT Terminal** — dark mode only, tabular data,
  monospaced dominance, ASCII framing devices, simulated CRT scanlines
  / phosphor glow.

## Pipeline mapping

| Layer | Value |
|-------|-------|
| `brief.step7.designSkill` | `"brutalist"` |
| Gallery preset id          | `industrial-brutalist` |
| `restaurant-templates.ts`  | palette `Mono dark`, custom `#0A0A0A` bg, `#F2F0E6` fg, `#FF3B30` accent; font pairing `IBM Plex Serif + IBM Plex Sans`; hero `hero-fullbleed`; category `cat-list-thumb` |
| CSS layer                  | `[data-skill="brutalist"]` block in `elite-astro-template/src/styles/skills.css` |

## Visual rules (enforced by skills.css)

- **Body in mono.** Override `--font-body` to IBM Plex Mono fallback to JetBrains.
- **Massive H1.** `font-size: clamp(3rem, 10vw, 8rem); line-height: 0.92`.
- **H2 uppercase.** `text-transform: uppercase; letter-spacing: 0.04em`.
- **No rounded corners anywhere.** `border-radius: 0 !important`.
- **No shadows.** `box-shadow: none !important`.
- **Section dividers.** 1px solid `currentColor` top border per section.
- **Underline links.** 1px underline at 0.2em offset.

## Currently implemented (Print archetype only)

The current CSS layer lands the **Swiss Industrial Print** look. The
CRT-Terminal archetype (scanlines + phosphor glow + ASCII brackets) is
not implemented — flag this when adopting brutalist if the brand wants
that variant; will need additional CSS + maybe a `data-skill="brutalist"
data-archetype="terminal"` modifier.

## Good for

Studi architettura, agenzie creative bold, portfolio dev/design,
editorial tecnico, dashboard di telemetria.
