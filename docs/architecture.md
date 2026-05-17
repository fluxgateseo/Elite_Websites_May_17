# Elite Websites — system architecture

This meta-repo holds **instructions, prompts, schemas, and operational
docs**. The actual product is built from three external code repos.

```
                           ┌─────────────────────────────┐
                           │  fluxgateseo/                │
                           │  Elite_Websites_May_17        │   (this repo)
                           │  — Master Documents           │
                           │  — Prompts, schemas, queue    │
                           │  — Operational docs           │
                           └─────────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
   ┌────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
   │ andreabbo/         │  │ andreabbo/              │  │ fluxgateseo/         │
   │ elite-saas         │  │ elite-pipeline-workflow │  │ elite-astro-template │
   │ (Next.js dashboard)│  │ (Cloudflare worker)     │  │ (Astro template)     │
   │ app.innotofuture   │  │ pipeline trigger +      │  │ source for every     │
   │ .com               │  │ /custom-prompt          │  │ generated site repo  │
   └────────────────────┘  └────────────────────────┘  └──────────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │ fluxgateseo/site-<slug>  │
                          │ — one repo per site,     │
                          │   forked from template,  │
                          │   auto-deploys to CF     │
                          │   Pages on push to main  │
                          └─────────────────────────┘
```

## Data flow

**New site (wizard → live):**
1. User completes 11-step wizard at `app.innotofuture.com/nuovo-sito`.
2. Brief lands in D1 (`elite_sites` row, status=`draft`).
3. User clicks "Avvia build" → `POST /api/builds/start` on the dashboard.
4. Dashboard calls `elite-pipeline-workflow` worker's `/trigger` endpoint.
5. Worker runs Stages 1-7 (see `docs/pipeline-stages.md`).
6. Stage 5a forks the template into `fluxgateseo/site-<slug>`. Stage 6
   creates the CF Pages project, sets repo secrets, and Stage 5b's
   overlay commit triggers GHA which deploys via `wrangler-action`.
7. D1 row flips to `live`.

**Existing site edit (dashboard prompt → live):**
1. User clicks `prompt ↗` on `/sites` row.
2. Dashboard `POST /api/sites/[domain]/prompt` → worker `/custom-prompt`.
3. Worker fetches in-scope files, calls Claude Opus, parses JSON edits,
   commits to `main`. GHA picks up the push and deploys.

## Where things live

| Concern | Location |
|---------|----------|
| Master prompts, design rules, workflow protocol | `Master Documents/` (this repo) |
| Project-wide architectural docs | `docs/` (this repo) |
| Prompt templates with `{{var}}` placeholders | `prompts/` (this repo) |
| Design-skill bundles (minimalist, brutalist, etc.) | `prompts/design-skills/` (this repo) |
| Dashboard source code | `andreabbo/elite-saas` |
| Pipeline worker source code | `andreabbo/elite-pipeline-workflow` |
| Astro template (forked per site) | `fluxgateseo/elite-astro-template` |
| Generated site repos | `fluxgateseo/site-<slug>` |
| Live sites list | `docs/sites.json` |
| Infra references (CF, D1, workers) | `docs/infrastructure.md` |
| Render binaries (video/image/audio) | Google Drive `Claude/Elite_Websites_May_17/` |

Code repos are **never** committed into this repo. Pull them locally if
you need to edit them.
