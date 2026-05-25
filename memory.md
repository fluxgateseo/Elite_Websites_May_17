# memory.md — session handoff

Read this first when resuming. The container is ephemeral and clones the
repo fresh; this file is the durable memory. It **points to** canonical
docs — it never duplicates them (see CLAUDE.md hard rule).

## What this repo is

Meta-repo for the **Elite Websites** website-generation pipeline. Holds
text only (prompts, schemas, docs, queue, manifest); binaries live in
Google Drive. Product code lives in sibling repos — this repo does
**not** contain the dashboard/worker/template code.

Orientation, in order:
- `README.md` — split, validation, owner actions.
- `Master Documents/` — frontend-architect persona + 7-level workflow
  (`MASTER_PROMPT.md`, `architect.py`, `Skills_*`). **The master prompt
  for every future session is `Master Documents/MASTER_PROMPT.md`** —
  operate as that persona; do not copy it here.
- `docs/architecture.md` → `infrastructure.md` → `pipeline-stages.md` →
  `custom-prompt.md` → `leads-worker.md` → `sites.json`.
- `prompts/design-skills/` — 4 wizard visual languages.

## Branch & commit lineage

Working branch: `claude/setup-github-architecture` (all pushed).

| Commit | What |
|--------|------|
| `c8add4c` | Scaffold: 12-file GitHub/Drive architecture |
| `d78b1ce` | Imported ELITE Websites master docs from Drive |
| `29e4109` | Operational docs (architecture/infra/pipeline/sites/custom-prompt/design-skills) — authored outside this session |
| `08062f0` | Reconciled scaffold with the pipeline docs |
| `e23bda7` | Added this memory.md |
| `77e99e2` | leads-worker placeholder doc |
| `110cb5b` | leads-worker doc rewritten from verified source |
| `61569cc` | Marked paginemarxiste.it `scope: external` in sites index |

No PR opened (user has not requested one).

## Project facts worth remembering

- **CF accounts split by TLD**: IT (`Brianzadigitale@gmail.com`) for
  `.it`/`.eu`; EN (`fluxgateseo@gmail.com`) for `.com`/etc. + dashboard
  infra. IDs in `docs/infrastructure.md`.
- **Active D1**: EN `3444ad57-ccbc-4254-848d-5b8987ad69c1`. IT cold backup.
- **Dashboard**: `https://app.innotofuture.com`. **Pipeline worker**:
  `elite-pipeline-workflow.scissorssister.workers.dev`.
- CI (`.github/workflows/validate.yml`) validates `manifest.json`,
  `content/queue.json`, `docs/sites.json` (ajv, draft 2020-12) on push/PR.

## Access reality (verified, do not re-test blindly)

| Repo | Access from a cloud session |
|------|------|
| `fluxgateseo/Elite_Websites_May_17` | ✅ full read + push (only repo in MCP scope) |
| `fluxgateseo/elite-astro-template` | ✅ **public** — clone read-only via direct https; no push |
| `andreabbo/elite-saas` | ❌ private, out of scope — MCP/git-proxy/https all denied |
| `andreabbo/elite-pipeline-workflow` | ❌ private, denied |
| `andreabbo/elite-leads-worker` | ❌ private, denied |
| `andreabbo/site-paginemarxiste` | ❌ private, denied; also `scope: external` DO NOT EDIT |

Direct changes to any `andreabbo/*` repo need **both**: (a) `andreabbo`
grants write to the connected GitHub account, **and** (b) a **new
session** in an environment whose repo allowlist includes it (the
allowlist cannot be widened inside a running session). Otherwise the
**patch flow** is the only working delivery channel: extract an uploaded
zip → edit + test in a local git repo → deliver a `.patch` the user
applies with `git am`.

## Dashboard work done this session (delivered, not pushed)

- User uploaded zips of `elite-saas` and `elite-leads-worker`. **Uploads
  and `/tmp` extractions are ephemeral — gone next session.** To resume
  dashboard work the zips must be re-uploaded.
