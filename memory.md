# memory.md — session handoff

Read this first when resuming. The container is ephemeral and clones the
repo fresh; this file is the durable memory. It **points to** canonical
docs — it never duplicates them (see CLAUDE.md hard rule).

## What this repo is

Meta-repo for the **Elite Websites** website-generation pipeline. Holds
text only (prompts, schemas, docs, queue, manifest); binaries live in
Google Drive. Product code lives in three sibling repos — this repo does
**not** contain the dashboard/worker/template code.

Orientation, in order:
- `README.md` — split, validation, owner actions.
- `Master Documents/` — frontend-architect persona + 7-level workflow
  (`MASTER_PROMPT.md`, `architect.py`, `Skills_*`). **The master prompt
  for every future session is `Master Documents/MASTER_PROMPT.md`** —
  operate as that persona; do not copy it here.
- `docs/architecture.md` → `infrastructure.md` → `pipeline-stages.md` →
  `custom-prompt.md` → `sites.json`.
- `prompts/design-skills/` — 4 wizard visual languages.

## Branch & commit lineage

Working branch: `claude/setup-github-architecture` (pushed).

| Commit | What |
|--------|------|
| `c8add4c` | Scaffold: 12-file GitHub/Drive architecture |
| `d78b1ce` | Imported ELITE Websites master docs from Drive |
| `29e4109` | Added operational docs (architecture/infra/pipeline/sites/custom-prompt/design-skills) — authored outside this session |
| `08062f0` | Reconciled scaffold with the pipeline docs |

No PR opened (user has not requested one).

## Project facts worth remembering

- **CF accounts split by TLD**: IT (`Brianzadigitale@gmail.com`) for
  `.it`/`.eu`; EN (`fluxgateseo@gmail.com`) for `.com`/etc. + dashboard
  infra. IDs in `docs/infrastructure.md`.
- **Active D1**: EN `3444ad57-ccbc-4254-848d-5b8987ad69c1`. IT is cold
  backup.
- **Dashboard**: `https://app.innotofuture.com`. **Worker**:
  `elite-pipeline-workflow.scissorssister.workers.dev`.
- Code repos `andreabbo/elite-saas` and `andreabbo/elite-pipeline-workflow`
  — fluxgateseo has **no push access** (local commits only).
- CI (`.github/workflows/validate.yml`) validates `manifest.json`,
  `content/queue.json`, `docs/sites.json` (ajv, draft 2020-12) on push/PR.

## Drive

Root `Claude/Elite_Websites_May_17/` exists, **empty**, folder id
`1cc_3ie2Id1iP-ceeVCqQ2V6OzKm7j7Hb`, owned by `fluxgateseo@gmail.com`.
Legacy `ELITE Websites` folder (id `1SXk8Fjgtq3T3-dklKxnC2rrXfSEPr1Rp`)
was text-only and is fully migrated into git — do not re-migrate.

## Pending owner actions (cannot be automated)

1. Add `GDRIVE_SA_KEY` repo secret. Until then `render.yml` self-skips.
2. Grant the service account **Content manager** on the Drive root
   folder (separate identity from the folder owner).

## Open decisions awaiting the user

- `docs/sites.json` lists `paginemarxiste.it` →
  `andreabbo/site-paginemarxiste`, which `docs/infrastructure.md` marks
  "out of scope, DO NOT EDIT". Left in the index (it is live). User to
  decide: annotate as out-of-scope vs. remove from the tracked list.

## How to resume

1. `git fetch origin claude/setup-github-architecture` and fast-forward —
   commits may have been pushed from other sessions (29e4109 was).
2. Re-read `docs/` if anything there changed.
3. Adopt the `Master Documents/MASTER_PROMPT.md` persona before any work.
4. Keep binaries out of git; manifest+Drive write is one logical unit.
