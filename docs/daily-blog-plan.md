# Daily blog automation — design & plan

**Status:** Proposed. Will be built and validated on **staging** only. Prod
enablement (across the current 9 live sites + any future ones) is gated by
an explicit human "push to production" instruction.
**Branch:** `claude/eloquent-volta-wRqZg`
**Companion to:** `project-overview.md`, `multi-account-registry-plan.md`

## The ask

Once a day, for every `elite_sites` row with `status = 'live'`, generate and
autopublish one blog post that is:

- SEO-optimized (short + medium long-tail keywords chosen for the topic)
- AEO-optimized (question-shaped headings, TL;DR, FAQPage + Article
  JSON-LD schema)
- 600–1500 words, length picked from lightweight SERP analysis and topical
  relevance
- Contains an FAQ block (3–6 Q&A) inserted mid-article
- Contains 3–6 internal links to that site's most-important existing pages
- Published in the site's own language (Italian for `.it`/`.eu` sites,
  English for `.com`/`.com.au`/`.co.uk`)

## Decisions (locked in from operator answers)

| # | Question | Answer |
|---|---|---|
| 1 | Which sites? | **All** `status = 'live'`, both Italian and English fleets |
| 2 | Topic + keyword source | **Claude web-search** — no DataForSEO calls. Short + medium long-tail keywords chosen per topic |
| 3 | Publish flow | **Autopublish** — no manual review gate |
| 4 | Word count | **600–1500**, decided per-post from SERP analysis + topical relevance |

## Architecture

A new Cloudflare Workflow class `DailyBlogWorkflow` inside
`elite-pipeline-workflow`, cron-triggered at 08:00 UTC. Iterates every live
site; each site's post is one workflow instance so a failure on one site
doesn't kill the fleet.

### Per-site stages

