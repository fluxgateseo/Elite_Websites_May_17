# impeccable (non-preset critique / polish overlay)

**Source:** `pbakaus/impeccable` — `/skill/SKILL.md` + 7 reference docs.
Repo: https://github.com/pbakaus/impeccable

Not a selectable visual language and **not** a `data-skill` preset.
`impeccable` is a vocabulary + audit system ("1 skill, 23 commands, and
curated anti-patterns for impeccable frontend design"). It builds on
Anthropic's `frontend-design` (per its NOTICE.md) and is the second
non-preset quality layer alongside it.

## How we use it

Run as a **critique/polish overlay via `/custom-prompt`** on an already
generated site, not in the pipeline's generation path. Example prompt:
"polish typography + spacing per impeccable rules". Future work: surface
specific commands as dedicated dashboard actions.

## Reference domains (7)

`typography.md`, `color-and-contrast.md`, `spatial-design.md`,
`motion-design.md`, `interaction-design.md`, `responsive-design.md`,
`ux-writing.md`. Read upstream for detail; treat as the rubric a
finished site is checked against.

## The 23 commands (`/impeccable <command>`)

Build/shape: `craft`, `teach`, `document`, `extract`, `shape`.
Review: `critique` (UX review), `audit` (a11y/perf/responsive),
`polish` (ship-readiness).
Adjust intensity: `bolder`, `quieter`, `distill`, `overdrive`.
Targeted fixes: `harden`, `onboard`, `animate`, `colorize`, `typeset`,
`layout`, `delight`, `clarify`, `adapt`, `optimize`, `live`.

Most relevant to this pipeline: `audit`, `critique`, `polish`,
`typeset`, `layout`, `colorize` — all runnable as post-generation
`/custom-prompt` passes.

## Anti-patterns (27 deterministic rules)

Overlaps and reinforces `frontend-design`'s bans: overused fonts
(Arial/Inter/system), gray text on colored backgrounds, pure black/gray
(tint instead), excess card nesting, bounce/elastic easing. Use these as
hard fails in any polish pass.

## Relation to the footprint goal

Because `bolder`/`quieter`/`distill`/`live` shift a site's intensity
per-instance, impeccable is a lever for **de-duplicating** generated
sites (see the design-diversity / anti-footprint note in
`prompts/design-skills/README.md`), not just a QA tool.
