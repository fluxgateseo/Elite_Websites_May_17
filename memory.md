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

## How to resume

1. `git fetch origin claude/setup-github-architecture` and fast-forward —
   commits may have been pushed from other sessions.
2. Re-read `docs/` if anything there changed.
3. Adopt the `Master Documents/MASTER_PROMPT.md` persona before any work.
4. Keep binaries out of git; manifest+Drive write is one logical unit.
5. For dashboard work: ask the user to re-upload the `elite-saas` (and
   if needed `elite-leads-worker`) zip; resume via the patch flow unless
   the Access-reality blockers have been cleared.
