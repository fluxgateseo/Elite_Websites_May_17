# Multi-account Cloudflare registry — design & plan

**Status:** Proposed. Will be built and validated on **staging only**
(`staging.innotofuture.com`). Production deploy is locked behind an explicit
human "push to production" instruction — see `docs/staging-setup.md`.
**Branch:** `claude/eloquent-volta-wRqZg`
**Repos touched:** `elite-saas` (dashboard), `elite-pipeline-workflow` (worker),
this meta-repo (docs).

## Rollout (staging-first, prod-locked)

1. Stand up staging per `docs/staging-setup.md` (one-time, ~30 min, operator-run).
2. Implement Phase 1 on `claude/eloquent-volta-wRqZg` (additive — see "Phasing").
3. Deploy to staging via GitHub Actions → **Deploy staging** (manual trigger).
4. Validate on `staging.innotofuture.com` with a throwaway third Cloudflare
   account + test domain.
5. **Stop.** Promotion to prod (`app.innotofuture.com`) happens only when the
   operator explicitly says "push to production." Never automatic, never
   inferred. This document does not authorize a prod deploy.

## Context / problem

Today a site's Cloudflare account is a hardcoded label — `IT` or `EN` — chosen
purely by the domain's TLD (`src/lib/cf-account.ts`, duplicated in both repos).
The real credentials live in fixed env slots: `CLOUDFLARE_API_TOKEN_IT/EN` and
the recently-added optional `…_EN_2`. This does not scale: each new Cloudflare
account needs another hardcoded `EN_3 / EN_4 …` slot, code changes, and a
redeploy. The operator wants to **add Cloudflare accounts self-serve from the
dashboard** so sites can be built for domains hosted on any of their accounts —
while the dashboard database stays on the EN account and all generated GitHub
repos stay under `fluxgateseo`.

Goal: make a Cloudflare account **data**, not code. Add one from Settings by
pasting a token; builds then target whichever account the operator picks in the
wizard.

## Approach (confirmed with operator)

1. **Registry table in D1** (`cloudflare_accounts`) — the list of accounts is
   data. The dashboard DB stays the single EN-account D1 it already is.
