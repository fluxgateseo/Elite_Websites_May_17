# Scripts

Render/upload tooling. Scripts here turn queued jobs into Drive artifacts and
keep `manifest.json` in sync.

## Render pipeline (per job)

1. **Render** — resolve the job's prompt template + `vars` and effective
   config (`config/defaults.json` overlaid with the job's `config`),
   produce the binary locally (a temp working file).
2. **Upload** — upload the binary to Google Drive at
   `Claude/Elite_Websites_May_17/<batch>/<file>`. Capture the returned
   **Drive file ID**.
3. **Append manifest** — add an entry to `manifest.json.artifacts` with the
   `driveFileId`, `drivePath`, `kind`, `batch`, and `producedBy`
   (`commit`, `config`, optional `jobId`). Update the job's
   `result.driveFileId` and `status`.
4. **Delete local** — remove the local working file. Drive is the only home
   for the binary.

## Atomicity rule

**The Drive write and the manifest commit are one logical unit.** Either both
land or neither does:

- If the upload succeeds but the manifest commit fails, the orphaned Drive
  file must be deleted (or the commit retried until it lands) before exiting.
- Never commit a manifest entry whose `driveFileId` is not a real, uploaded
  file.
- Never leave an uploaded file unrecorded in a committed manifest.

A reconcile/verification step should treat any manifest↔Drive mismatch as a
failure.

## Notes

- Scripts must not commit binaries — `.gitignore` is a backstop, not the
  policy.
- Credentials come from `GOOGLE_APPLICATION_CREDENTIALS` (set by CI from the
  `GDRIVE_SA_KEY` secret) or local application-default credentials. Never
  hard-code or commit credentials.
