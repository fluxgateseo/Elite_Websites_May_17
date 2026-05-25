# Plan C — Pipeline orchestration (handoff doc)

**Status as of 2026-05-06: IMPLEMENTED + DEPLOYED, awaiting external API secrets to run live.**

Code in `andreabbo/elite-pipeline-workflow:main` (commit `4115a22`): all 7 stages, 39 vitest unit tests with mocked HTTP, deployed on EN account. Trigger surface in `andreabbo/elite-saas:main` (commit `9d586bc`): `POST /api/builds/start` + `Avvia build` button on `/builds`. Cross-worker auth via `PIPELINE_SHARED_SECRET` already configured on both workers.

**To run a live build:** set `ANTHROPIC_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `GITHUB_TOKEN` (and optionally `FREEPIK_API_KEY` + `UNSPLASH_ACCESS_KEY` for Stage 4) as secrets on the EN `elite-pipeline-workflow` worker, then trigger from the dashboard. End-to-end happy-path validation against `ristorantenapolimia.it` (only fully-wizarded site in EN D1) is the recommended first run; pass `dry-run=true` to skip Stages 5+6 on the first attempt.

The original spec below is preserved for reference.

---

## Goal

Cable `elite-pipeline-workflow` so a draft row in `elite_sites` D1 can be promoted `draft → building → live` end-to-end without manual work. Today the workflow worker has only a no-op `"hello"` step ([elite-pipeline-workflow/src/index.ts](https://github.com/andreabbo/elite-pipeline-workflow)).

## Current state (verified 2026-05-05)

### Repos (all under `andreabbo`)
- **elite-saas** (private) — Next.js 15 dashboard, deployed at `app.chefconnect.it` via OpenNext-on-Cloudflare-Workers. Worker name: `elite-saas`. **This is the active dashboard repo.** The older `elite-pipeline-dashboard` repo is superseded; do NOT edit it.
- **elite-pipeline-workflow** (private) — Cloudflare Workflow worker. Currently a placeholder `PipelineWorkflow extends WorkflowEntrypoint` with one no-op step. **Plan C lives here.**
- **elite-leads-worker** (private) — placeholder. Plan E.
- **elite-astro-template** (PUBLIC) — Astro 6 template, multi-style (editorial / modern / elegant / bold), industry-aware schema.org helpers in `src/lib/schema.ts`, `scripts/post-build.mjs` for sitemap alias, `docs/internal-linking.md` for cross-link rules. **Ready to consume**.

### D1 (`elite-saas`, id `e85aeadf-bffd-4028-890d-f99b6da1e38c`, region WEUR)
8 rows in `elite_sites`:

| status | domain | businessName |
|---|---|---|
| live | paginemarxiste.it | Pagine Marxiste (manually rebuilt 2026-04-27) |
| draft | ristoranteangels.it | Ristorante Angels (Angel Roofbar, Firenze) |
| draft | modoristorante.it | Modo Ristorante |
| draft | elgusto.it | El Gusto |
| draft | bellezzalnaturale.it | Bellezza Naturale |
| draft | montagnedilombardia.it | Montagne di Lombardia |
| draft | agilescienceapp.it | Agile Science App |
| draft | ristorantenapolimia.it | Ristorante Napoli Mia |

All 7 drafts are zones already in CF account (`Brianzadigitale@gmail.com`, ID `ece36bd94db00aa348390f1f2b1f545d`, status `active`, NS = `lamar/mona.ns.cloudflare.com`).

### Auth & Secrets (worker `elite-saas`)
Auth migrated from CF Access JWT to session cookie + Google OAuth + `dev-login` mock (commit `1727951`). Header reads `cf-access-authenticated-user-email` were dead code; commit `f75609e` migrated all 3 mutating API routes to `getCurrentUser()`. The `/api/secrets` route is bootstrap-aware: setting `CLOUDFLARE_API_TOKEN` for the first time uses the incoming value to authorize the CF API PUT (commit `693a37b`). `getSecretStatuses()` in `src/lib/secret-status.ts` queries CF API per worker instead of `process.env` (commit `ddfd47d`) so cross-worker bindings show correctly.

**Set on `elite-saas` worker:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DASHBOARD_HOSTNAME`, `JWT_SIGNING_SECRET`, `AUTH_DEV_MODE`. **Multi-account additions (Plan C dependency, see below):** `CLOUDFLARE_API_TOKEN_EN`, `CLOUDFLARE_ACCOUNT_ID_EN`. The unsuffixed pair is the IT default (Brianzadigitale).

**Set on `elite-pipeline-workflow` worker:** `ANTHROPIC_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`. Still missing: `GITHUB_TOKEN`, `FREEPIK_API_KEY`, `UNSPLASH_ACCESS_KEY`, `CLOUDFLARE_API_TOKEN_EN`, `CLOUDFLARE_ACCOUNT_ID_EN`. Add these via `/settings` Secrets Editor before triggering Plan C.