2. **Reuse the existing secret-push** (`/api/secrets` → `PUT …/workers/scripts/
   {script}/secrets`) to store each account's **API token as a Cloudflare Worker
   secret** (Cloudflare's hardened secret store). D1 stores only a **pointer**
   (`token_secret_name`), never the token itself. No bespoke encryption.
3. **Manual account picking in the wizard** (not auto-detect):
   - Wizard Step 1 gets an **Account** dropdown listing all registered accounts.
   - Domain input + `Verify` queries that specific account's zones.
   - A **"Browse domains in this account"** button lists `GET /zones?account.id=…`
     for one-click selection.
   - The chosen account is stored on the site row so every later stage (Pages
     create, DNS, custom-prompt edits) targets the right account.
4. **Admin Settings UI** to add / list accounts.
5. **Sites tabs become data-driven** — the current `All / IT / EN` tab row is
   driven by the union of `[seeded IT, seeded EN, …added accounts]` instead of
   being hardcoded.

## Backward compatibility (zero data migration)

- The existing `IT` and `EN` entries appear as **virtual seeded rows** computed
  at read time from the existing `CLOUDFLARE_API_TOKEN_IT/EN` +
  `CLOUDFLARE_ACCOUNT_ID_IT/EN` env secrets. No DB writes for them, no schema
  changes to existing tables, no movement of existing secrets.
- `elite_sites.account` column is untouched in Phase 1; the 9 live sites keep
  their `IT`/`EN` label and continue to resolve via the same env slots.
- Phase 1 is **purely additive**: one new table (`cloudflare_accounts`), one
  new admin API route, one new Settings section, a registry-aware lookup that
  falls back to the env slots.

## Data model

New migration `migrations/0004_cloudflare_accounts.sql`, applied the same way
as `0001–0003`:

```sql
CREATE TABLE cloudflare_accounts (
  id                TEXT PRIMARY KEY,          -- internal id (ulid)
  label             TEXT NOT NULL,             -- free-text UI label, e.g. "EN", "AU – client X"
  cf_account_id     TEXT NOT NULL UNIQUE,      -- Cloudflare account id
  token_secret_name TEXT NOT NULL,             -- Worker secret name holding the token, e.g. CF_ACCT_<id>
  created_at        INTEGER NOT NULL,
  created_by        TEXT REFERENCES elite_users(id)
);
```

- Mirror the table in **both** `src/lib/schema.ts` files (the worker keeps its
  own partial copy of the schema by convention).
- Phase 2 may add `cf_account_id` to `elite_sites` for explicit per-site
  account persistence; Phase 1 leaves the column alone.

## Code changes (Phase 1)

**`elite-saas`:**
- Migration `migrations/0004_cloudflare_accounts.sql`
- Drizzle schema entry in `src/lib/schema.ts`
- `src/lib/cf-accounts-registry.ts` — `listAccounts(env, db)` returning
  `[…seededFromEnv, …fromRegistryTable]`
- `src/app/api/cf-accounts/route.ts` (admin-gated, same pattern as
  `api/secrets/route.ts`):
  - `GET` → list (no token values)
  - `POST` → validate token (`GET /accounts`), derive account id, push token as
    Worker secret `CF_ACCT_<id>` to both `elite-saas` and
    `elite-pipeline-workflow` scripts via the existing secret-push, insert
    registry row
- Settings page: new "Cloudflare accounts" section below "Secrets Status" with
  a list + add form (style mirrors `SecretEditor.tsx`)
- `AccountFilter.tsx` / `SitesTable.tsx` read tab list from
  `listAccounts(…)` instead of the hardcoded `["IT","EN"]`
- Wizard Step 1 (`/wizard/domain`): account dropdown, "Browse domains in this
  account" button, account stored on draft

**`elite-pipeline-workflow`:**
- Mirror migration + schema entry
- `src/lib/cf-account.ts` gains a `registry`-aware variant that reads the
  account row for the site (or, in Phase 1, the same env-fallback chain by
  label)
- No behavior change for sites whose `account` is `IT` or `EN`

## Security

- Tokens live **only** in Cloudflare Worker secrets, never in D1 or git.
- Least-privilege token scopes (same as `CLOUDFLARE_API_TOKEN_EN`):
  Workers Scripts Edit, Zone Read, Pages Edit, DNS Edit, Account Settings Read.
- API routes admin-only. `GET` never returns token values.
- New `CF_ACCT_<id>` secrets are pushed via the same code path the operator
  already uses for `CLOUDFLARE_API_TOKEN_*` updates on the Settings page.

## Verification (on staging only)

- Unit: extend `tests/cf-account.test.ts` in both repos.
- Migration: add a case to `elite-saas/tests/schema.test.ts` loading
  `0001–0004` and asserting `cloudflare_accounts` exists.
- `pnpm tsc --noEmit` + `pnpm vitest run` green in both repos.
- Manual on staging (`staging.innotofuture.com`):
  1. Settings → add a third Cloudflare account (throwaway test account)
  2. Wizard Step 1 → pick that account → "Browse domains" lists its zones
  3. Build a test site end-to-end → confirm GitHub repo created under
     `fluxgateseo`, Pages project created **on the third account**
  4. Confirm the prod dashboard (`app.innotofuture.com`) is unchanged and the
     9 live sites still resolve correctly

## Phase 2 (deferred)

- Persist `cf_account_id` on `elite_sites` for explicit per-site account
  binding (avoids re-deriving from `account` label)
- "Import from Cloudflare" button on Sites page → pulls existing Pages projects
  from a selected account into the dashboard
- Per-account spending strip

## What this plan does NOT do

- Does not modify the existing `CLOUDFLARE_API_TOKEN_IT/EN` secrets or the
  prod D1
- Does not change any of the 9 live sites' configuration
- Does not deploy to prod — only to staging, only via the manual
  `Deploy staging` workflow
- Does not alter the `deploy.yml` prod workflow in either repo
