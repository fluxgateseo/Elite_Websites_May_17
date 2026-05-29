# Dashboard fixes (`andreabbo/elite-saas`)

Operational fixes for the dashboard, delivered as `git am`-able patches
(Plan-C: the dashboard source lives in `andreabbo/elite-saas`, not this
meta-repo). Generated against the `elite-saas` source as of 2026-05-29.

## Status — APPLIED ✅

All three patches were applied to `andreabbo/elite-saas` (branch
`wizard-i18n-fixes`, `git am -3`, zero conflicts) and are in review:

- **PR:** https://github.com/andreabbo/elite-saas/pull/3 (`wizard-i18n-fixes` → `main`)
- **CI:** green — tests ✅, deploy skipped (deploy runs only on push to `main`).
- **Build:** `pnpm exec opennextjs-cloudflare build` (Next 16.2.4 +
  `@opennextjs/cloudflare` 1.19.x); deploy via `cloudflare/wrangler-action@v3`
  (`command: deploy`) on push to `main` — see `.github/workflows/deploy.yml`.

Once PR #3 merges, the deploy workflow ships it automatically.

## Apply

The three patches are **stacked in order** off the same baseline and apply
cleanly in sequence (verified with `git apply --check`):

```
# in andreabbo/elite-saas, branch off main
git am -3 saas-wizard-domain-precedence.patch \
         saas-wizard-wayback-button.patch \
         saas-wizard-i18n.patch
pnpm tsc --noEmit        # clean (verified)
pnpm wrangler deploy     # via @opennextjs/cloudflare
```

Verification done here against the real source: `tsc --noEmit` → 0 errors,
esbuild transform on every touched file → OK, i18n key cross-check (used ⊆
defined) and it/en parity (344 keys each) → OK.

## Patches (apply in this order)

### 1. `saas-wizard-domain-precedence.patch`

**Bug.** Opening the wizard with an explicit `?domain=<x>` showed the domain
from a *previous* saved draft instead of `<x>` — e.g.
`/nuovo-sito?domain=bellezzanaturale.it` rendered the field as `elgusto.it`,
ran the WHOIS/Cloudflare preflight against the wrong domain, and carried
elgusto's brief ("Osteria Del Gusto") into the new site.

**Cause.** `WizardContainer` only prefilled `initialDomain` when the saved
draft had *no* domain, so any stale draft domain won.

**Fix.** An explicit `?domain=` now takes precedence (case/space normalized):
no draft domain → prefill; draft domain **differs** → start a clean
`defaultWizardState()` for the requested domain (old scenario/brief/preflight
don't leak in); draft domain **matches** → resume the saved draft untouched.
Touches `src/components/wizard/WizardContainer.tsx`.

**Operator workaround (until deployed):** clear the saved draft — in the
browser console `localStorage.removeItem("elite-wizard-draft-v1")` then
reload.

### 2. `saas-wizard-wayback-button.patch`

On the Brief step, adds a link **"🕰️ Com'era su Wayback Machine ↗"** that
opens `https://web.archive.org/web/*/<domain>` (snapshots for the entered
domain) in a new tab — for Scenario A (expired domain) and rebuilds. Shown
only when a domain is set. Touches `src/components/wizard/Step4Brief.tsx`.

### 3. `saas-wizard-i18n.patch`

**Bug.** Selecting English (🇬🇧) still showed the Nuovo Sito wizard in
Italian: the wizard was never internationalized — every step hardcoded
Italian strings and `lang` was never threaded into it.

**Fix.** Adds a small `WizardI18nProvider`/`useT` context (built from the
server-resolved `lang` cookie, same mechanism the rest of the dashboard
uses), routes `lang` from the `nuovo-sito` page into `WizardContainer`, and
replaces every hardcoded string across the 11 steps + `StepNav` with i18n
keys. Adds the `wizard.*` dictionaries (it + en, 344 keys each) in
`src/lib/i18n.ts`.

Persisted/enum values stay canonical (industry codes, voice traits,
palette/font ids, the `lingua` select value) — only their **display** is
translated — so the pipeline keeps receiving the same brief data regardless
of UI language. New file: `src/components/wizard/wizard-i18n.tsx`.
