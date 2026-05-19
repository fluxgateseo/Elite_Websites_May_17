# category-cover.prompt.md

Reusable prompt for AI-generated **editorial category cover** images. One
image per content category; reused as the hero for every article in that
category and in the gallery. Used by the pipeline image step (Stage 4) and
by the manual `show_generations` flow.

## Model & params (verified working)

- model: `nano_banana_2`
- aspect_ratio: `16:9`
- resolution: `1k` (model default; ~1376x768 PNG, ~2 credits/image)
- output: served **same-origin** from the site repo's `public/img/cat-<slug>.png`
  (Cloudflare Pages CDN). Never hotlink Drive/R2 — both break in production.

## Template

```
Cinematic editorial cover image, {{subject}}. {{palette}}. Premium
{{publication}} magazine aesthetic. No text, no logos{{no_people}}.
```

Placeholders:

- `{{subject}}` — concrete scene for the category (e.g. "high-energy
  astrophysics: an abstract gamma-ray cosmic sky, energetic particle
  bursts and nebular structures, deep space").
- `{{palette}}` — brand-consistent colour direction. Keep ONE palette per
  site so all covers feel like a set (e.g. astro: "dark navy background
  with cyan and violet luminous accents"; restaurant: "warm earthy
  candlelit palette").
- `{{publication}}` — tone (scientific / gastronomy / hospitality /
  travel / fine-art / culture).
- `{{no_people}}` — append ", no people" for object/landscape categories;
  omit when a human silhouette is wanted.

## Wiring (must update ALL refs — this is the bug that broke prod once)

A cover at `/img/cat-<slug>.png` must be referenced consistently in:

1. every `src/content/articoli/*.md` front-matter `hero.src` for that category, and
2. `src/data/gallery.json` `src` entries.

Repoint helper (svg/legacy → new):
`perl -0pi -e 's{(/img/cat-[a-z]+)\.(svg|jpg)"}{$1.png"}g' <file>`

A site is correct only when `grep -rc 'cat-[a-z]*\.\(svg\|jpg\)' src public`
returns zero stale references.
