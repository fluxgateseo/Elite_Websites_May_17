# Dashboard edit flow — Plan-C deliverable (2026-05-19)

`docs/custom-prompt.md` describes `/custom-prompt` as "shipped 2026-05-17"
but the endpoint **did not exist** in `andreabbo/elite-pipeline-workflow`
nor was there a proxy route in `andreabbo/elite-saas`. Implemented here
via the Plan-C workflow (zip → patch → owner applies on-prem).

## Apply

In `andreabbo/elite-pipeline-workflow` (clone, branch off main):

```
git am -3 path/to/worker-custom-prompt.patch
pnpm vitest run         # 70 tests pass (67 existing + 3 new pathAllowed cases)
git push origin <branch>      # PR + merge
pnpm wrangler deploy --env <env>
```

In `andreabbo/elite-saas`:

```
git am -3 path/to/saas-prompt-route.patch
git am -3 path/to/saas-prompt-button.patch          # UI surface on /sites
git am -3 path/to/saas-prompt-confirm-errors.patch  # confirm step + clear errors
pnpm tsc --noEmit       # clean
pnpm wrangler deploy    # via @opennextjs/cloudflare
```

Both verified with `tsc --noEmit` clean in this session's worktrees.
`saas-prompt-confirm-errors.patch` applies on top of `saas-prompt-button.patch`
(verified with `git am -3`; the `.tsx` transforms clean under esbuild).

## What ships

### Worker
- `src/custom-prompt.ts` — handler. Loads brief by domain, fetches in-scope
  files from the site repo via the GH trees API, calls Claude Opus 4.7
  with cached system blocks (brand + repo state), parses
  `{edits:[{path,content}]}`, **filters to allowed paths twice**
  (pre-fetch tree walk + post-Claude filter), drops no-op edits, commits
  via single multi-blob commit using existing `lib/github.ts commitFiles`.
- `src/index.ts` — wires `POST /custom-prompt` under the same
  `x-pipeline-secret` gate as `/trigger`.
- `tests/custom-prompt.test.ts` — 3 tests for `pathAllowed` (scope=content,
  config, all — including traversal/sub-dir rejection).

### Dashboard
- `src/app/api/sites/[domain]/prompt/route.ts` — Next.js POST handler.
  Auth via `getCurrentUser()`; validates site exists and is `live`;
  forwards `{ prompt, scope }` plus the path-param `domain` to the worker
  with `x-pipeline-secret` server-side (never exposed to browser);
  returns the worker's JSON verbatim with its status code.

### Dashboard — confirm step + clear errors (`saas-prompt-confirm-errors.patch`)

The first cut of `PromptButton` applied edits immediately and surfaced the
raw worker error string. This patch makes the edit flow operator-safe:

- **Confirmation gate.** "Applica modifica" no longer fires the request. It
  reveals an amber confirm panel ("Stai per modificare `<domain>`, che è
  **online** … Vuoi procedere?") with *Sì, applica al sito online* / *Annulla*.
  Editing the prompt/scope (or picking a canned prompt) clears the pending
  confirmation and any prior result.
- **Clear problem messages.** Every failure maps to a human-readable Italian
  message keyed off the HTTP status, instead of `Errore: <raw>`:
  network (request never sent), 401, 404, 409 (edit in flight / not live),
  422, 500 (worker/secret misconfig), 502 (Claude/GH failure) — plus a
  distinct amber "nessuna modifica necessaria" for an empty `filesChanged`.

## Contract recap (mirrors docs/custom-prompt.md)

| Scope | Allowed paths |
|---|---|
| `content` | `src/content/articoli/*.md`, `src/content/pages/*.md` |
| `config` | `src/site.config.ts` |
| `all` | content + config + `extra-redirects.txt` |

Max prompt: 2000 chars. Max output: 16K tokens. Build is the hard gate:
if Claude returns malformed frontmatter or invalid TS, the site GHA
build fails and the previous version stays live. No diff preview in v1
— revert with `git revert <commitSha>`.

## UI status

The dashboard `prompt ↗` button described in docs/custom-prompt.md now
ships: `saas-prompt-button.patch` adds `src/components/PromptButton.tsx`
(modal + canned prompts + scope select on the `/sites` row, posting to
`/api/sites/[domain]/prompt`), and `saas-prompt-confirm-errors.patch`
layers the confirmation gate and clear failure messages on top (see the
section above). Operators can still hit the route directly via `curl`.