- Implemented **READ_ONLY write-freeze guard** for `elite-saas` (plan
  item M1 of its `docs/plan-migrate-to-innotofuture.md`): new
  `src/lib/read-only.ts` + guard in the 3 mutating routes
  (`builds/start`, `secrets`, `wizard/submit`), returns 503 after auth.
  6 vitest cases; full suite 54/54 + `tsc` green.
- Delivered as a git patch **to the user via file** (they have it):
  `read-only-guard.patch`, 5 files / +78, apply with `git am` to
  `andreabbo/elite-saas`. Not applied/pushed anywhere by us.
- `elite-leads-worker` verified from source: skeleton only (`/health`,
  no bindings, form handler deferred, `[env.en]`-only). Findings folded
  into `docs/leads-worker.md`. Upstream label mismatch noted: its README
  says "Plan D", the org docs say "Plan E".

## Drive

Root `Claude/Elite_Websites_May_17/` exists, **empty**, folder id
`1cc_3ie2Id1iP-ceeVCqQ2V6OzKm7j7Hb`, owned by `fluxgateseo@gmail.com`.
Legacy `ELITE Websites` folder (id `1SXk8Fjgtq3T3-dklKxnC2rrXfSEPr1Rp`)
was text-only and is fully migrated into git — do not re-migrate.

## Pending owner actions (cannot be automated)

1. Add `GDRIVE_SA_KEY` repo secret. Until then `render.yml` self-skips.
2. Grant the service account **Content manager** on the Drive root
   folder (separate identity from the folder owner).
3. (If direct dashboard edits are wanted) arrange `andreabbo` repo
   access + a new session with widened scope — see Access reality.
4. **Canonical-domain default (NEW 2026-05-25)** — policy recorded in
   `config/defaults.json` `site.canonical` + `docs/pipeline-stages.md` 6f +
   `docs/site-template-deploy.md`. Enforcement is owner/out-of-scope:
   (a) worker `renderSiteConfig` must emit `siteUrl = https://<apex>`
   (no www/http); (b) worker Stage 6 must add the `www→apex` 301 redirect
   rule + **Always Use HTTPS** at the zone. Until the worker ships 6f,
   apply per-site by hand on CF (zone Redirect Rule + Always Use HTTPS).

## Open / declined items

- **paginemarxiste backlink — DECLINED, awaiting authorization.** User
  asked to insert a contextual backlink from
  `paginemarxiste.it/blog/02-marxismo-e-intelligenza-artificiale/` to an
  `aitempo.it` page. Refused pending: (1) explicit authorization from the
  site owner `andreabbo` (it is `scope: external`, DO NOT EDIT), (2) repo
  access / an uploaded zip, (3) flipping it off `scope: external` since
  it would become a site we operate. `aitempo.it` is not referenced
  anywhere in project docs. Do not action without all three.
- paginemarxiste's other lessons (sitemap alias, backlink-recovery
  middleware, etc.) live in `andreabbo/site-paginemarxiste`, out of
  scope — already captured as Plan C lessons in the dashboard's
  `docs/plan-c-pipeline.md`. Nothing to do here.

## Live-site polish & automation (2026-05-19)

Two live sites hardened this session: `agilescienceapp.it`,
`modoristorante.it` (both forks of `fluxgateseo/elite-astro-template`).

Fixes shipped (via `patches/{agilescienceapp,modoristorante}-update.patch`,
5 commits each): readable-text/contrast, AI editorial category covers
(14× `nano_banana_2`, committed as `public/img/cat-*.png`, served
same-origin via CF Pages — **never** Drive/R2 hotlink, both break in
prod), full gallery, `gallery.json` reconciled to `.png` (the
svg→png miss that broke gallery images — see lesson below),
"Articoli correlati" same-category interlink, ASI institutional address.

