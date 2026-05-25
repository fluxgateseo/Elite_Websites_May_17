# Plan: Migrate dashboard infra to fluxgateseo CF account + `app.innotofuture.com`

**Status:** PARALLEL DEPLOY ACTIVE — M1-M5 done 2026-05-05/06, M6 cutover scheduled day+7, M7 decommission day+30.

**Quick state:**
- EN deploy live at `https://app.innotofuture.com` (custom domain, HTTPS via CF).
- IT deploy still live at `https://app.chefconnect.it` as backup.
- D1 IT data imported to EN D1 (8 sites, 1 user, 5 sessions; all sites `account='IT'` per default backfill).
- R2 IT bucket was empty, no copy needed.
- 9 secrets set on EN `elite-saas`, 6 on EN `elite-pipeline-workflow` (Plan C secrets `ANTHROPIC_API_KEY`/`DATAFORSEO_*`/`GITHUB_TOKEN` still pending — only blocks Plan C, not EN dashboard).
- `JWT_SIGNING_SECRET` is fresh on EN (CF doesn't expose IT value); sessions on EN are independent — operator re-logs in once.
- `AUTH_DEV_MODE=true` on EN; dev-login mock works (Google OAuth not needed).
- `/login` and `/signup` made dynamic so future builds don't bake env vars into HTML (commit `221855f`).

## Goal
Move the 3 workers (`elite-saas`, `elite-pipeline-workflow`, `elite-leads-worker`) and their bindings (D1, R2, KV) from CF account `Brianzadigitale@gmail.com` to `fluxgateseo@gmail.com` (id `06b37563e983e04bd56debd113fe3be5`). Public URL changes from `app.chefconnect.it` to `app.innotofuture.com`. Run both deploys in parallel ~7 days, then decommission IT (keep D1 cold as backup).

## Inventory (IT account, current)

| Worker                  | Binding         | Type     | IT name / id                              |
|-------------------------|-----------------|----------|-------------------------------------------|
| elite-saas              | DB              | D1       | `elite-saas` (`e85aeadf-bffd-4028-890d-f99b6da1e38c`) |
| elite-saas              | ASSETS_R2       | R2       | `elite-saas-assets`                        |
| elite-saas              | ALLOWED_ORIGINS | KV       | `17529cc4682f41168b4adce423c25ca0`        |
| elite-saas              | ASSETS          | static   | `.open-next/assets` (auto)                 |
| elite-pipeline-workflow | PIPELINE        | Workflow | `pipeline-workflow` (class `PipelineWorkflow`) |
| elite-leads-worker      | (none)          | —        | —                                          |

Plan C will additionally bind `DB` (D1) on `elite-pipeline-workflow` — bake that in during M3.

## Stages

### M1 — Prep
- Verify `innotofuture.com` zone on EN account: NS active (`*.ns.cloudflare.com`), proxy on.
- Google Cloud Console → OAuth client → add `https://app.innotofuture.com/api/auth/google/callback` to authorized redirect URIs (keep IT one too for now).
- Add `READ_ONLY=1` env var support to mutating API routes in elite-saas (small code change). Set on IT worker to freeze writes during parallel period.
- Snapshot IT D1: `pnpm wrangler d1 export elite-saas --remote --output backup-$(date +%Y%m%d).sql` (run with IT auth).

### M2 — Create EN scaffolding
With EN auth (`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` env vars set to EN values for these commands):
- `pnpm wrangler d1 create elite-saas` → record new id.
- `pnpm wrangler r2 bucket create elite-saas-assets`.
- `pnpm wrangler kv namespace create elite-saas-allowed-origins` → record new id.

### M3 — Code changes (branch `migrate/innotofuture`)
- `elite-saas/wrangler.toml`: add `[env.en]` block with EN `account_id`, EN D1 id, EN KV id. Top-level stays IT (so existing `pnpm deploy` keeps working on IT during parallel period).
- Same `[env.en]` block on `elite-pipeline-workflow/wrangler.toml` and `elite-leads-worker/wrangler.toml`.
- Add `[[d1_databases]]` binding `DB` to `elite-pipeline-workflow` (Plan C dependency, both envs).
- Create `elite-saas/src/lib/cf-account.ts` per multi-account doc (helper `cfAccountForDomain()`).
- Make `DASHBOARD_HOSTNAME` per-env (IT secret = `app.chefconnect.it`, EN secret = `app.innotofuture.com`).
- Verify Google OAuth callback URL is built dynamically from `DASHBOARD_HOSTNAME` (likely already; if not, fix).

### M4 — Initial EN deploy
- `pnpm wrangler deploy --env en` for all 3 workers (with EN auth).
- Set secrets on EN workers via `pnpm wrangler secret put --env en --name <worker>` (token piped through stdin, never CLI arg):
  - `elite-saas`: `JWT_SIGNING_SECRET` (**same value as IT** — preserves sessions), `AUTH_DEV_MODE`, `DASHBOARD_HOSTNAME=app.innotofuture.com`, `CLOUDFLARE_API_TOKEN` (EN — host), `CLOUDFLARE_ACCOUNT_ID` (EN — host), `CLOUDFLARE_API_TOKEN_IT` (IT, copied from IT worker), `CLOUDFLARE_ACCOUNT_ID_IT=ece36bd94db00aa348390f1f2b1f545d`, plus all Google OAuth client secrets.
  - `elite-pipeline-workflow`: `ANTHROPIC_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `GITHUB_TOKEN`, `FREEPIK_API_KEY`, `UNSPLASH_ACCESS_KEY`, plus the same `CLOUDFLARE_API_TOKEN[_IT]` / `CLOUDFLARE_ACCOUNT_ID[_IT]` pairs.
  - `elite-leads-worker`: TBD per Plan E.
- Add custom domain `app.innotofuture.com` to EN `elite-saas` worker.
- Import D1: `pnpm wrangler d1 execute elite-saas --remote --env en --file backup-YYYYMMDD.sql`.
- Copy R2 content from IT bucket to EN bucket (`rclone` between two CF S3-compatible endpoints, or `wrangler r2 object` loop).

**Convention flip:** post-migration the unsuffixed `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` is **EN (host)**, suffixed `_IT` is for cross-account calls. This inverts the convention in `plan-c-pipeline.md`. Update that doc as part of M3.

### M5 — Verify EN deploy
- Hit `https://app.innotofuture.com` → loads.
- Login flow works (Google OAuth + dev-login).
- `/sites` shows the 8 sites with correct status badges.
- `/settings` Secrets editor shows green for all secrets on both workers.
- `/builds` renders.
- D1 parity: `SELECT count(*) FROM elite_sites` matches IT count.

### M6 — Cutover (~day 7)
- Set IT workers `READ_ONLY=1` (already set in M1).
- Add 301 redirect at IT `elite-saas` worker top: any path → `https://app.innotofuture.com$path`.
- Remove IT callback URL from Google OAuth client.

### M7 — Decommission (~day 30, keep D1)
- `pnpm wrangler delete --name elite-saas` on IT (top-level, not env). Same for the other two.
- IT D1 `elite-saas` stays as cold backup, no binding.
- `chefconnect.it` zone freed.

## Risks
1. **D1 drift during parallel period.** READ_ONLY on IT from M1. Hard rule: all writes go through EN starting M5.
2. **Session invalidation across deploys.** `JWT_SIGNING_SECRET` MUST be identical on both EN and IT.
3. **OAuth misconfig.** Test M5 thoroughly before announcing cutover.
4. **`innotofuture.com` NS not on CF yet.** Block on M1 verification.
5. **Secrets in shell history.** Always pipe via stdin to `wrangler secret put`.

## Rollback
DNS for `app.innotofuture.com` → maintenance page; users keep using `app.chefconnect.it`. IT workers untouched throughout M1-M5, so rollback is instant before M6.

## Folded-in items (no separate task)
- Task #7 from the setup checklist (set EN secrets) is folded into M4 — pointless to set on IT workers that we're decommissioning.
- The convention flip in `plan-c-pipeline.md` (unsuffixed = host EN, suffixed `_IT` = remote) lands in M3.

## Open decisions before M3
- **Force-account override in wizard?** When TLD is unambiguous, can the operator still force the "wrong" account (e.g. a `.it` site on EN), or strict TLD-mapping always wins? Recommend strict; add a hidden override only if a real case appears.
- **Google OAuth client: shared or split?** Recommend shared (one client, two callback URLs) for simplicity. Split only if EN should have a different OAuth UX/branding. **As of 2026-05-06: not needed — IT and EN both run with `AUTH_DEV_MODE=true` (single-operator setup), Google OAuth is unconfigured on either. Add when multi-user matters.**

## Gotchas hit during execution

### `wrangler secret put --env <name> --name <worker>` pitfall
With `[env.en].name = "elite-saas"` in `wrangler.toml`, `wrangler deploy --env en` correctly deploys to a worker named `elite-saas` on the EN account. But `wrangler secret put NAME --env en --name elite-saas` does NOT — it ignores the `--name` override and creates/targets `elite-saas-en` (concatenating env suffix). The first migration attempt set 9 secrets on a phantom worker `elite-saas-en` while the real deploy got 0 secrets.

**Workaround:** for `wrangler secret put` against the EN deploy, drop `--env en` and pass only `--name elite-saas` while exporting `CLOUDFLARE_ACCOUNT_ID=<EN>` and `CLOUDFLARE_API_TOKEN=<EN>` env vars. Run from a directory without a `wrangler.toml` (e.g. `~`) to avoid wrangler reading the top-level (IT) config.

### Static prerender bakes `process.env` at build time
`/login` and `/signup` were prerendered (Next.js auto-detected no dynamic data). At build time, `process.env.AUTH_DEV_MODE` was undefined, so the cached HTML had `devMode=false` even after the runtime secret was set. Fixed in `221855f`: added `export const dynamic = "force-dynamic"` to both pages, and made `/login` read `DASHBOARD_HOSTNAME` at runtime so each deploy advertises its own URL.

### CF doesn't expose secret values
`wrangler secret list` and the CF API only return secret NAMES, never VALUES. So `JWT_SIGNING_SECRET` cannot be copied IT → EN; we generate a fresh one on EN and accept that operator must re-login on `app.innotofuture.com`. Same applies to any value-recovery scenario in future.

### Re-deploys hit `kv bindings require kv write perms` (open issue 2026-05-06)
After the first successful EN deploy, subsequent `wrangler deploy --env en` attempts fail with:
```
A request to the Cloudflare API (/accounts/.../workers/scripts/elite-saas/versions) failed.
You do not have access to this feature... kv bindings require kv write perms [code: 10023]
```
The EN token DOES have `Workers KV Storage → Edit` (verified by direct `PUT /storage/kv/.../values/__test_*` call returning success). The failure is on the `/versions` endpoint, suggesting CF's versioned-deploy path validates KV perms against a different rule than the storage API. Wrangler 4.85 and 4.88 both fail the same way (4.88 also requires Node 22+ which we don't have).

**Pending re-deploys (commits already on `main`, code-side complete):**
- `8f29181` — preflight TLD-aware account routing
- `24e2f68` — wizard submit-draft sets `account` from TLD

**Workaround paths to try when resuming (in order of preference):**
1. Recreate the EN API token from scratch with the FULL Workers permission set (incl. anything labelled "Workers Pipelines" / "Workers Builds" / "Workers Versions" if visible). The first deploy succeeded right after token creation; possibly the token's effective permissions degraded or CF rolled out a new permission gate.
2. Deploy via dash UI: dash.cloudflare.com → Workers & Pages → elite-saas → Deployments → upload `.open-next/worker.js` manually. Tedious but bypasses CLI auth.
3. Upgrade Node to 22 (`apt install nodejs` from NodeSource setup_22.x), then re-try `pnpm exec wrangler@4.88 deploy --env en`. New wrangler may use a different deploy path.
4. Use direct CF API: `PUT /accounts/{id}/workers/scripts/elite-saas` (legacy non-versioned). Construct multipart form with worker.js + metadata.json. Manual but token has Workers Scripts Edit.
