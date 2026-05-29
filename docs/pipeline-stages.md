# Pipeline stages

The `elite-pipeline-workflow` worker turns a completed brief into a live
site. It's a Cloudflare Workflow (durable, resumable, no time limit) with
7 numbered stages. Stages 5 and 6 are split into sub-steps so each stays
under the 50-subrequest per-step limit.

Source: `andreabbo/elite-pipeline-workflow/src/pipeline.ts`.

## Stage 1 — Intel
Merge SEO inputs into a normalized backlink list.

- Source A: **DataForSEO** (paid). Returns the domain's backlinks.
- Source B: **Ahrefs CSV** uploaded via wizard Step 6 (stored in R2).

Records per-source counts in `elite_stage_outputs`. Spam rows are kept if
the dataset has aggregate quality (see
`andreabbo/elite-pipeline-workflow/src/lib/dataforseo.ts`).

## Stage 2 — Strategy
Single Claude call (Opus). Input: brief + intel. Output:
`PageBlueprint[]` — for each page (home, chi-siamo, FAQ, blog index,
N blog articles, etc.): `slug`, `title`, `h1`, `brief`, `targetWords`,
`internalLinksTo`, `type`.

Page types: `home`, `chi-siamo`, `servizi`, `galleria`, `eventi`,
`blog-index`, `blog-article`, `faq`, `contatti`.

## Stage 3 — Content
Per-page Claude call (Haiku 4.5) using cached brand system prompt.
Outputs markdown with frontmatter (`title`, `description`, `slug`,
`image: PLACEHOLDER`).

**Hard rules in the system prompt:**

1. Every page has **≥3 internal markdown links** ([text](/slug)) in the
   prose, not in a trailing list. Uses the strategy's `internalLinksTo`
   as the starting set; adds more if natural.
2. **Blog articles only:** ≥1 outbound link to a high-authority external
   source (Wikipedia, government/institutional, established trade
   publication). Never a competitor.
3. No invented facts; no hyperbolic claims unless in the brief.

## Stage 4 — Images
Hero + body images per page from Freepik / Unsplash. Verifies each URL
returns 200 before recording. If both API keys are missing the stage
records warnings and continues (template falls back to no hero).

## Stage 5 — Repo (split: 5a → 5b around Stage 6)

### 5a · `repo-create`
Calls GitHub `/generate` against `fluxgateseo/elite-astro-template`,
creating `fluxgateseo/site-<slug>`. Idempotent on 422 "already exists".

> Stages **6a-d** run between 5a and 5b — the Pages project must exist
> and the repo secrets must be set **before** the overlay commit fires
> the deploy.

### 5b · `repo-commit`
Single multi-blob commit adding:

- `src/content/articoli/<slug>.md` (blog articles, with frontmatter
  transformed to the template's articoli collection schema — adds
  `date`, `category`, renames `description`→`excerpt`, injects
  `hero{src,alt}` from images.json)
- `src/content/pages/<slug>.md` (non-blog pages)
- `src/site.config.ts` — generated from brief via `renderSiteConfig`,
  uses `defineSiteConfig` exported by the template's `src/lib/site-config.ts`
- `astro.config.site.mjs` — `siteUrl` helper
- `src/data/images.json` — full image manifest
- `src/data/backlinks.json` — historical backlinks + link-equity dests
- `README.md` — replaces template's

This push triggers the template's `.github/workflows/deploy.yml`
`cloudflare/wrangler-action@v3` step. Because Stage 6c (below) has
already set `vars.PAGES_PROJECT_NAME`, the deploy step actually runs.

## Stage 6 — CF Pages (split into 5 sub-steps)

### 6a · `pages-zone`
Verify the domain's CF zone exists on the right account (`IT` or `EN`
based on TLD). Cross-account zone moves are **manual** — pipeline will
fail fast.

### 6b · `pages-project`
Create the CF Pages project (`site-<slug>`). Idempotent on "already
exists". No GitHub source binding — direct-upload only.

### 6c · `pages-secrets`  *(NEW 2026-05-16)*
Set the GH repo Actions secrets + variables so the template's GHA
deploy step works:

- **Secret** `CLOUDFLARE_API_TOKEN` — sealed_box-encrypted (via
  `tweetnacl` + `blakejs`, see
  `andreabbo/elite-pipeline-workflow/src/lib/github.ts`).
- **Variable** `CLOUDFLARE_ACCOUNT_ID`.
- **Variable** `PAGES_PROJECT_NAME`.

### 6d · `pages-domain`
Attach `<domain>` as a Pages custom domain on the project. Idempotent.

### 6e · `pages-dns`
Upsert a proxied CNAME from `<domain>` to `<project>.pages.dev`.

## Stage 7 — Verify
- Smoke-fetch `/`, `/sitemap.xml`, `/robots.txt`. All must return 2xx.
- **Sitemap base-URL check (NEW 2026-05-29).** Parse `/sitemap.xml` and
  assert every `<loc>` is under `https://<domain>` — and that the literal
  `demo.example` (the template placeholder) appears nowhere in the body.
  Catches the regression where Astro's `site` was never set to the real
  domain, so `@astrojs/sitemap` emitted `https://demo.example/…` (which
  also breaks canonical URLs and the `robots.txt` sitemap reference). On
  mismatch the stage fails → status `error`, never `live`. See the
  "Sitemap / canonical base URL" contract in `docs/site-template-deploy.md`.
- Best-effort PageSpeed Insights call. If PSI is rate-limited the stage
  records a warning rather than failing.
- If all checks pass: `elite_sites.status` → `live` and
  `elite_jobs.status` → `done`. Otherwise → `error`.

## Dry-run mode

`POST /api/builds/start { dryRun: true }` skips Stages 5 + 6 — runs
intel/strategy/content/images and then jumps to a `verify-only` step.
Useful to surface content-quality issues without spending GH/CF
resources.

## Cost (typical site, no dry-run)

- Stage 2 (strategy): ~1 Opus call, ~$0.05
- Stage 3 (content): 10-15 Haiku 4.5 calls (cached brand prompt) — ~$0.20
- Stage 4 (images): Freepik / Unsplash quotas, no $
- Stages 5/6: GitHub + CF Pages — free tier
- **Total per site: ≈ $0.25–0.45**

Custom-prompt (Stage-less, via `/custom-prompt`): single Opus call,
~$0.50–2 depending on repo size in scope.