**Lesson (do not repeat):** a cover path lives in BOTH article
front-matter `hero.src` AND `src/data/gallery.json`. Changing one and not
the other ships broken images. `prompts/category-cover.prompt.md` codifies
the wiring + the zero-stale-ref check.

**Make future sites correct by construction (the real automation):**
the code-only fixes (contrast + interlink) are template-portable and
stored as `patches/template-elite-fixes.patch` (2 files:
`src/layouts/BaseLayout.astro`, `ArticleLayout.astro`). Applied **once**
to `fluxgateseo/elite-astro-template` (`git apply` on a clone, commit,
push) every newly generated site inherits them with zero per-site work.
Image covers are content/category-specific → belong in the pipeline
Stage-4 image step, not the template; recipe codified in
`prompts/category-cover.prompt.md`.

**Access constraint (unchanged, verified):** from a cloud session only
the meta-repo is writable. `elite-astro-template` is public read-only;
`elite-pipeline-workflow` is private/out of scope. So the template apply
and the Stage-4 wiring are **owner one-time actions** — cannot be done
from here. Until then, per-site delivery stays the
`patches/*-update.patch` → `git am -3` flow.

## elgusto.it build — blocked on deploy (2026-05-25)

Build reached Verify then failed (`error, wf:complete`). Repo + CF Pages
stages green = project/domain created, NOT a working deploy. Fetch proof:
`/` + `/sitemap.xml` = **522**, `/robots.txt` = 200 (CF *managed* robots,
not the site), and `site-elgusto.pages.dev` = **522** too. Apex resolves
on CF zone-proxy range (104.21/172.67), Pages on 172.66 — different. Two
root causes, both operator/out-of-scope:
- **A** no healthy Pages deployment → check `fluxgateseo/site-elgusto`
  Actions `deploy.yml`; if `npm ci` ERESOLVE → apply
  `patches/template-elite-fixes.patch` + push, or upload `dist.zip`.
- **B** apex DNS not bound to Pages → Pages project → Custom domains → add
  `elgusto.it`; drop any stale proxied A record to the old host.
Canonical 301s (www→apex etc.) come AFTER it serves. 301 consolidation
plan (legacy backlinks): `/blog/ → /`, spam left to 404.

## Dashboard fix-stage chat — spec written (2026-05-25)

`docs/dashboard-fix-stage-chat.md`: operator diagnoses + auto-fixes failed
pipeline stages from `app.innotofuture.com` (companion to `/custom-prompt`
which does content edits). Owner requirement: drive everything from the
dashboard, never from a Claude Code session. Behaviour chosen: diagnosis +
automatic fix with confirm. Impl is `andreabbo/*` (elite-saas UI +
worker `POST /fix-stage`) → out of push-scope → patch flow / new session.

## ⚠ TODO — open reminders

- **Rendere privati di nuovo i repo dei siti** (`site-agilescienceapp`,
  `site-modoristorante`) appena finito di sbloccare il deploy CF Pages. Il
  proprietario li aveva resi pubblici temporaneamente in questa sessione
  per facilitare il debug — vanno ripristinati a `private` su GitHub.
  **Da controllare periodicamente** che restino privati (richiesta utente
  esplicita 2026-05-19).
- **Dashboard end-to-end site creation** (`app.innotofuture.com`):
  CREAZIONE — verificata in codice (Plan-C zip 2026-05-19): wizard
  11-step completo (`src/components/wizard/Step1-11.tsx`), route
  `/api/builds/start` + `triggerPipeline` + worker `/trigger` tutti
  wired correttamente. Se l'utente riporta errori nel wizard, servono
  i log specifici.
  EDIT da dashboard — **gap critico chiuso 2026-05-19**:
  `docs/custom-prompt.md` diceva "shipped" ma l'endpoint **non esisteva**
  né nel worker né nel saas. Implementato via Plan-C — vedi
  `patches/dashboard-edit-flow/` (worker `/custom-prompt` handler +
  saas `/api/sites/[domain]/prompt` proxy route). `pnpm tsc --noEmit`
  pulito, 70/70 vitest, includendo 3 nuovi test per `pathAllowed`.
  Il proprietario applica le 2 patch ai repo on-prem (`andreabbo/*`,
  out-of-scope da qui). UI button `prompt ↗` sulla `/sites` row resta
  da aggiungere come piccolo follow-up.

