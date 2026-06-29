# Elite-pipeline — project overview

Read-once explainer of what this system is, how the pieces fit together, and
how a site goes from "click + New Site" to a live website on a customer
domain. Companion reading: `architecture.md` (system map), `infrastructure.md`
(account IDs and URLs), `pipeline-stages.md` (per-stage details).

---

## 1. The 30-second mental model

A multi-tenant SaaS that turns a domain name into a fully-built, deployed
website. The operator types a domain in the dashboard, picks a Cloudflare
account, fills an 11-step wizard about the business, and clicks "Start build".
Two minutes later there's a fresh GitHub repo, a Cloudflare Pages project,
DNS records, a contact form, and a live website serving the customer's
domain.

Every moving part runs on **Cloudflare Workers**, sharing a single **D1**
database. There is no Vercel, no AWS, no traditional server.

---

## 2. The four runtime pieces (Workers)

| # | Worker | What it does | Lives on |
|---|---|---|---|
| 1 | `elite-saas` (dashboard) | Next.js app via OpenNext. Admin UI, wizard, settings, build progress view, multi-account registry. | EN/fluxgateseo CF account |
| 2 | `elite-pipeline-workflow` (pipeline) | Cloudflare Workflow class with 7 stages. Generates a site end-to-end. | EN/fluxgateseo CF account |
| 3 | `elite-leads-worker` | Receives contact-form submissions from every live site, validates with Turnstile, writes to D1, optionally emails the agency. | EN/fluxgateseo CF account |
| 4 | Each generated site | Static Astro/Tailwind site running on Cloudflare Pages. One per customer domain. | The Cloudflare account that owns the domain's zone (selectable per-site) |

The first three are "our" Workers — we own and deploy them. The fourth is
created by the pipeline worker at site-generation time.

---

## 3. The one shared database

A single Cloudflare **D1** database (`elite-saas` on prod, `elite-saas-staging`
on staging) lives on the EN account and is bound to all three of our
Workers. Tables:

| Table | Owner / role |
|---|---|
| `elite_users` | dashboard admins (Google OAuth or dev-login on staging) |
| `elite_sessions` | login sessions |
| `elite_sites` | one row per customer site — domain, brief JSON, status, `account` label, `cf_account_id` (registry pointer), GitHub repo, Pages project |
| `elite_jobs` | one row per build attempt — `id` (ULID), `domain`, `status`, `currentStage`, `workflowInstanceId` (CF Workflows UUID) |
| `elite_stage_outputs` | per-job, per-stage progress + warnings + errors |
| `elite_leads` | contact-form submissions from every live site |
| `elite_user_spend` | per-user Anthropic + DataForSEO usage counters |
| `cloudflare_accounts` | **NEW** — registry of Cloudflare accounts the operator added from Settings. Token lives ONLY as a Worker secret; this row stores a pointer (`token_secret_name`). |

The dashboard inserts a job row before triggering a build; the worker reads
it and writes progress back. That's how the two halves stay in sync.

---

## 4. The five GitHub repos

| Repo | Role | Branches that matter |
|---|---|---|
| `andreabbo/elite-saas` | Dashboard source code. | `main` → prod, `claude/eloquent-volta-wRqZg` → staging |
| `andreabbo/elite-pipeline-workflow` | Pipeline worker source code. | `main` → prod, `claude/eloquent-volta-wRqZg` → staging |
| `andreabbo/elite-leads-worker` | Leads worker source code. | `main` → prod |
| `fluxgateseo/elite-astro-template` | The Astro template every generated site forks from. Edits here propagate to future builds. | `main` |
| `fluxgateseo/Elite_Websites_May_17` (this repo) | Meta repo — docs, prompt templates, runbooks, sites manifest. No runtime code. | `main`, feature branches |

Every **generated site** also becomes a GitHub repo:
`fluxgateseo/<domain-slug>`. Each one has its own GitHub Actions workflow that
deploys to Cloudflare Pages whenever its `main` branch is pushed.

---

## 5. Two environments — prod and staging

| Env | Hostname | D1 | Worker scripts |
|---|---|---|---|
| **Production** | `app.innotofuture.com` | `elite-saas` (prod) | `elite-saas`, `elite-pipeline-workflow`, `elite-leads-worker` |
| **Staging** | `staging.innotofuture.com` | `elite-saas-staging` | `elite-saas-staging`, `elite-pipeline-workflow-staging` |

Both run on the **EN/fluxgateseo** Cloudflare account. Staging is fully
isolated: separate D1, separate R2 bucket (`elite-saas-staging-assets`),
separate KV namespace, separate Worker secrets. Authentication on staging
uses a Dev login button (`AUTH_DEV_MODE=true`) — Google OAuth is prod-only.

