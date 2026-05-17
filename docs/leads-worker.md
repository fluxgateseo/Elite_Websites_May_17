# Leads worker — Plan E (separate workstream)

> **Status: placeholder.** `andreabbo/elite-leads-worker` is a **private**
> repo outside this session's access. Nothing here is verified against
> source — every `TODO` is an unknown to confirm once the repo is
> reachable. Do not treat the guesses as fact.

## What is known (from `docs/infrastructure.md`)

- Repo: `andreabbo/elite-leads-worker` (owner `andreabbo`, private).
- A Cloudflare Worker, **lead capture**, tracked as a **separate
  workstream ("Plan E")** — not part of the 7-stage site-generation
  pipeline in `docs/pipeline-stages.md`.
- No active URL recorded in `infrastructure.md` (Workers table shows `—`).
- Same two-account model is likely (IT/EN by TLD) but **unconfirmed**.

## To confirm when the repo is accessible

- [ ] Active worker URL(s) and route(s); which CF account(s) it deploys to.
- [ ] Trigger surface: how leads enter (form post from generated sites?
      the template ships `src/components/LeadForm.astro` — confirm whether
      it targets this worker).
- [ ] Storage: D1 table(s) (`elite_leads` exists per `infrastructure.md`)
      vs KV/R2/external. Confirm schema + which DB/account.
- [ ] Secrets it needs (names only) and where they are set.
- [ ] Relationship to the dashboard (`elite-saas`): does `/sites` or any
      route read/display captured leads?
- [ ] Deploy command + repo CI, if any.
- [ ] Owner/push-access reality (likely local-commit-only like the other
      `andreabbo/*` repos).

## How to fill this in

When the repo is reachable (clone locally or granted MCP scope): read
`src/`, `wrangler.toml`, and any `schema.ts`, then replace each `TODO`
above with verified facts and add the URL to the Workers table in
`docs/infrastructure.md`. Keep this file a pointer/summary — source of
truth stays in the worker repo.
