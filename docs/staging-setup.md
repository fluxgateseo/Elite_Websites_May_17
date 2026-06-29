# Staging environment — one-time setup runbook

**Goal:** stand up an isolated copy of the dashboard + pipeline worker on
Cloudflare so risky changes (multi-account registry, schema migrations, etc.)
can be validated end-to-end **without any risk to the 9 live sites or the
prod dashboard at `app.innotofuture.com`**.

**Hostname:** `staging.innotofuture.com`
**Cloudflare account:** EN / fluxgateseo (account_id `06b37563e983e04bd56debd113fe3be5`)
**DB:** empty (fresh schema, fresh admin user)

**Hard rule:** the `deploy-staging.yml` workflow only ever touches the staging
Worker. The existing `deploy.yml` (prod deploy on push to main) is unchanged.
**No promotion to prod happens automatically or via Claude — it requires an
explicit human instruction.**

---

## What's automated vs manual

Most of the setup is **clickable GitHub Actions** — no terminal required. The
only manual pieces are: adding repo secrets in the GitHub UI (private, never
in logs), and the DNS record + Worker route in the Cloudflare dashboard.

| Step | Where | Manual or automated |
|---|---|---|
| 1. Create D1 / R2 / KV + paste IDs into wrangler.toml | GH Actions | **Automated** — one click |
| 2. Apply migrations to staging D1 | GH Actions | **Automated** (same click as step 1) |
| 3. Add staging-only secret values to GitHub repo secrets | GitHub UI | Manual (one-time) |
| 4. Push those values to staging Workers as Worker secrets | GH Actions | **Automated** — one click |
| 5. Create DNS record + Worker route for `staging.innotofuture.com` | Cloudflare UI | Manual (one-time) |
| 6. First staging deploy | GH Actions | **Automated** — one click |

Total clicks: 4 GH-Action buttons + 1 DNS record + N secret values typed once.

---

## Prereq — GitHub repo secret used by every workflow

`CLOUDFLARE_API_TOKEN` must already exist in both repos' Actions secrets,
scoped to the EN/fluxgateseo Cloudflare account. (It's already there — the
existing `deploy.yml` uses it.) If somehow missing:
- GitHub → repo → Settings → Secrets and variables → Actions → New repository
  secret → `CLOUDFLARE_API_TOKEN` = `<token>`

---

## Step 1+2 — Create resources & run migrations (one click)

Run the `Setup staging (one-time)` workflow on `claude/eloquent-volta-wRqZg`:

1. GitHub → **andreabbo/elite-saas** → Actions → **Setup staging (one-time)** → Run workflow → branch `claude/eloquent-volta-wRqZg` → Run

   What it does, idempotently:
   - Creates `elite-saas-staging` D1, `elite-saas-staging-assets` R2 bucket,
     and an `ALLOWED_ORIGINS_STAGING` KV namespace (skips any that already exist)
   - Writes the returned UUIDs into `wrangler.toml [env.staging]` (replaces
     the `REPLACE_WITH_*` placeholders)
   - Runs migrations `0001`, `0002`, `0003` against the new D1
   - Commits and pushes the wrangler.toml change to `claude/eloquent-volta-wRqZg`

2. GitHub → **andreabbo/elite-pipeline-workflow** → Actions → **Setup staging (one-time)** → Run workflow → branch `claude/eloquent-volta-wRqZg` → Run

   Just resolves the same staging D1 UUID and pastes it into this repo's
   `wrangler.toml`, then commits.

When both jobs go green, both repos' `wrangler.toml` files have real IDs and
the staging D1 has its schema.

---

## Step 3 — Add staging secret values to GitHub repo secrets

These values feed the next workflow (step 4). They're never logged and never
appear in the repo — GitHub repo secrets are write-only after creation.

For now, **reuse the same values as production** (staging shares external
service keys with prod). Only `DASHBOARD_HOSTNAME` differs and is set as a
literal by the workflow itself.

**In `andreabbo/elite-saas` → Settings → Secrets and variables → Actions, add:**

| Secret name | Value (same as prod) |
|---|---|
| `STAGING_CLOUDFLARE_API_TOKEN_IT`  | from prod `CLOUDFLARE_API_TOKEN_IT`  |
| `STAGING_CLOUDFLARE_ACCOUNT_ID_IT` | from prod `CLOUDFLARE_ACCOUNT_ID_IT` |
| `STAGING_CLOUDFLARE_API_TOKEN_EN`  | from prod `CLOUDFLARE_API_TOKEN_EN`  |
| `STAGING_CLOUDFLARE_ACCOUNT_ID_EN` | from prod `CLOUDFLARE_ACCOUNT_ID_EN` |
| `STAGING_GITHUB_TOKEN`             | from prod `GITHUB_TOKEN`             |
| `STAGING_GITHUB_EDIT_TOKEN`        | from prod `GITHUB_EDIT_TOKEN` (if used) |
| `STAGING_AGENCY_EMAIL`             | from prod `AGENCY_EMAIL`             |

