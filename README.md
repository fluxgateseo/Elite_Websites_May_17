# Elite_Websites_May_17

Meta-repo for the **Elite Websites** project — a generation pipeline that
turns an 11-step wizard brief into a live, Cloudflare-hosted website with
auto-redeploy on commit.

This repo holds **instructions, prompts, schemas, operational docs, and a
manifest of binary assets in Drive**. The product itself lives in three
sibling code repos (dashboard, pipeline worker, Astro template) — see
`docs/architecture.md` for the system map.

## Where to look first

| If you want to… | Read |
|------------------|------|
| Understand the full system (dashboard ↔ worker ↔ sites) | `docs/architecture.md` |
| Find a CF account / D1 / worker ID, or know which secret is set where | `docs/infrastructure.md` |
| Trace what each pipeline stage does | `docs/pipeline-stages.md` |
| See the live sites and their repos | `docs/sites.json` |
| Send a free-text edit to an existing site | `docs/custom-prompt.md` |
| Understand the leads worker (Plan E, separate workstream) | `docs/leads-worker.md` |
| Understand the 4 design-skill variants in the wizard | `prompts/design-skills/` |
| Read the frontend-architect persona / 7-level workflow | `Master Documents/` |

## Binary asset split (this section is unchanged)

A content production project that splits responsibilities between two stores:

- **GitHub (`fluxgateseo/Elite_Websites_May_17`)** — source of truth for **all
  text**: schemas, job queue, prompt templates, config, manifest, and docs.
- **Google Drive (`fluxgate` account, `Claude/Elite_Websites_May_17/`)** —
  source of truth for **all binaries**: rendered video, image, audio, and
  source assets.

## GitHub / Drive split

| Concern                         | Lives in | Notes                                            |
| ------------------------------- | -------- | ------------------------------------------------ |
| Prompts, config, schemas, docs  | GitHub   | Versioned text only                              |
| Job queue (`content/queue.json`)| GitHub   | What to render and current status                |
| Artifact index (`manifest.json`)| GitHub   | Pointers to Drive binaries by **file ID**        |
| Rendered media / source assets  | Drive    | Never committed to git                           |

**Binaries are never committed.** `.gitignore` blocks the media/credential
extensions, but the rule stands regardless of extension: if it is a binary
artifact, it belongs in Drive.

## Sync rules

1. A render produces a binary locally, uploads it to
   `Claude/Elite_Websites_May_17/<batch>/<file>`, then **deletes the local
   copy**.
2. Drive files are referenced **only by Drive file ID** in `manifest.json`.
   `drivePath` is recorded for humans but is **not** the identifier — IDs are
   stable across moves/renames, paths are not.
3. **The Drive write and the manifest commit are one logical unit.** A binary
   that exists in Drive but is not in a committed `manifest.json` (or vice
   versa) is a broken state. Never leave the two out of sync.
4. The job queue's `result.driveFileId` and the manifest entry's
   `driveFileId` must agree once a job is `rendered`.

## Validation

`.github/workflows/validate.yml` runs on every push and PR:

- `manifest.json` is validated against `manifest.schema.json`.
- `content/queue.json` is validated against `content/queue.schema.json`,
  with `schemas/job.schema.json` registered by `$id`.
- `docs/sites.json` is validated against `docs/sites.schema.json`.

JSON Schema **draft 2020-12** via `ajv-cli` + `ajv-formats`.

## CI auth note

`.github/workflows/render.yml` (manual `workflow_dispatch`, input: `batch`)
is **gated on the `GDRIVE_SA_KEY` secret being present** — the render job is
skipped when the secret is empty, so the workflow stays green on forks and
before credentials are provisioned. When present, the secret (a Google
service-account JSON key) is written to a temp file and exposed to the render
steps via `GOOGLE_APPLICATION_CREDENTIALS`.

## Setup actions required (owner)

These are intentionally **not** automated and must be done by the repo owner:

- [x] Create the Drive root folder `Claude/Elite_Websites_May_17/` in the
      `fluxgate` Google account — done
      (folder id `1cc_3ie2Id1iP-ceeVCqQ2V6OzKm7j7Hb`, empty).
- [ ] Add the `GDRIVE_SA_KEY` repository secret (service-account JSON).
      Until set, `render.yml` self-skips and CI stays green.
- [ ] Grant that service account **Content manager** access to the Drive
      folder above — the folder is owned by `fluxgateseo@gmail.com` and the
      SA is a separate identity; without explicit access, uploads fail.