| Stage | Does what | Cost source |
|---|---|---|
| **1. Recent-posts fetch** | Query `elite_blog_posts` for this domain to avoid retreating recent topics. Also fetch the site's existing pages via GitHub API (for step 3 + 5). | D1, GitHub |
| **2. Topic pick** | Claude call with the site's brief (industry, subCategory, voice, city) + list of last ~20 topics + Claude web-search enabled. Output: `{topic, angle, target_intent, language}` — one topic distinct from recent ones. | Anthropic (web-search) |
| **3. SERP + keyword research** | Second Claude call: web-search the topic, read top 5–10 SERP results, extract common H2s, questions, entity coverage. Output: `{primary_kw, long_tail_kws[], mean_word_count, must_cover_entities[], must_answer_questions[]}`. `word_count_target = clamp(mean_word_count × 1.15, 600, 1500)`. | Anthropic (web-search) |
| **4. Internal-link map** | Rank the site's existing pages by "importance" (homepage + Step-9 main pages + category pages first), keep top ~10. Pass to the writer so it can weave 3–6 contextual links in. | (local, free) |
| **5. Draft** | Claude call: write the article body in the site's language, matching Step-8 voice. Structure: intro → 3–5 H2 sections (question-shaped where natural) → FAQ block (3–6 Q&A pulled from `must_answer_questions`) → conclusion. Word count from stage 3. | Anthropic |
| **6. AEO polish** | Second-pass Claude call: add JSON-LD (Article + FAQPage schemas), TL;DR paragraph at the top, ensure canonical link points to the final URL, insert missing internal links from the ranked list. | Anthropic |
| **7. Commit + record** | Commit `src/pages/blog/<slug>.mdx` (or the site template's blog dir) + update `blog/index.astro` list. Insert row in `elite_blog_posts`. | GitHub API, D1 |

The site's own GHA workflow then fires on push → CF Pages redeploys → post
is live within ~90 seconds.

### Failure isolation

Each site is one workflow instance. Errors are recorded in
`elite_blog_posts.status = 'error'` with the message — dashboard surfaces
them under a new "Blog Automation" section. Other sites keep going.

### Cost estimate

- Anthropic: ~4 calls per post (~15K in / ~4K out) × ~30¢ per site per day
- DataForSEO: **zero** (per operator decision #2)
- GitHub API + CF Pages: free

**≈ ~$100/month for the current 9-site fleet.** Linear per new site.

## Data model

New migration `migrations/0006_blog_posts.sql` (idempotent, `IF NOT EXISTS`):

```sql
CREATE TABLE IF NOT EXISTS elite_blog_posts (
  id                   TEXT PRIMARY KEY,       -- ulid
  domain               TEXT NOT NULL REFERENCES elite_sites(domain),
  slug                 TEXT NOT NULL,
  topic                TEXT NOT NULL,
  primary_kw           TEXT,
  long_tail_kws_json   TEXT,                    -- string[]
  word_count           INTEGER,
  language             TEXT NOT NULL,           -- 'it' | 'en'
  status               TEXT NOT NULL,           -- 'draft' | 'published' | 'error'
  error                TEXT,
  commit_sha           TEXT,
  live_url             TEXT,
  generated_at         INTEGER NOT NULL,
  published_at         INTEGER,
  UNIQUE (domain, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_domain_generated
  ON elite_blog_posts (domain, generated_at DESC);
```

Mirror the drizzle entry in both repos.

## Cron trigger

`wrangler.toml` (both env.staging AND env.en once we promote):

```toml
[triggers]
crons = ["0 8 * * *"]   # 08:00 UTC daily
```

Env is set on the pipeline worker. Handler:

```ts
scheduled(event, env) {
  return env.PIPELINE_DAILY_BLOG.create({ params: { runId: ulid() } });
}
```

The `DailyBlogWorkflow.run()` selects live sites, then for each site
`env.PIPELINE_DAILY_BLOG_ONE_SITE.create({ params: { domain } })` — one
sub-instance per site so one site's failure is isolated. Staging cron is
enabled first; prod cron is added only after promotion.

## Dashboard UI (Phase 3)

New nav item **Blog** with three views:

- **Feed** — chronological list of last ~50 posts across all sites, each
  showing status, word count, primary keyword, live URL, and a "regenerate"
  button
- **Per-site config** — toggle enable/disable, override cron, force-run
  now
- **Errors** — sites whose last N attempts failed, with the message

Autopublish is on by default (per operator answer #3), but the per-site
toggle can flip it off for a specific site if a run misbehaves.

## Phasing

- **Phase 1 (staging validation)** — migration + schema in both repos +
  `DailyBlogWorkflow` scaffold. **Cron off**; manual trigger via a new
  `/api/blog/run-now?domain=…` endpoint. Test on one staging site.
- **Phase 2 (fleet on staging)** — add cron trigger (staging only),
  autopublish on, verify all staging-visible sites get a post per day for
  3 consecutive days without error.
- **Phase 3 (dashboard UI)** — Blog nav item, feed, per-site toggle, error
  view.
- **Phase 4 (prod)** — operator says "push to prod", enable staging cron on
  prod worker, monitor first week.

## Safety properties

- Every write goes through `elite_blog_posts` first so the operator can
  audit the fleet at any time.
- Per-site failure isolation: one site erroring never blocks the others.
- The commit path is the same one `/custom-prompt` already uses — no new
  GitHub auth surface.
- Prod worker's `[triggers]` block is **not** modified until the operator
  explicitly authorizes it. Even after Phase 4 code ships, without the
  trigger block in prod's `env.en`, no cron fires there.

## What this plan does NOT do

- No image generation for blog posts (out of scope — sites use their
  existing image bank; Phase 5 might add per-post images later)
- No topic queue / editorial calendar UI (Phase 2 could add one if
  autopublish surfaces quality issues)
- No cross-site content dedup (each site's blog is independent)
- No touching the current prod deploy pipeline