**In `andreabbo/elite-pipeline-workflow` → Settings → Secrets and variables → Actions, add:**

| Secret name | Value (same as prod) |
|---|---|
| `STAGING_ANTHROPIC_API_KEY`        | from prod `ANTHROPIC_API_KEY`        |
| `STAGING_DATAFORSEO_LOGIN`         | from prod `DATAFORSEO_LOGIN`         |
| `STAGING_DATAFORSEO_PASSWORD`      | from prod `DATAFORSEO_PASSWORD`      |
| `STAGING_GITHUB_TOKEN`             | from prod `GITHUB_TOKEN`             |
| `STAGING_CLOUDFLARE_API_TOKEN_IT`  | from prod `CLOUDFLARE_API_TOKEN_IT`  |
| `STAGING_CLOUDFLARE_ACCOUNT_ID_IT` | from prod `CLOUDFLARE_ACCOUNT_ID_IT` |
| `STAGING_CLOUDFLARE_API_TOKEN_EN`  | from prod `CLOUDFLARE_API_TOKEN_EN`  |
| `STAGING_CLOUDFLARE_ACCOUNT_ID_EN` | from prod `CLOUDFLARE_ACCOUNT_ID_EN` |
| `STAGING_FREEPIK_API_KEY`          | from prod `FREEPIK_API_KEY` (optional) |
| `STAGING_UNSPLASH_ACCESS_KEY`      | from prod `UNSPLASH_ACCESS_KEY` (optional) |

Any `STAGING_*` left empty is simply skipped (warning in workflow log, not a failure).

---

## Step 4 — Push secrets to the staging Workers (one click)

1. GitHub → **andreabbo/elite-saas** → Actions → **Push staging secrets** → Run workflow → `claude/eloquent-volta-wRqZg` → Run
2. GitHub → **andreabbo/elite-pipeline-workflow** → Actions → **Push staging secrets** → Run workflow → `claude/eloquent-volta-wRqZg` → Run

This reads each `STAGING_*` GitHub secret and writes it to the corresponding
staging Worker as a Worker secret (under the prod-equivalent name).
`DASHBOARD_HOSTNAME` is pushed as the literal `staging.innotofuture.com`.

Re-runnable any time you rotate a secret.

---

## Step 5 — DNS for `staging.innotofuture.com` (manual, Cloudflare UI)

In the Cloudflare dashboard (logged in as fluxgateseo), in the
`innotofuture.com` zone (which must be on the EN/fluxgate account):

1. DNS → Records → **Add record**
   - Type: `CNAME`
   - Name: `staging`
   - Target: any placeholder (e.g. `staging.innotofuture.com`) — the route below
     is what actually resolves it
   - Proxy status: **Proxied** (orange cloud)
2. Workers Routes → **Add route**
   - Route: `staging.innotofuture.com/*`
   - Worker: `elite-saas-staging`

---

## Step 6 — First staging deploy (one click each)

1. GitHub → **andreabbo/elite-saas** → Actions → **Deploy staging** → Run workflow → `claude/eloquent-volta-wRqZg` → Run
2. GitHub → **andreabbo/elite-pipeline-workflow** → Actions → **Deploy staging** → Run workflow → `claude/eloquent-volta-wRqZg` → Run

When both go green, open `https://staging.innotofuture.com`. Sign in with Google
as fluxgateseo@gmail.com — first sign-in becomes the staging admin (fresh DB).

---

## Ongoing — every future staging deploy

Just click **Deploy staging** in either repo. Setup (steps 1–5) is one-time.

Production deploys remain on the existing `deploy.yml` (push to main) and are
**locked behind explicit human approval** for the duration of the
multi-account work.

---

## How to verify nothing prod-side changed

After this whole setup is done, prod should look identical:

- `app.innotofuture.com` still loads, shows the same 9 sites
- `wrangler d1 execute elite-saas --remote --env en --command "SELECT count(*) FROM elite_sites;"` returns the same count as before
- The `deploy.yml` workflow files haven't been touched

If any of those change, stop and investigate.

---

## Fallback — manual terminal flow

If a GH Action fails or the boss prefers the terminal, every step above maps
1:1 to a `wrangler` command. The original terminal runbook is preserved in
the git history of this file (see commit predating the "automate steps 1–4"
commit).