## CF Pages deploy was failing — ROOT CAUSE (2026-05-19)

Sites would not update no matter what was pushed (stale build served,
`.svg` 404s, `/galleria` empty). Not cache (`cf-cache-status: DYNAMIC`),
not the patches (source builds clean locally). **Root cause:** `npm ci`
— exactly what CF Pages runs — fails `ERESOLVE`: root needs `astro@^6`
but `@astrojs/tailwind@6.0.2` peer-allows only `astro ^3||^4||^5`. CF
install step aborts ⇒ every deploy red ⇒ last good (old) build served.
`@astrojs/tailwind` has no astro-6 release, so the fix is **`.npmrc`
with `legacy-peer-deps=true` + a lockfile regenerated under it**.
Verified with the exact CF sequence (`npm ci` exit 0 → `npm run build`
Complete!) on both sites. This is **template-level** — folded into
`patches/template-elite-fixes.patch`; every generated site needs it or
it will never deploy.

## Dashboard deploy resolved (2026-05-22)

elite-saas dashboard: PromptButton + noindex + IT-primary i18n flag
switcher + build-brief guard are **LIVE** on `app.innotofuture.com`
(verified externally: `x-robots-tag: noindex, nofollow, noarchive,
nosnippet` present on the EN worker AND the custom domain). Consolidated
patch: `patches/dashboard-edit-flow/saas-dashboard-all.patch`.

**Recurring blocker + lesson:** every "still old after deploy" was the
same root cause — `gh pr merge` was NOT landing the commits on `main`
(branches created but never merged), so each `wrangler deploy` shipped
stale code. Fix that finally worked: `git apply --3way` the consolidated
patch **directly on main** → `git add -A && git commit && git push
origin main` → verify with `grep -c "X-Robots-Tag" src/middleware.ts`
(must be ≥1) → `rm -rf .next .open-next` → `pnpm dlx
@opennextjs/cloudflare build` → `wrangler deploy --env en` (+ top-level).
**Always verify the commit is on `origin/main` before deploying** — the
PR-merge step was the silent failure point throughout.
app.innotofuture.com is served by the **EN** worker
`elite-saas.scissorssister.workers.dev`. Minor: `/robots.txt` body comes
back empty under OpenNext, but the `X-Robots-Tag` header is the
authoritative noindex signal and is working.

## How to resume

**FIRST READ THIS BLOCK on session resume — then go to standard steps below.**

### Session 2026-05-19/20/21 — what's done + where to start tomorrow

LIVE: `agilescienceapp.it` and `modoristorante.it` are correct in
prod (AI editorial covers, full gallery + `/galleria`, "Articoli
correlati", contrast, expanded articles ≥500w with ≥5 internal + ≥1
authoritative link). Their CF Pages projects are **Direct Upload**
type, not Git-connected — current state was published via manual
`dist.zip` upload (their GitHub Actions deploy was failing because the
template's `deploy.yml` used `pnpm install --frozen-lockfile` without
a `pnpm-lock.yaml`; root cause documented in `docs/site-template-deploy.md`).

WORKER: `andreabbo/elite-pipeline-workflow` updated and deployed to
**both** accounts on 2026-05-21:
- IT (Brianzadigitale) `https://elite-pipeline-workflow.brianzadigitale.workers.dev` — version `7716735d-f9c9-455a-a803-5c0e575005f2`
- EN (Fluxgateseo) `https://elite-pipeline-workflow.scissorssister.workers.dev` — version `aadb91dd-c291-4846-b2b2-1b60c12b1ce5`
Both now expose `POST /custom-prompt` (gated by `x-pipeline-secret`).