CF API token must include: Account → Workers Scripts (Edit), Cloudflare Pages (Edit), Email Routing Addresses (Edit), Account Settings (Read); Zone → Zone (Read), DNS (Edit). User has this set on the IT account (`Brianzadigitale@gmail.com`); equivalent token must be created on the EN account (`fluxgateseo@gmail.com`) before first English-site build.

### Multi-account routing (added 2026-05-05)

Single dashboard, two CF accounts. Account is selected per-site from the domain TLD:

| TLD                              | Lang | Account                   |
|----------------------------------|------|---------------------------|
| `.it`, `.eu`                     | IT   | Brianzadigitale@gmail.com |
| `.com`, `.com.au`, `.co.uk`, `.us`, `.uk` | EN   | fluxgateseo@gmail.com     |
| `.ai`, `.io`                     | ?    | **wizard prompts**        |
| anything else                    | ?    | wizard prompts            |

- **Helper:** add `src/lib/cf-account.ts` exporting `cfAccountForDomain(domain)` returning `{ token, accountId, label: 'IT'|'EN' }` by reading the right env var pair. When the TLD is ambiguous, the helper requires an explicit `account` argument.
- **D1 schema:** add column `elite_sites.account TEXT NOT NULL` (values `'IT'` | `'EN'`). Migration required. Wizard Step 1 sets it: auto for unambiguous TLDs, prompt for `.ai`/`.io`/other.
- **Pipeline call sites:** Stage 5 (GH repo creation — repo owner stays `andreabbo` for both) writes the chosen account into `site-config.ts`. Stage 6 (CF Pages + DNS) reads `elite_sites.account` and passes the matching `{token, accountId}` to every CF API call. Zones already created on the wrong account must be re-created on the correct one before deploy — there is no cross-account move.
- **/sites and /builds:** add an `account` filter (segmented control IT/EN/All) so the operator can scope the view.

### Dashboard pages (commit `650ef47`)
- `/sites` — full elite_sites table via Drizzle, status badges, repo + CF Pages links
- `/builds` — same, filtered to `status IN ('draft','building','error')`
- `/nuovo-sito` — 11-step wizard, Step 6 multi-source (DataForSEO + CSV combinable), Step 5 has CF token creation guide
- `/settings` — admin-gated; Secrets Status uses CF API per-worker
- `/lead-inbox` — still placeholder (Plan E)

`SitesTable` shared component at `src/components/SitesTable.tsx`.

## Plan C — 7 stages (target architecture)

Each stage = a `WorkflowStep.do()` call. Pass shared state via `WorkflowEvent` payload + intermediate D1 writes to `elite_jobs` and `elite_stage_outputs` tables (already in schema, see `src/lib/schema.ts`).

### Stage 1 — Intel
- **Inputs:** `state.step6.sources` (`["dataforseo"]` / `["csv"]` / `["dataforseo","csv"]` / `["skip"]`) + `state.step1.domain`
- **DataForSEO branch:** POST `https://api.dataforseo.com/v3/backlinks/backlinks/live` with HTTP Basic auth (login/password). Filter to one-link-per-referring-domain.
- **CSV branch:** parse uploaded CSV from R2 (`ASSETS_R2` binding, key `briefs/{briefId}/ahrefs.csv`). Same column shape as Ahrefs export.
- **Combined:** dedupe by referring domain, prefer DataForSEO over CSV when both present (per Step 6 banner).
- **Output:** JSON list of high-DR backlinks → `elite_stage_outputs(stage='intel')`.

### Stage 2 — Strategy
- Anthropic Messages API (`claude-opus-4-7` per CLAUDE.md model knowledge — verify in code) — input: brief + intel — output: page outline (8-15 pages: home, chi-siamo, servizi/menu, galleria, eventi, blog index + N articles, faq, contatti) + slug map + 2-4 cross-link plan per page (per `elite-astro-template/docs/internal-linking.md`).
- **Output:** `pages: [{slug, title, h1, brief, internalLinksTo[], targetWords}]` → `elite_stage_outputs(stage='strategy')`.

### Stage 3 — Content
- For each page in strategy output, call Anthropic again with the page brief + global tone (Step 8) + brand keywords (Step 8) + voice traits.
- Markdown frontmatter must match `elite-astro-template`'s expected fields.
- **Output:** `{slug: markdown}` map → R2 `content/{briefId}/*.md` + `elite_stage_outputs(stage='content')`.
- Cost note: ~10-15 calls per site. Cache prompts via Anthropic prompt caching.

### Stage 4 — Images
- Hero per page: Freepik API (`https://api.freepik.com/v1/resources?query=`) — keywords from page H1 + brand category.
- Body images: Unsplash API (`https://api.unsplash.com/search/photos?query=`).
- Verify URLs resolve (HEAD request) before saving — paginemarxiste taught us never to trust unverified asset URLs.
- **Output:** `{slug: [hero, body1, body2]}` → R2 `assets/{briefId}/*.jpg` (or hotlink — Wikimedia path is also valid for cultural/historical content).

