# Cloudflare account topology

Two Cloudflare accounts, with a clear split between **infra** (one account)
and **generated-site hosting** (split by TLD).

| Account | Login | Role |
|---------|-------|------|
| **fluxgateseo (EN)** | fluxgateseo@gmail.com | **All infra**: dashboard worker, pipeline worker, D1, R2, KV. Plus hosting of `.com` / `.com.au` generated sites. |
| **brianzadigitale (IT)** | brianzadigitale@gmail.com | Hosting of `.it` generated sites only (Pages + DNS). No infra. |

`app.chefconnect.it` is **retired** — do not deploy to it.

## Infra runs on fluxgateseo (EN)

- **Dashboard** (`elite-saas`) → `app.innotofuture.com`. Deploys via GitHub
  Actions with `wrangler deploy --env en`.
- **Pipeline worker** (`elite-pipeline-workflow`) → deploys with
  `wrangler deploy --env en`, so it shares the **same EN D1** the dashboard
  writes briefs to. A single EN deployment serves **both** IT and EN builds.
- **D1 / R2 / KV** → the `[env.en]` bindings in each repo's `wrangler.toml`.

> Dashboard and pipeline worker **must** be on the same account/D1, or the
> worker won't see briefs created in the dashboard.

## Site hosting is split by TLD

Stage 6 picks the hosting account per site at runtime (`src/lib/cf-account.ts`):

- `.it`, `.eu` → **brianzadigitale (IT)**
- `.com`, `.com.au`, `.co.uk`, `.us`, `.uk` → **fluxgateseo (EN)**
- `.ai`, `.io` → ambiguous; the wizard captures an explicit IT/EN override.

This routing uses **per-account secrets** set on the pipeline worker:

| Secret | Account | Used by |
|--------|---------|---------|
| `CLOUDFLARE_API_TOKEN_IT` / `CLOUDFLARE_ACCOUNT_ID_IT` | brianzadigitale | Stage 6 (host `.it` sites) + dashboard CF import (list IT zones) |
| `CLOUDFLARE_API_TOKEN_EN` / `CLOUDFLARE_ACCOUNT_ID_EN` | fluxgateseo | Stage 6 (host `.com`/`.com.au` sites) + dashboard CF import (list EN zones) |

Tokens need: **Zone:Read, Cloudflare Pages:Edit, Zone DNS:Edit** on their
account. These are tracked in the dashboard Settings (`secrets-config.ts`)
and can be set there (Update button) or via `wrangler secret put`.

## Required secrets recap (set the values — never commit them)

On the **fluxgateseo** workers:

- Deploy (repo secret `CLOUDFLARE_API_TOKEN`): scoped to fluxgateseo.
- Pipeline worker runtime: `CLOUDFLARE_API_TOKEN_IT/EN`,
  `CLOUDFLARE_ACCOUNT_ID_IT/EN`, `DATAFORSEO_LOGIN/PASSWORD`,
  `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `FREEPIK_API_KEY`,
  `UNSPLASH_ACCESS_KEY`.
- Dashboard runtime: `CLOUDFLARE_API_TOKEN` (+ `_IT`/`_EN` for the CF
  import), `AGENCY_EMAIL`, `DASHBOARD_HOSTNAME=app.innotofuture.com`, Google
  OAuth.

## Per-site DNS sanity (avoids Stage 7 "522")

A generated site's domain must have, on its hosting account, **only** a
proxied `CNAME` to `<project>.pages.dev` (remove any stale A/AAAA records
left over from an expired domain), and the Pages project must have a
successful deployment **on the same account**. Otherwise Stage 7 (Verify)
fails the build with a Cloudflare 522 (origin timeout).