SAAS: `andreabbo/elite-saas` PR #2 merged into `main` adding
`src/app/api/sites/[domain]/prompt/route.ts`. Deploy command (run
locally — owner machine):
```
cd ~/elite-saas && source ~/.elite/secrets.env
pnpm dlx @opennextjs/cloudflare build
CLOUDFLARE_ACCOUNT_ID=ece36bd94db00aa348390f1f2b1f545d pnpm wrangler deploy --env=""
CLOUDFLARE_ACCOUNT_ID=06b37563e983e04bd56debd113fe3be5 pnpm wrangler deploy --env en
```
*Owner reported "done" on 21 May — verify next session by hitting
`POST https://app.innotofuture.com/api/sites/agilescienceapp.it/prompt`
with a logged-in cookie; if the route 404s, the saas deploy didn't
land.*

### Tomorrow — start here, in this order

1. **Smoke-test the dashboard edit flow end-to-end.**
   Hit the worker directly first (no auth on the route, just the
   pipeline secret):
   ```
   curl -i -X POST https://elite-pipeline-workflow.scissorssister.workers.dev/custom-prompt \
     -H "x-pipeline-secret: $PIPELINE_SHARED_SECRET" \
     -H "content-type: application/json" \
     -d '{"domain":"agilescienceapp.it","prompt":"hello","scope":"content"}'
   ```
   Expect a 200 with `{ok:true, commitSha, filesChanged, modelUsage}` or
   a 200 with `filesChanged:[]` if Claude judged the prompt a no-op.
   404 means saas not deployed (saas only — worker is verified).
2. **UI surface — BUILT 2026-05-22** (Plan-C): `PromptButton.tsx` +
   `SitesTable` wiring (modal, scope select, 3 canned prompts, no Radix
   dep). `tsc` clean. Patch: `patches/dashboard-edit-flow/saas-prompt-button.patch`.
   Owner applies to `andreabbo/elite-saas` + redeploy (same flow as PR #2).
3. **Auto-deploy — VERIFIED READY 2026-05-22.** `patches/template-elite-fixes.patch`
   applies clean to live `fluxgateseo/elite-astro-template` HEAD (13eec05);
   `npm ci` exit 0 + `npm run build` Complete! confirmed in a clone. Owner
   applies once (commands handed over). Original note below.

   Fix the site auto-deploy properly so future sites and
   the existing two stop needing manual `dist.zip` uploads. Patch
   ready: `patches/template-elite-fixes.patch` (npm-based deploy.yml +
   .npmrc + .nvmrc + galleria/interlink/contrast fixes). Apply ONCE to
   `fluxgateseo/elite-astro-template` (owner action — out of MCP scope
   from cloud session) and every future generated site is auto-deploy +
   correct by construction. Also re-apply per-site to
   `site-agilescienceapp` and `site-modoristorante` so they stop being
   stuck on Direct Upload.
4. **Re-verify the two site repos are private** (`memory.md` TODO):
   `gh repo view fluxgateseo/site-agilescienceapp --json visibility -q .visibility`
   should print `PRIVATE`. Same for `site-modoristorante`. Verified
   private on 2026-05-19; recheck periodically.

### Standard resume steps (unchanged)

1. `git fetch origin claude/setup-github-architecture` and fast-forward —
   commits may have been pushed from other sessions.
2. Re-read `docs/` if anything there changed.
3. Adopt the `Master Documents/MASTER_PROMPT.md` persona before any work.
4. Keep binaries out of git; manifest+Drive write is one logical unit.
5. For dashboard work: ask the user to re-upload the `elite-saas` (and
   if needed `elite-leads-worker`) zip; resume via the patch flow unless
   the Access-reality blockers have been cleared.