**Hard rule:** prod deploys are locked behind explicit human approval. Push
to `main` triggers `deploy.yml` (Test & Deploy → wrangler deploy --env en).
We've configured `paths-ignore: ['.github/workflows/**', 'docs/**', '*.md']`
so workflow-only or doc-only changes don't ship to prod by mistake.

---

## 6. How a site gets built — full sequence

1. **Operator clicks `+ New Site`** in the dashboard.
2. **Wizard Step 1 — Domain.** Type the domain. Pick a Cloudflare account
   from the dropdown (legacy IT/EN seeds + any registry-added accounts).
   Hit `Verify` → preflight calls Cloudflare's `/zones?name=…&account.id=…`
   on the chosen account; if found, the wizard advances.
3. **Wizard Steps 2–11** — DNS confirmation, scenario, brief (business name,
   industry, etc.), API config, SEO source, aesthetic, voice, pages,
   deployment, review. All persisted in the draft.
4. **Submit.** Dashboard writes `elite_sites` row (status: `draft`, brief
   JSON, `cf_account_id` if a registry account was picked).
5. **Operator clicks `Start build`.** `/api/builds/start` inserts an
   `elite_jobs` row (status: `queued`), then POSTs to the pipeline worker's
   `/trigger` endpoint with the job id.
6. **Worker creates a CF Workflow instance** via `env.PIPELINE.create()`.
   Returns the instance UUID; dashboard saves it as
   `eliteJobs.workflowInstanceId`.
7. **Pipeline worker's `run()` executes the 7 stages.** Each one writes a
   row to `elite_stage_outputs` so the dashboard's PipelineProgress strip
   can show live status.
8. **Site goes live.** Stage 6e wires up DNS; Stage 7 verifies the deploy
   responds 200. Dashboard flips `elite_sites.status` to `live`.

The whole thing takes ~2 minutes for a 15-page site.

---

## 7. The 7 pipeline stages

| # | Stage | What it does | External calls |
|---|---|---|---|
| 1 | **Intel** | Pulls keyword + backlink data for the domain. | DataForSEO API |
| 2 | **Strategy** | LLM decides the page structure (which sections, which categories, voice). | Anthropic Claude |
| 3 | **Content** | LLM generates the actual page content (chunked across step.do to stay under the 50-subrequest cap). | Anthropic Claude |
| 4 | **Images** | Searches + verifies stock photos per page. | Freepik + Unsplash (optional) |
| 5 | **Repo** | Creates the `fluxgateseo/<domain>` GitHub repo from the Astro template, then commits the generated content/images. | GitHub API |
| 6 | **Pages** | Five sub-stages: 6a zone check, 6b project create, 6c secrets (writes `CLOUDFLARE_API_TOKEN` + `PAGES_PROJECT_NAME` on the site repo so its GHA can deploy), 6d custom domain attach, 6e DNS CNAME. | Cloudflare Pages + DNS APIs (token from the chosen registry account) |
| 7 | **Verify** | curl the live URL, assert 200 + correct title. | The deployed site |

Each stage records `{status, outputJson, warnings, error}` to
`elite_stage_outputs`. Errors are surfaced in the dashboard.

---

## 8. Multi-account Cloudflare registry (what we just shipped)

Before: every site was hardcoded to IT or EN based on TLD; the per-account
token was a fixed env slot.

After three phases of work:

- **Phase 1** — Settings → "Cloudflare Accounts" lets the operator add a new
  CF account by pasting an API token + label. Token validated, then pushed
  as a Worker secret (`CF_ACCT_<id>`) on both the dashboard and the
  pipeline worker. Only a pointer goes into `cloudflare_accounts`.
- **Phase 1.5** — Sites/Builds tabs become data-driven. Every registered
  account gets a tab; sites are filtered by their `account` label.
- **Phase 2** — Wizard Step 1 gets an Account dropdown. The chosen account's
  registry id is persisted on `elite_sites.cf_account_id`. At build time
  the worker reads `cf_account_id` → looks up `cloudflare_accounts` →
  reads the token from `env[token_secret_name]` → uses it for Pages, DNS,
  zone calls.

Legacy IT/EN sites (with `cf_account_id = NULL`) still work — the worker
falls back to the env-slot dispatch.

---

## 9. CI/CD — three layers

| Layer | Trigger | What runs |
|---|---|---|
| **Org-repo prod** | push to `main` on `elite-saas` / `elite-pipeline-workflow` | `Test & Deploy` → vitest → `wrangler deploy --env en` |
| **Org-repo staging** | push to `claude/eloquent-volta-wRqZg` (auto) or manual | `Deploy staging` → vitest → `wrangler deploy --env staging` |
| **Per-site Pages** | push to `main` on a `fluxgateseo/<domain>` repo | the template's bundled `deploy.yml` → `pages deploy` for that one site |

Setup workflows (clicked once per repo to provision staging):
- `Setup staging (one-time)` — creates D1 / R2 / KV, applies migrations, pastes IDs into wrangler.toml
- `Push staging secrets` — mirrors GitHub repo secrets named `STAGING_<NAME>` to the staging Worker as Worker secrets named `<NAME>`

---

## 10. Secrets — where they live, who can read them

There are three secret stores in play. **None of them ever stores a secret
in D1.**

| Store | Examples | Who can write | Who can read |
|---|---|---|---|
| **GitHub Actions repo secrets** | `CLOUDFLARE_API_TOKEN`, `STAGING_ANTHROPIC_API_KEY` | Repo admins via GitHub UI | Only GitHub Actions runs; the values are never logged |
| **Cloudflare Worker secrets** (per script, per env) | `ANTHROPIC_API_KEY`, `CF_ACCT_<id>`, `PIPELINE_SHARED_SECRET` | Dashboard's Settings UI, `wrangler secret put`, the multi-account `+ Add account` form | Only the Worker runtime via `env.X` |
| **External services** | Anthropic console, DataForSEO portal, GitHub PAT | The service owner | The service owner |

A token, once written to a Worker secret, is **unreadable** — Cloudflare's
API only confirms whether it's set, never the value. That's why
"copy prod secrets to staging" cannot be automated; the value has to come
from where the operator originally got it (password manager / service
dashboard).

---

## 11. How to do common operations

| Operation | Where |
|---|---|
| Add a new admin user | Sign in once via Google (prod) or Dev login (staging); the row gets created on first sign-in. Promote via `wrangler d1 execute … --command "UPDATE elite_users SET role='admin' WHERE …"` |
| Add a new Cloudflare account | Dashboard → Settings → Cloudflare Accounts → `+ Add account` |
| Build a new site | Dashboard → `+ New Site` → wizard → Submit → `Start build` |
| Restart a stuck build | Builds page → `restart` button on the row (terminates the workflow, clears stage outputs, kicks a fresh build) |
| Delete a site | Builds/Sites page → `delete` button (wipes D1 rows; leaves Pages + GitHub repo alone) |
| Edit a live site | Sites page → `prompt` button → free-text edit gets applied via the worker's `/custom-prompt` endpoint |
| Deploy dashboard to staging | Auto — every push to `claude/eloquent-volta-wRqZg` triggers it |
| Deploy worker to staging | Auto — same trigger |
| Deploy to prod | Push to `main` on the org repo. **Locked behind explicit human approval right now.** |
| Apply a new D1 migration | `Setup staging` workflow (loops every `migrations/*.sql` with tolerant warn-on-already-applied). For prod: `wrangler d1 execute elite-saas --remote --env en --file migrations/0006_X.sql` |
| Rotate a secret | Dashboard → Settings → `Update` on the row (writes to all bound Worker scripts in one shot) |

---

## 12. Mental model for debugging

When something breaks, the question is always: **where in the chain?**

```
Wizard → /api/wizard/submit → elite_sites row
                ↓
         /api/builds/start → elite_jobs row + POST /trigger
                ↓
         CF Workflow instance → pipeline.run() → 7 stages → elite_stage_outputs
                ↓
         GitHub repo created → committed → site GHA deploys to CF Pages
                ↓
         DNS wired → custom domain attached → live
```

Each arrow can fail independently:

- **Wizard side**: check the browser console / dashboard logs.
- **Worker side**: check Cloudflare Observability for the relevant Worker
  script (`elite-pipeline-workflow-staging` or prod). Logs are enabled on
  staging.
- **Per-site GHA**: check the `fluxgateseo/<domain>` repo's Actions tab.
- **D1 state**: `wrangler d1 execute … --command "SELECT … FROM elite_jobs WHERE domain='…' ORDER BY created_at DESC"`.

`PipelineProgress` in the dashboard reads `elite_stage_outputs`, so failed
stages show their real error text inline.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **Brief** | The JSON blob from the 11-step wizard, stored on `elite_sites.briefJson`. Parsed by the pipeline worker's `parseBrief()` (Zod schema). |
| **Registry account** | A Cloudflare account added via Settings → Cloudflare Accounts. Has a row in `cloudflare_accounts` and a Worker secret `CF_ACCT_<id>` holding its token. |
| **Seeded account** | The legacy IT/EN slots that come from the env vars `CLOUDFLARE_API_TOKEN_IT/EN`. Shown in the UI alongside registry accounts but stored in env, not the registry table. |
| **Account label** | The human-readable name on `elite_sites.account` — `"IT"`, `"EN"`, or any operator-defined string for registry accounts. Drives the tab grouping. |
| **`cf_account_id`** | Pointer to a registry row (the ULID-style id, not the Cloudflare account UUID). Set when the wizard picks a registry account. |
| **`workflowInstanceId`** | The Cloudflare Workflows UUID (e.g. `7995d381-7bbd-4fb5-…`). Different from the job id (a ULID). Set by the dashboard after `triggerPipeline()` returns. |
| **Dry-run** | A build that skips stages 5 (repo create) and 6 (Pages deploy). Used to test stages 1–4 + 7 without burning real GitHub/Cloudflare quota. |
