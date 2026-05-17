# Elite_Websites_May_17

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

- [ ] Create the Drive root folder `Claude/Elite_Websites_May_17/` in the
      `fluxgate` Google account.
- [ ] Add the `GDRIVE_SA_KEY` repository secret (service-account JSON, with
      write access to that Drive folder).
