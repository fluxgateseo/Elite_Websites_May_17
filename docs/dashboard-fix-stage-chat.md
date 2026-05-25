# Dashboard fix-stage chat — diagnose & auto-fix failed builds

Companion to `docs/custom-prompt.md`. That one edits **site content** from
the dashboard; this one diagnoses and fixes **broken pipeline stages**
from the dashboard. Goal: the operator drives everything from
`app.innotofuture.com` — never from a Claude Code session — for both site
edits **and** steps that don't work (owner requirement, 2026-05-25).

Chosen behaviour: **diagnosis + automatic fix** — the chat investigates
the failed stage, and where it can, applies the fix itself, asking the
operator to confirm before any mutating action.

## Where it lives

- **UI** — `andreabbo/elite-saas`: on every `/builds` row in `error`
  state, a `diagnose & fix ↗` action opens a chat panel next to the stage
  list (same surface that today shows `✓ Intel … ✗ Verify`). Reuses the
  `PromptButton`/modal pattern — no new dep.
- **Backend** — `andreabbo/elite-pipeline-workflow`: new
  `POST /fix-stage` (gated by `x-pipeline-secret`, like `/custom-prompt`).
  It has the credentials the UI lacks: CF API token (DNS, Pages, Rulesets,
  zone settings) + GitHub token (Actions re-run / repo dispatch) + the
  pipeline secret.

Both repos are `andreabbo/*` → **out of push-scope from a cloud session**.
Delivery is the patch flow (upload zips → `.patch` via `git am`) or a new
session with widened allowlist. See `memory.md` "Access reality".

## Flow

1. Operator opens an `error` build → panel shows the failed stage + the
   `wf:` job state.
2. **Diagnose (read-only, automatic):** worker runs the stage's check set
   (below) and returns a plain-language root cause + the resolved evidence
   (HTTP codes, DNS targets, GHA run conclusion, Pages deployment status).
3. **Propose:** worker returns `proposedFixes[]`, each with a label, the
   exact mutation, and a `destructive` flag.
4. **Confirm:** operator clicks Confirm on a fix (or "fix all safe"). Only
   then does the worker mutate. Read-only diagnosis never needs confirm;
   destructive fixes (e.g. deleting a DNS record) always show the
   before/after and require explicit confirm.
5. **Re-verify:** worker re-runs Stage 7 and updates the row
   (`error → live` on success).

## Diagnosis engine (per stage)

| Stage | Checks the worker runs |
|---|---|
| Repo (5) | GH repo exists; last `deploy.yml` run conclusion + failing step log tail |
| CF Pages (6) | Pages project exists; **custom-domain binding** state; zone DNS record for apex+www (target + proxied?); zone "Always Use HTTPS" |
| **Verify (7)** | Fetch `/`, `/sitemap.xml`, `/robots.txt`, `/galleria` (2xx + non-empty); fetch `<project>.pages.dev` directly; resolve apex/www and compare to Pages range; distinguish a CF-managed `robots.txt` 200 from a real site response |

## Fix catalog (symptom → action)

| Symptom (Verify) | Root cause | Automated fix | Confirm |
|---|---|---|---|
| 522 on apex **and** on `*.pages.dev` | no healthy Pages deployment | re-trigger `deploy.yml` (workflow_dispatch); if `npm ci` ERESOLVE → apply `template-elite-fixes.patch` to the site repo + push; last-resort: direct-upload the built `dist` | yes |
| 522 on apex, `*.pages.dev` **OK** | DNS points at a non-Pages / dead origin | bind apex+www as Pages **custom domain** (creates correct managed DNS); remove the stale proxied A/CNAME | yes (shows record diff) |
| http / www not redirecting | canonical default not enforced | turn on **Always Use HTTPS**; create the `www→apex` 301 redirect rule (see `docs/pipeline-stages.md` 6f) | yes |
| `/galleria` empty / missing covers | gallery.json ↔ frontmatter mismatch | hand to `/custom-prompt` (content scope) — link the two surfaces | n/a |
| site serves but canonical shows www | `site.config.ts` `siteUrl` wrong | `/custom-prompt` config-scope edit to `https://<apex>` | yes |

Anything the worker can't fix automatically (cross-account zone move, a
genuine origin outage) → it returns the diagnosis + the manual step, and —
per the "open a ticket" fallback — can hand the full context to a Claude
Code session so the operator still never leaves the dashboard.

## API contract

```
POST /fix-stage   on the pipeline worker
Headers: Content-Type: application/json ; x-pipeline-secret: <secret>

Body:
  { "domain": "<site domain>",     // required, must exist in elite_sites
    "jobId":  "<elite_jobs.id>",   // optional; defaults to latest for domain
    "action": "diagnose" | "<fixId>" | "confirm:<fixId>" }   // default "diagnose"

200 (diagnose):
  { "stage": "verify", "rootCause": "...", "evidence": {...},
    "proposedFixes": [ { "id": "redeploy", "label": "...", "destructive": false } ] }

200 (confirm:<fixId>):
  { "ok": true, "applied": "<fixId>", "verify": { "/": 200, ... }, "status": "live" }
```

## Credentials the worker needs (new vs `/custom-prompt`)

- CF API token scoped to: **DNS Edit**, **Pages Edit**, **Zone Settings
  Edit** (Always Use HTTPS), **Account Rulesets Edit** (redirect rules) —
  per account (IT + EN). `/custom-prompt` only needed GitHub.
- GitHub token with **Actions: write** (re-run / dispatch `deploy.yml`).

## Delivery status (2026-05-25)

- **saas UI side — DONE**, delivered as
  `patches/dashboard-edit-flow/saas-fix-stage-chat.patch` (4 files, +321):
  `api/builds/fix-stage` admin proxy, `FixStageButton` (diagnose →
  proposed fixes → confirm + post-fix Verify readout), `SitesTable`
  wiring, it/en i18n. `tsc --noEmit` clean, 48/48 vitest, `git am --3way`
  applies clean on the `elite-saas-main` upload. Owner applies +
  redeploys (same flow as the other dashboard patches).
- **worker side — TODO**: `POST /fix-stage` on
  `andreabbo/elite-pipeline-workflow` (the diagnosis engine + fix catalog
  below). Needs the CF API token scopes listed under "Credentials". The
  saas route proxies to it; until it ships, the panel surfaces the
  worker's error.

## Worked example — elgusto.it (live case 2026-05-25)

Diagnose returned: `/`+`/sitemap.xml` = 522, `/robots.txt` = 200 (CF
managed, not the site), `site-elgusto.pages.dev` = 522, apex on zone-proxy
range while Pages is on `172.66.*`. Root cause = **both** A (no healthy
deployment) **and** B (apex DNS not bound to Pages). Proposed fixes:
(1) re-trigger/patch `deploy.yml`, (2) bind apex+www as Pages custom
domain + drop stale record, (3) Always Use HTTPS + `www→apex` 301. All
three are in the catalog above.
