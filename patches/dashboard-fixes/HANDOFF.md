# HANDOFF — dashboard (`andreabbo/elite-saas`)

Reusable hand-off for working on the **dashboard** from a Claude Code on the
web session whose environment has `andreabbo/elite-saas` in scope. This
meta-repo (`fluxgateseo/Elite_Websites_May_17`) is the source of truth for
text/patches; the dashboard app lives in `andreabbo/elite-saas`.

## Why a separate session is needed
A session's repository scope is fixed at launch (enforced by both the GitHub
MCP and the local git proxy). A session scoped only to this meta-repo
**cannot** read, push, or PR to `elite-saas` — being a GitHub collaborator
does not override it. To act on the dashboard, launch a session whose
environment includes `andreabbo/elite-saas` (ideally both repos, so patches
here are reachable).

## Stack (confirmed)
- Next.js **16.2.4** (App Router) + **`@opennextjs/cloudflare` 1.19.x**.
- Build for Cloudflare: `pnpm exec opennextjs-cloudflare build` (NOT plain
  `next build`).
- Deploy: `cloudflare/wrangler-action@v3` with `command: deploy`, **only on
  push to `main`** — see `.github/workflows/deploy.yml`.
- i18n: `lang` cookie → `getLang()` (server) → `makeT(lang)`; dictionaries in
  `src/lib/i18n.ts`. Wizard uses a `WizardI18nProvider`/`useT` context
  (`src/components/wizard/wizard-i18n.tsx`).
- Secrets: authoritative list in `src/lib/secrets-config.ts` (`SECRETS`, each
  with `required_for_phase`). Surfaced in Settings + wizard Step 5.

## Standard procedure to ship a change
1. **Patches** (if any) live in this meta-repo under
   `patches/dashboard-fixes/` on branch `claude/cool-gates-Dbiq1`. Apply with
   `git am -3 <p1> <p2> <p3>` in order; on conflict `git am --abort` and
   re-create by hand on real `main` (never force).
2. Verify: `pnpm install && pnpm tsc --noEmit` (must be clean); run the
   project lint if present.
3. Build: `pnpm exec opennextjs-cloudflare build`.
4. Open a PR to `main`; **do not self-merge**. Deploy happens automatically on
   merge (push to `main`).

## Secrets / env for the dashboard to run autonomously
Check `src/lib/secrets-config.ts` for exact names; set missing ones with
`wrangler secret put <NAME>` or via the Settings page (never commit secrets).
- **Minimum (deploy + wizard):** `CLOUDFLARE_API_TOKEN`.
- **Full pipeline:** typically `ANTHROPIC_API_KEY`,
  `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD`, `AGENCY_EMAIL`; renders need
  `GDRIVE_SA_KEY`. Trust `secrets-config.ts` over this list.

## Post-deploy smoke test
- Login; toggle 🇬🇧 → the whole "Nuovo Sito" wizard is in English; 🇮🇹 → Italian.
- `/nuovo-sito?domain=esempio-test.it` with a stale draft present → field shows
  `esempio-test.it`, preflight runs on it.
- Brief step shows the "🕰️ Com'era su Wayback Machine" link to
  `web.archive.org/web/*/<domain>`.
- Walk to the Summary; browser console free of React/hydration errors.

## Current state (2026-05-29)
- Wizard fixes (domain-precedence, Wayback button, full i18n) →
  **PR https://github.com/andreabbo/elite-saas/pull/3**, CI green; deploys on
  merge. Details + patch descriptions in `patches/dashboard-fixes/README.md`.
