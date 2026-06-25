# Multi-account Cloudflare registry — design & plan

**Status:** Proposed (awaiting approval). Not yet implemented or deployed.
**Branch:** `claude/eloquent-volta-wRqZg`
**Repos touched:** `elite-saas` (dashboard), `elite-pipeline-workflow` (worker), this meta-repo (docs).

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
pasting a token; builds then target whichever account actually holds the
domain's zone.

## Recommended approach

1. **Registry table in D1** (`cloudflare_accounts`) — the list of accounts is
   data. The dashboard DB stays the single EN-account D1 it already is.
2. **Reuse the existing secret-push** (`/api/secrets` → `PUT …/workers/scripts/
   {script}/secrets`) to store each account's **API token as a Cloudflare Worker
   secret** (Cloudflare's hardened secret store). D1 stores only a **pointer**
   (`token_secret_name`), never the token itself. No bespoke encryption.
3. **Resolve by zone presence** — to find an account for a domain, probe each
   registered account's `/zones?name=…&account.id=…` and use the one that holds
   it (extends the logic already added in `resolveCfAccountForDomain`). For a
   brand-new domain with no zone yet, the operator picks the account in the
   wizard.
4. **Admin Settings UI** to add / list / remove accounts.

### Open decisions (recommended defaults in **bold**)
- Scope of first version: **Full self-serve** (add form validates token,
  auto-fetches account id, lists the account's domains) · vs Core-only · vs
  quick env-slot extend.
- Account choice at build time: **Auto-detect by zone, operator picks for
  new/zoneless domains** · vs always manual · vs keep TLD-based.

## Data model

New table (migration `migrations/0004_cloudflare_accounts.sql`, applied the
same way as `0001–0003`: `wrangler d1 execute elite-saas --remote --env en
--file …`):

```sql
CREATE TABLE cloudflare_accounts (
  id                TEXT PRIMARY KEY,          -- internal id (nanoid)
  label             TEXT NOT NULL,             -- free-text UI label, e.g. "EN", "AU – client X"
  cf_account_id     TEXT NOT NULL UNIQUE,      -- Cloudflare account id
  token_secret_name TEXT NOT NULL,             -- env/Worker-secret name holding the token, e.g. CF_ACCT_<id>
  bucket            TEXT,                       -- optional grouping for UI filter (keeps IT/EN filter working)
  created_at        INTEGER NOT NULL,
  created_by        TEXT REFERENCES elite_users(id)
);
```

- Mirror the table in **both** schemas: `elite-saas/src/lib/schema.ts` and the
  worker's partial copy `elite-pipeline-workflow/src/lib/schema.ts` (the worker
  reads it during the Pages stages). Note the **schema-duplication** convention
  — the worker keeps its own copy.
- Optionally add `cf_account_id` to `elite_sites` later so the resolved account
  is persisted per-site (Phase 2). Phase 1 resolves on demand by zone.

## Resolution changes (`src/lib/cf-account.ts`, both repos — keep identical)

- Add `cfAccountsFromRegistry(rows, env)` → builds `CfAccount[]` from registry
  rows, reading the token from `env[row.token_secret_name]`.
- `resolveCfAccountForDomain` gains an optional `registry` candidate list; it
  probes **registry accounts first, then the legacy env slots** (`IT/EN/EN_2`),
  using whichever holds the zone. **Legacy env slots keep working** — fully
  backward compatible.
- Callers that have DB access load the rows and pass them in:
  - Worker: `pipeline.ts` / `stages/pages.ts` (DB via `getDb(env.DB)`,
    helpers in `src/lib/db.ts`).
  - Dashboard: `api/wizard/preflight/route.ts` (already probes candidates).

## New dashboard pieces (`elite-saas`)

- **API** `src/app/api/cf-accounts/route.ts` (admin-gated with the existing
  `getCurrentUser()` + `role !== "admin"` pattern from `api/secrets/route.ts`):
  - `GET` → list accounts (no tokens).
  - `POST` → validate the pasted token via `GET /accounts` (reuse
    `deriveAccountId` pattern in `api/secrets/route.ts`), push it as a Worker
    secret `CF_ACCT_<id>` to the `dashboard` + `workflow` scripts (reuse the
    secret-push), then insert the registry row.
  - `DELETE` → remove the row (leave the Worker secret; note it for manual
    cleanup).
- **Settings UI**: a "Cloudflare accounts" section on
  `src/app/(dashboard)/settings/page.tsx` with a list + add form (mirror
  `SecretEditor.tsx` styling).
- **Generalize the UI label source** so `AccountFilter.tsx` / `SitesTable.tsx`
  read labels from the registry instead of the hardcoded `IT/EN`. Phase 2 —
  the current IT/EN filter keeps working until then.

## Backward compatibility

- `IT`, `EN`, `EN_2` env slots remain and are tried after registry accounts.
- `elite_sites.account` column is untouched in Phase 1; existing sites keep
  their `IT/EN` label. New registry accounts are used for **hosting resolution**
  (by zone), independent of that label.
- Nothing deploys automatically — apply the migration + deploy both workers is a
  deliberate, boss-gated step.

## Security notes

- Tokens live **only** in Cloudflare Worker secrets, never in D1 or git.
- Least-privilege token scopes (same as `CLOUDFLARE_API_TOKEN_EN`): Workers
  Scripts Edit, Zone Read, Pages Edit, DNS Edit, Account Settings Read.
- API routes admin-only. `GET` never returns token values.

## Phasing

- **Phase 1 (this plan):** migration + schema (both repos) + db helpers +
  registry-aware resolution (backward compatible) + admin `/api/cf-accounts` +
  Settings add/list UI + tests. Delivers "add an account, builds use it by
  zone."
- **Phase 2:** wizard account-picker for zoneless domains, "browse this
  account's domains" import, generalize `AccountFilter`/`SitesTable` off the
  hardcoded IT/EN, optional `elite_sites.cf_account_id` persistence.

## Verification

- Unit: extend `tests/cf-account.test.ts` (both repos) — registry candidate
  beats env slot when it holds the zone; legacy env path unchanged; new/zoneless
  falls back to the chosen account.
- Migration: add a case to `elite-saas/tests/schema.test.ts` that loads
  `0001–0004` and asserts `cloudflare_accounts` exists.
- `pnpm tsc --noEmit` + `pnpm vitest run` green in both repos.
- Manual (boss, post-deploy): Settings → add the second account → wizard
  preflight on `greataussiefood.com.au` shows the zone found on it → dry-run
  build resolves to that account.
