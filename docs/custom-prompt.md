# Custom prompt — dashboard-driven site edits

Free-text instruction → Claude Opus → commit on `main` → GHA auto-deploy.
Shipped 2026-05-17. Use it from any `live` row on
`https://app.innotofuture.com/sites` via the `prompt ↗` action.

## What it does

The worker:

1. Loads the site's brief + repo info from D1.
2. Fetches the in-scope files from the GH repo via the git trees API
   (only `src/content/{articoli,pages}/*.md`, `src/site.config.ts`, and
   `extra-redirects.txt` depending on scope).
3. Calls Claude Opus 4.7 with brand context + repo state + the user's
   prompt, asking for `{ edits: [{ path, content }] }` JSON output.
4. **Filters edits to allowed paths** (Claude can't write outside scope
   even if asked).
5. Skips no-op edits (content identical to what's already in main).
6. Commits to `main` via a single multi-blob commit.
7. GHA's `cloudflare/wrangler-action` step deploys the change.

## Endpoint

```
POST /custom-prompt   on   https://elite-pipeline-workflow.scissorssister.workers.dev

Headers:
  Content-Type: application/json
  x-pipeline-secret: <PIPELINE_SHARED_SECRET>

Body:
  {
    "domain":  "<site domain>",        // required, must exist in elite_sites
    "prompt":  "<free text, ≤ 2000>",  // required
    "scope":   "content" | "config" | "all"   // default "all"
  }

200 OK:
  {
    "ok": true,
    "commitSha": "<sha>",
    "filesChanged": ["src/content/pages/home.md", ...],
    "modelUsage": { "inputTokens": N, "outputTokens": N, "cacheReadInputTokens": N }
  }

502 (Claude/GH failure):
  { "ok": false, "error": "<message>" }
```

The dashboard `/api/sites/[domain]/prompt` route handles auth and proxies
to the worker.

## Scope rules

| Scope     | Allowed paths |
|-----------|---------------|
| `content` | `src/content/articoli/*.md`, `src/content/pages/*.md` |
| `config`  | `src/site.config.ts` |
| `all`     | content + config + `extra-redirects.txt` |

Enforced in `andreabbo/elite-pipeline-workflow/src/lib/custom-prompt.ts`
both before fetching (the trees walk filters) and after Claude returns
edits (filter again on `pathAllowed`).

## Safety / blast radius

- Build is the hard gate. If Claude returns markdown without required
  frontmatter, or invalid TypeScript in `site.config.ts`, the GHA build
  fails → no deploy → the previous version stays live.
- No diff preview in v1. If something lands wrong, revert with `git
  revert <sha>` on the site repo and push.
- Max prompt length: 2000 chars. Output: 16K tokens.
- One job in flight per domain — re-running while a previous prompt
  hasn't finished returns 409.

## Canned prompts surfaced in the UI

- **Audit & fix 404** — content scope; checks markdown links resolve.
- **Riscrivi hero copy** — content; rewrites `home.md` first paragraph.
- **Tono più formale** — content; lifts formality to 4-5 across pages.
- **Aggiungi testimonianze** — config; injects `section-testimonials`.

Add more in `andreabbo/elite-saas/src/components/PromptButton.tsx`
(`CANNED_PROMPTS` array).

## Design canned prompts (spec — to wire into `CANNED_PROMPTS`)

These let an operator restyle a live site from `/sites` without the
wizard. They pair with the 11 `prompts/design-skills/` variants and the
`impeccable` overlay. Each is `config`+`content` scope unless noted.

Apply a visual language (per variant in `prompts/design-skills/<id>.md`),
prompt template:

> "Restyle this site to the **<id>** design language: apply its visual
> rules (typography, color, spacing, motion) and banned list from its
> design-skill contract. Keep content and structure; change only styling
> and `site.config` design tokens."

Suggested buttons:

- **Applica Minimalist / Brutalist / Soft-Premium / Emil / Maximalist /
  Retro-futuristic / Luxury / Organic / Playful / Art-Deco / Industrial**
  — one per `<id>`; fills the template above.
- **Polish impeccable** — "Run an impeccable `polish` pass: fix
  typography hierarchy, spacing rhythm, color contrast; remove the 27
  anti-patterns. No structural change." (`impeccable.md`).
- **Più bold / Più sobrio** — impeccable `bolder` / `quieter`: shift
  intensity one notch (per-site de-duplication lever).
- **De-footprint** — vary section order/markup phrasing vs the network
  baseline (see `docs/anti-footprint.md`, lever C).

> Snapshot note: the 2026-05-10 `elite-saas` export predates
> `/custom-prompt` + `PromptButton.tsx`. This section is the contract to
> implement when wiring `CANNED_PROMPTS` (or delivered as a patch once
> the current dashboard source is available).

## Cost

Single Claude Opus 4.7 call per prompt. Token budget depends on how much
of the repo is in scope:

| Site shape | Approx input tokens | Approx output tokens | Cost |
|------------|---------------------|----------------------|------|
| Small restaurant (~10 markdown files, scope=all)   | 15-20K  | 2-5K  | $0.40-1 |
| Larger site (30+ markdown, blog-heavy)             | 35-50K  | 5-15K | $1-3   |
