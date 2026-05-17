# Infrastructure reference

**Never commit secret values to this repo.** Names + IDs only. Secret
values live in `~/.elite/secrets.env` locally (mode 0600) and in CF
worker `wrangler secret` storage remotely.

## Cloudflare accounts

There are **two** Cloudflare accounts. Routing is by TLD.

| Account | Email | Account ID | Used for |
|---------|-------|-----------|----------|
| **IT**  | Brianzadigitale@gmail.com  | `ece36bd94db00aa348390f1f2b1f545d` | `.it`, `.eu` sites |
| **EN**  | fluxgateseo@gmail.com      | `06b37563e983e04bd56debd113fe3be5` | `.com`, `.com.au`, `.co.uk`, `.us`, `.uk` sites + dashboard infra |

Local API tokens in `~/.elite/secrets.env` as `CF_TOKEN_IT` / `CF_TOKEN_EN`
plus matching `CF_ACCOUNT_ID_*`. Token scopes (same on both): D1, Workers
KV/R2/Scripts/Pages Edit, Workers Tail Read, Email Routing Edit, Account
Settings Read, User Details + Memberships Read, Zone Read, DNS Edit,
Workers Routes Edit.

## D1 databases (`elite-saas`)

Same database name on both accounts. Schema in
`andreabbo/elite-saas/src/lib/schema.ts`.

| Account | UUID | Region | Role |
|---------|------|--------|------|
| **IT**  | `e85aeadf-bffd-4028-890d-f99b6da1e38c` | WEUR | Cold backup post-cutover |
| **EN**  | `3444ad57-ccbc-4254-848d-5b8987ad69c1` | WEUR | Active |

Tables: `elite_users`, `elite_sessions`, `elite_sites`, `elite_jobs`,
`elite_stage_outputs`, `elite_leads`, `elite_user_spend`.

### Quick D1 query (EN, active)

```bash
cd ~/Code/elite-websites/elite-saas   # repo with the wrangler.toml
source ~/.elite/secrets.env
CLOUDFLARE_API_TOKEN=$CF_TOKEN_EN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID_EN \
  pnpm wrangler d1 execute elite-saas --remote --env en --json \
    --command "SELECT domain, account, status FROM elite_sites"
```

## R2 buckets

- **`elite-saas-assets`** — same name on both accounts. Stage 1 (intel) reads
  uploaded Ahrefs CSVs from here when `step6.sources` includes `csv`. IT was
  empty at migration time.

## KV namespaces (`ALLOWED_ORIGINS`)

| Account | Namespace ID |
|---------|--------------|
| IT      | `17529cc4682f41168b4adce423c25ca0` |
| EN      | `5ddcea95e3c447ad9b0cadaec3733278` |

## Workers (deployed on both accounts)

| Worker | Active URL | Notes |
|--------|-----------|-------|
| `elite-saas`              | `https://app.innotofuture.com` (EN), `https://app.chefconnect.it` (IT backup) | Next.js / OpenNext dashboard |
| `elite-pipeline-workflow` | `https://elite-pipeline-workflow.scissorssister.workers.dev` | Pipeline + `/custom-prompt` endpoint |
| `elite-leads-worker`      | — | Lead capture, separate workstream (Plan E) |

Deploy commands (from each worker's repo):
```bash
# Worker
pnpm wrangler deploy --env en

# Dashboard (OpenNext)
pnpm dlx @opennextjs/cloudflare build && pnpm wrangler deploy --env en
```

## Worker secrets (`elite-pipeline-workflow` on EN, current as of 2026-05-17)

All set; do not unset without rotating. Names only:

- `ANTHROPIC_API_KEY`
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_API_TOKEN_EN`, `CLOUDFLARE_API_TOKEN_IT`
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCOUNT_ID_EN`, `CLOUDFLARE_ACCOUNT_ID_IT`
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
- `GITHUB_TOKEN`
- `PIPELINE_SHARED_SECRET`
- (Optional) `FREEPIK_API_KEY`, `UNSPLASH_ACCESS_KEY` — Stage 4 falls back to no images if absent

### `wrangler secret put` gotcha

With `[env.en]` block in `wrangler.toml`, `wrangler secret put NAME --env en
--name elite-saas` ignores `--name` and concatenates a `-en` suffix, creating
a phantom worker. Workaround: run from `~` (no `wrangler.toml`), set
`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` env vars, pass
`--name elite-saas` **without** `--env en`.

## Zones (DNS)

| Domain | Account | Zone ID | NS |
|--------|---------|---------|-----|
| `innotofuture.com` | EN | `ea1df4c16645212d81b39a951ef1d5e2` | `kellen.ns.cloudflare.com` / `maeve.ns.cloudflare.com` |

Per-site zones (one per generated site) live on the matching account
(IT/EN by TLD).

## GitHub

| Repo | Purpose |
|------|---------|
| `andreabbo/elite-saas`              | Dashboard. fluxgateseo has NO push access — local commits only. |
| `andreabbo/elite-pipeline-workflow` | Worker. Same. |
| `fluxgateseo/elite-astro-template`  | Template — fork target of GH `/generate` API per new site. Push as `fluxgateseo`. |
| `fluxgateseo/site-<slug>`           | One per generated site. Owned by fluxgateseo. Auto-deploys to CF Pages on push to `main` via `cloudflare/wrangler-action@v3` (gated on `vars.PAGES_PROJECT_NAME`). |
| `fluxgateseo/Elite_Websites_May_17` | **This meta-repo.** |

Site repos carry, set by Stage 6 of the pipeline:

- **Secret:** `CLOUDFLARE_API_TOKEN` (sealed_box-encrypted, account-scoped)
- **Variables:** `CLOUDFLARE_ACCOUNT_ID`, `PAGES_PROJECT_NAME`

## DO NOT EDIT

- `andreabbo/elite-pipeline-dashboard` — superseded by `elite-saas`.
- `andreabbo/site-paginemarxiste` — collaborator's site, out of scope.
