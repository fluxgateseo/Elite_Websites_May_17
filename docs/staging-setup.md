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

## Prereqs (one-time on the operator's machine)

- A terminal with Node 22+ and `pnpm` installed (any laptop)
- `wrangler` available via the repos' devDependencies — `pnpm install` in each
  repo brings it in; no global install needed
- Authenticate wrangler against the fluxgateseo Cloudflare account:
  ```bash
  pnpm wrangler login
  ```
  (Or export `CLOUDFLARE_API_TOKEN=…` scoped to that account.)

---

## Step 1 — Create the three Cloudflare resources

Run from the `elite-saas` repo:

```bash
pnpm wrangler d1 create elite-saas-staging
pnpm wrangler r2 bucket create elite-saas-staging-assets
pnpm wrangler kv namespace create ALLOWED_ORIGINS_STAGING
```

Each command prints an ID. Save all three.

---

## Step 2 — Paste the IDs into both wrangler.toml files

Open `elite-saas/wrangler.toml` and replace under `[env.staging]`:

- `database_id = "REPLACE_WITH_STAGING_D1_UUID"` → the D1 UUID from Step 1
- `id = "REPLACE_WITH_STAGING_KV_ID"` (KV namespace) → the KV ID from Step 1

Open `elite-pipeline-workflow/wrangler.toml` and replace under `[env.staging]`:

- `database_id = "REPLACE_WITH_STAGING_D1_UUID"` → **same D1 UUID** (the worker
  shares the staging D1 with the dashboard, mirroring prod)

Commit and push these two edits to `claude/eloquent-volta-wRqZg` in each repo.

---

## Step 3 — Apply schema migrations to the staging D1

From the `elite-saas` repo:

```bash
pnpm wrangler d1 execute elite-saas-staging --remote --env staging --file migrations/0001_initial.sql
pnpm wrangler d1 execute elite-saas-staging --remote --env staging --file migrations/0002_multi_tenant.sql
pnpm wrangler d1 execute elite-saas-staging --remote --env staging --file migrations/0003_multi_account.sql
```

Confirm:
```bash
pnpm wrangler d1 execute elite-saas-staging --remote --env staging --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## Step 4 — Push staging Worker secrets

The staging Workers need their own copies of every secret the prod Workers
use (same names, scoped to the staging Worker only). The canonical list is
the **Secrets Status** table in the dashboard Settings page. Group them by
Worker:

**For the dashboard (`elite-saas-staging`) — run in the `elite-saas` repo:**

```bash
# One per secret. Each command prompts for the value.
pnpm wrangler secret put CLOUDFLARE_API_TOKEN     --env staging
pnpm wrangler secret put CLOUDFLARE_API_TOKEN_IT  --env staging
pnpm wrangler secret put CLOUDFLARE_ACCOUNT_ID_IT --env staging
pnpm wrangler secret put CLOUDFLARE_API_TOKEN_EN  --env staging
pnpm wrangler secret put CLOUDFLARE_ACCOUNT_ID_EN --env staging
pnpm wrangler secret put DASHBOARD_HOSTNAME       --env staging   # set to "staging.innotofuture.com"
pnpm wrangler secret put AGENCY_EMAIL             --env staging
# …plus any other secrets whose Bindings column in Settings includes "dashboard"
```

**For the pipeline worker (`elite-pipeline-workflow-staging`) — run in the `elite-pipeline-workflow` repo:**

```bash
pnpm wrangler secret put CLOUDFLARE_API_TOKEN     --env staging
pnpm wrangler secret put CLOUDFLARE_API_TOKEN_IT  --env staging
pnpm wrangler secret put CLOUDFLARE_ACCOUNT_ID_IT --env staging
pnpm wrangler secret put CLOUDFLARE_API_TOKEN_EN  --env staging
pnpm wrangler secret put CLOUDFLARE_ACCOUNT_ID_EN --env staging
pnpm wrangler secret put ANTHROPIC_API_KEY        --env staging
pnpm wrangler secret put DATAFORSEO_LOGIN         --env staging
pnpm wrangler secret put DATAFORSEO_PASSWORD      --env staging
pnpm wrangler secret put GITHUB_TOKEN             --env staging
pnpm wrangler secret put FREEPIK_API_KEY          --env staging   # optional — only if used
pnpm wrangler secret put UNSPLASH_ACCESS_KEY      --env staging   # optional — only if used
# …plus any other secrets whose Bindings column in Settings includes "workflow"
```

**Reuse the same prod values for now** — staging shares the same external API
keys (Anthropic, DataForSEO, Freepik, etc.). Only `DASHBOARD_HOSTNAME` differs.

---

## Step 5 — Add the GitHub Actions secret

Each repo's `deploy-staging.yml` workflow reads `CLOUDFLARE_API_TOKEN` (and for
the pipeline worker, optionally `CLOUDFLARE_API_TOKEN_EN`) from GitHub repo
secrets. If those are already set for the prod `deploy.yml`, **no action
needed** — staging reuses them. If not:

- GitHub → `andreabbo/elite-saas` → Settings → Secrets and variables → Actions
  → add `CLOUDFLARE_API_TOKEN` (token scoped to the fluxgateseo account)
- Same for `andreabbo/elite-pipeline-workflow`

---

## Step 6 — DNS for `staging.innotofuture.com`

In the Cloudflare dashboard (logged in as fluxgateseo):

1. Open the `innotofuture.com` zone (must be on the EN/fluxgate account)
2. DNS → Records → **Add record**
   - Type: `CNAME`
   - Name: `staging`
   - Target: `staging.innotofuture.com` (placeholder — the Worker route below
     is what actually resolves it)
   - Proxy status: **Proxied** (orange cloud)
3. Workers Routes → **Add route**
   - Route: `staging.innotofuture.com/*`
   - Worker: `elite-saas-staging`

---

## Step 7 — First staging deploy (manual)

1. GitHub → `andreabbo/elite-saas` → **Actions** → **Deploy staging** →
   **Run workflow** → branch `claude/eloquent-volta-wRqZg` → Run
2. GitHub → `andreabbo/elite-pipeline-workflow` → **Actions** → **Deploy staging** →
   **Run workflow** → branch `claude/eloquent-volta-wRqZg` → Run
3. When both go green, open `https://staging.innotofuture.com`
4. Sign in with Google as fluxgateseo@gmail.com — first sign-in becomes the
   staging admin (same OAuth flow as prod, fresh DB)

---

## Ongoing — how to deploy to staging

After this one-time setup, **every staging deploy = clicking "Run workflow"
on the `Deploy staging` action** in either repo. No terminal needed.

Production deploys remain on the existing `deploy.yml` (push to main) and are
**locked behind explicit human approval** for the duration of the
multi-account work.

---

## How to verify nothing prod-side changed

After this whole setup is done, prod should look identical:

- `app.innotofuture.com` still loads, shows the same 9 sites
- `wrangler d1 execute elite-saas --remote --env en --command "SELECT count(*) FROM elite_sites;"` returns the same count as before
- The `deploy.yml` workflow file hasn't been touched

If any of those changes, stop and investigate.
