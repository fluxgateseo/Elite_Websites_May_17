# Leads worker

> **Status: verified against source** from an uploaded snapshot of
> `andreabbo/elite-leads-worker@main` (GitHub export, 9 files). The repo
> itself is **private and not reachable** from automated sessions — this
> doc is the summary; source of truth stays in the worker repo.

## What it is

`andreabbo/elite-leads-worker` — a single Cloudflare Worker meant to
receive lead-form POSTs from **all** generated sites. It is a **separate
workstream**, not part of the 7-stage site-generation pipeline in
`docs/pipeline-stages.md`.

**Current state is a foundation skeleton only:**

- `src/index.ts` handles exactly one route: `GET /health` →
  `{ ok, service: "elite-leads-worker", ts }`. Everything else → `404`.
- `Env` interface is empty — **no D1 / KV / R2 bindings yet** (code
  comment: "Bindings will be added in Plan B/C").
- The real form handler is **not implemented** — README defers it to a
  later plan (see naming note below).
- Tests: `tests/smoke.test.ts` — 2 cases (`/health` 200, unknown 404).

## Deploy & accounts

- `wrangler.toml`: worker name `elite-leads-worker`,
  `compatibility_date = 2026-04-01`, `nodejs_compat`. Has an `[env.en]`
  block pinned to the **EN** account
  `06b37563e983e04bd56debd113fe3be5`; **no top-level `account_id`**
  (unlike `elite-saas`, which keeps IT at top level).
- CI/CD: `.github/workflows/deploy.yml` ("Test & Deploy") — runs
  `pnpm vitest run`, then on push to `main` deploys via
  `cloudflare/wrangler-action@v3` using repo secrets
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. The action runs the
  default `wrangler deploy` (no `--env en`), so the **target account is
  whatever `CLOUDFLARE_ACCOUNT_ID` points to**, using top-level config.
- No active URL is published (consistent with the `—` in
  `docs/infrastructure.md`). No secrets beyond the two deploy ones.

## Discrepancies to be aware of

- **Plan letter mismatch.** This repo's `README.md` says the real form
  handler "arrives in **Plan D**"; the dashboard's
  `docs/plan-c-pipeline.md` and our `docs/infrastructure.md` call the
  leads workstream **"Plan E"**. The work is the same; the label is
  inconsistent upstream. Not resolved here — flag when it matters.
- `docs/infrastructure.md` lists `elite_leads` as a D1 table (on the
  `elite-saas` DB). The leads worker does **not** bind or write D1 yet,
  so nothing populates that table from this worker today.

## Still open (needs Plan D/E work, not in the snapshot)

- Form-handler route + payload schema + spam/validation.
- Storage binding (D1 `elite_leads`? KV? R2?) and which account/DB.
- How generated sites reach it: the Astro template ships
  `src/components/LeadForm.astro` — confirm its POST target wiring.
- Dashboard surface: `elite-saas` has a `/lead-inbox` page (still a
  placeholder) intended to read captured leads.
- Whether it deploys to IT, EN, or both (today: single `[env.en]` +
  account-by-secret).

Keep this file a pointer/summary — update it from source when the worker
gains real functionality.