### Stage 5 — Repo scaffold + push
- GH API: `POST /user/repos` with `name=site-{domain-without-tld}`, `private=true`. Owner is always `andreabbo`, regardless of CF account.
- Clone `elite-astro-template` files, fill in `astro.config.mjs` site URL, copy generated `content/*.md` into `src/content/`, copy assets, fill `src/lib/site-config.ts` with brand info from brief (Step 4 + 7 + 8) **and the chosen `account` (`IT` | `EN`) from `elite_sites`**.
- Commit + push to `main`.
- **Output:** `githubRepo` field updated in `elite_sites`.

### Stage 6 — CF Pages deploy
- **Account selection:** read `elite_sites.account` and call `cfAccountForDomain(domain)` to pick `{token, accountId}` for every CF API call below. The zone for `{domain}` MUST already exist on the chosen account; if it's on the wrong one, fail fast with a clear error — there is no cross-account zone move.
- `POST /accounts/{accountId}/pages/projects` with `production_branch=main`, `build_config={build_command:"pnpm build", destination_dir:"dist"}`, `deployment_configs.production={env_vars:{...}}`.
- Connect GH repo via `source.config.repo_name = "andreabbo/site-{name}"`. (GH org is the same for IT and EN sites.)
- Add custom domain: `POST /accounts/{accountId}/pages/projects/{name}/domains` with `name = "{domain}"`.
- Switch CF DNS records on the same account: CNAME root → `site-{name}.pages.dev` (proxied). Lesson learned: always pass `--branch=main` if deploying via wrangler instead of GH integration ([feedback_cloudflare_pages_branch.md](../../.claude/projects/-Users-andreaabbondanza/memory/feedback_cloudflare_pages_branch.md)).
- **Output:** `cloudflarePagesProject` field updated; `status='building'` until first deploy succeeds.

### Stage 7 — Verify
- Lighthouse via `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={domain}` (no key for ≤25k req/day).
- Schema validator: fetch homepage, parse JSON-LD, validate against `schema.org` types.
- Smoke check: GET / / /sitemap.xml / /robots.txt all 200; GET /modules.php?... → 301 if backlink-recovery middleware was enabled.
- On all-green: `UPDATE elite_sites SET status='live'`.
- On any fail: `status='error'` + write reason to `elite_jobs.error`.

## Trigger surface (UI work, ~30 min)

1. Add `POST /api/builds/start` route that takes `{domain}`, looks up the row, invokes `env.PIPELINE.create({params: {domain, briefId}})`, returns `{instanceId}`.
2. Add "Avvia build" button on each `draft` row in `/builds` page → calls the route → polls `env.PIPELINE.get(instanceId).status()` every 3s.
3. Show stage-by-stage progress (read `elite_jobs` + `elite_stage_outputs` tables).

## Test plan

- Pick `agilescienceapp.it` as first guinea pig (lowest commercial risk, no existing legacy DNS to clean).
- Run end-to-end with `--dry-run` flag that skips Stage 5 (no GH push) and Stage 6 (no CF Pages deploy) — verify Stages 1-4 + 7 produce correct artifacts.
- Then live run; if it works, batch-run the remaining 6.

## Lessons from paginemarxiste rebuild (apply to Plan C)

1. **Never trust subagent-generated Wikimedia URLs.** Always verify via Commons API `action=query&prop=imageinfo&iiprop=url&iiurlwidth=N` BEFORE committing.
2. **`@astrojs/sitemap` always emits `sitemap-index.xml`**, never `sitemap.xml` — `scripts/post-build.mjs` aliases.
3. **GitHub branch protection on private repos** requires GH Pro. Either upgrade or skip.
4. **Backlink recovery via Pages Functions middleware** ([reference: site-paginemarxiste/functions/_middleware.ts](https://github.com/andreabbo/site-paginemarxiste)) — 301 old query-string URLs (PHP-Nuke etc) to new slugs.
5. **Wizard "Salva bozza" success modal might not visually confirm** — always check D1 directly.

## Quick start for next session

```bash
cd ~/Code/elite-websites/elite-saas
git pull
cat docs/plan-c-pipeline.md   # this file

# Verify state
pnpm dlx wrangler@latest d1 execute elite-saas --remote \
  --json --command "SELECT domain, status FROM elite_sites"

# Add the still-missing secrets via /settings UI on app.chefconnect.it,
# OR via wrangler CLI directly:
( source ~/.elite/secrets.env
  printf '%s' "$GITHUB_TOKEN" | pnpm dlx wrangler@latest secret put GITHUB_TOKEN --name elite-pipeline-workflow
  printf '%s' "$FREEPIK_API_KEY" | pnpm dlx wrangler@latest secret put FREEPIK_API_KEY --name elite-pipeline-workflow
  printf '%s' "$UNSPLASH_ACCESS_KEY" | pnpm dlx wrangler@latest secret put UNSPLASH_ACCESS_KEY --name elite-pipeline-workflow )

# Switch to workflow repo, start Stage 1 implementation
cd ~/Code/elite-websites/elite-pipeline-workflow
```
