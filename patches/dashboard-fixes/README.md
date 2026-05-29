# Dashboard fixes (`andreabbo/elite-saas`)

Operational bug fixes for the dashboard, delivered as `git am`-able patches
(Plan-C: the dashboard source lives in `andreabbo/elite-saas`, not this
meta-repo). Generated against the `elite-saas` source as of 2026-05-29.

## Apply

```
# in andreabbo/elite-saas, branch off main
git am -3 path/to/<patch>.patch
pnpm tsc --noEmit        # clean
pnpm wrangler deploy     # via @opennextjs/cloudflare
```

## Patches

### `saas-wizard-domain-precedence.patch` (2026-05-29)

**Bug.** Opening the wizard with an explicit `?domain=<x>` (from "Avvia
build"'s brief-missing redirect, or a fresh "Nuovo sito" link) showed the
domain from a *previous* saved draft instead of `<x>`. Observed:
`/nuovo-sito?domain=bellezzanaturale.it` rendered the field as
`elgusto.it` and ran the WHOIS/Cloudflare preflight against the wrong
domain — i.e. you'd build the wrong site.

**Cause.** `WizardContainer` only prefilled `initialDomain` when the saved
draft had *no* domain (`!saved.step1.domain`), so any stale draft domain
won and the query param was ignored.

**Fix.** An explicit `?domain=` now takes precedence (case/space
normalized):
- no draft domain → prefill the requested one (unchanged);
- draft domain **differs** → start a clean `defaultWizardState()` for the
  requested domain (so the old scenario/brief/preflight don't leak into the
  new site);
- draft domain **matches** → resume the saved draft untouched.

Touches only `src/components/wizard/WizardContainer.tsx`. Syntax/JSX
verified with esbuild transform.

**Operator workaround (until deployed):** clear the saved draft — in the
browser console `localStorage.removeItem("elite-wizard-draft-v1")` then
reload, or finish/clear the existing draft before starting a new domain.

### `saas-wizard-wayback-button.patch` (2026-05-29)

**Request.** On the wizard Brief step, add a button to see what the site
used to look like on the Wayback Machine — useful for Scenario A (expired
domain) and rebuilds, where the old site is a source for the brief.

**Change.** Adds a link under the Brief step heading that opens
`https://web.archive.org/web/*/<domain>` (snapshot overview for
`state.step1.domain`) in a new tab. Shown only when a domain is set.
Touches only `src/components/wizard/Step4Brief.tsx`. Syntax/JSX verified
with esbuild transform.
