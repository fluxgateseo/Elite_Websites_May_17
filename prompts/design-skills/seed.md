# Seed — botanical-clinical editorial-scientific

**When to invoke this skill:** whenever `brief.step7.designStyle === "Seed"`.

## Core metaphor

*A living organism under laboratory glass.* Every layout decision, every
typographic choice, every color reads as "specimen documented" — not
"product sold." Scientific-journal restraint, not marketing shout.

## The five non-negotiable rules

1. **Whisper-light display headlines.** Weight 300–350 at 32px and above.
   Never 600+. The tight negative letter-spacing (-0.02em to -0.03em) pulls
   light strokes together so they don't look anemic. Body stays at 400–500.
2. **Pill-shaped interactive elements.** Buttons, badges, tags all use
   `border-radius: 1000px`. The fully-rounded shape is the brand's visual
   signature. Never 4–8px corners on primary actions.
3. **Zero shadows, zero gradients.** All hierarchy comes from color contrast
   (near-black on off-white, off-white on near-black), typographic weight,
   and spatial separation. Adding a drop-shadow breaks the "specimen under
   glass" flatness.
4. **Monochromatic + one vivid accent.** ~93% of the page is achromatic
   (primary + background + neutrals). One vivid color exists only for
   badges, sale tags, and small emphasis pills — never for backgrounds
   larger than a chip or for body text.
5. **Warm off-white, never pure white.** #fcfcf7 (Seed's Snow White) or a
   similar warm off-white. Pure #ffffff reads clinical-sterile; the warm
   tint is what makes the palette feel organic rather than surgical.

## Palette adapts per industry

The five rules above are universal. The specific palette adapts to the
target business. `stages/repo.ts` sets `design.palette` from a per-industry
map:

| Industry | Primary | Accent | Background |
|---|---|---|---|
| Ristorazione (restaurants) | Deep olive `#1f2a1a` | Warm ochre `#c8934b` | Snow white `#fcfcf7` |
| Beauty/Wellness | Deep espresso `#2b2119` | Soft peach `#e8a094` | Warm cream `#fcfaf7` |
| Tech/SaaS | Deep navy `#0d1421` | Electric cobalt `#4d9cff` | Cool bone `#f7f8fc` |
| Servizi professionali | Near-black `#1a1a1a` | Warm ochre `#c8934b` | Snow white `#fcfcf7` |
| E-commerce | Near-black `#1a1a1a` | Terracotta `#e0654b` | Snow white `#fcfcf7` |
| Turismo | Deep teal-black `#1a2530` | Saffron `#e8a559` | Snow white `#fcfcf7` |
| Salute (health) | Seed's own forest `#1c3a13` | Lime pulse `#d3fa99` | Snow white `#fcfcf7` |
| Educazione | Deep indigo `#1e1f36` | Mustard `#f5b93d` | Snow white `#fcfcf7` |

The rules stay; the character shifts.

## Voice guidance for the content stage

When writing copy for a Seed-styled site, the text should read like:

- **A peer-reviewed journal article**, not a landing page. Measured sentences,
  no exclamation marks, no "amazing!/incredible!/game-changing!" adjectives.
- **Confident without shouting**. State facts. Let numbers and specificity
  do the persuading. Where the industry has data (e.g. sourcing distances
  for a farm-to-table restaurant), quote it.
- **Curiosity over urgency**. "Here is how we source" beats "Book now before
  it's gone." No fake scarcity, no countdown language.
- **First-person plural collective ("we")** for the brand, not "you" saturation.

For a restaurant on Seed: opening lines read like a *Kinfolk* article, not a
brochure. For a SaaS on Seed: opening lines read like a technical paper, not
a sales pitch.

## Layout defaults

- **Section rhythm:** 64–96px vertical padding. Never cram.
- **Full-bleed dark-section bands** alternating with warm-white bands create
  the signature editorial rhythm. Use `.dark-section` class in the template.
- **2-column asymmetric layouts** (40% text-left, 60% image-right) for
  content sections. Wide gutters.
- **Hero image** should be editorial photography — food, spaces, products
  captured in natural light with shallow depth of field. No lifestyle models
  smiling at the camera. No stock imagery. If AI-generated, prompt for
  "Kinfolk magazine spread" not "commercial photography."

## Frontmatter checklist for a Seed article

```yaml
title: "..."           # keep title case, no all-caps
excerpt: "..."         # 60-160 chars, declarative
category: "..."        # lowercase single word
author: "Redazione"    # or the brand name
tags: [ ... ]          # 3-6 short concrete tags
```

## Component overrides that live in the template

The `[data-style="seed"]` block in the Astro template's `theme.css`
enforces the CSS-level rules:
- Font family swap to Inter (weights 300, 400, 500, 600, 700 loaded)
- OpenType `ss05` on across `body`
- Radius: 1000px for buttons/badges, 16px for cards, 8px for inputs
- `box-shadow: none !important` on `*` under `[data-style="seed"]`
- Section padding-y 64-96px

No content-stage rewrites of CSS are needed — set `design.style: "seed"`
and the template handles the rest.

## Reference brands sharing this design language

Aesop · Allbirds · Oatly · Whoop · Hims — same near-monochrome palette
alternating full-bleed dark bands with warm-white sections, whisper-light
display type, pill-shaped minimal controls, flat surfaces.
