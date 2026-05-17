# Prompts

This directory holds two distinct things:

- **Render-job templates** (this file's subject) — `<name>.prompt.md`
  files consumed by the Drive render pipeline (`content/queue.json` →
  `manifest.json`).
- **`design-skills/`** — the 4 visual-language bundles selectable in
  wizard Step 7 (`minimalist`, `brutalist`, `soft-premium`, `emil-eng`).
  These are pipeline contracts, **not** render-job templates and do **not**
  use `{{var}}` substitution. See `design-skills/README.md`.

The conventions below apply to render-job templates only.

## Render-job templates

Reusable prompt templates for render jobs.

## Conventions

- One template per file, named `<name>.prompt.md`.
- A job references a template by its `<name>` (the filename without the
  `.prompt.md` suffix) in `prompt.template`.
- Use `{{var}}` placeholders for everything job-specific. The renderer
  substitutes them from the job's `prompt.vars` object.
- Placeholder names should be lowercase and descriptive, e.g.
  `{{headline}}`, `{{brand}}`, `{{call_to_action}}`.

## Hard rules

- **No secrets.** No API keys, tokens, or credentials in templates.
- **No Drive paths or file IDs.** Templates describe *what* to generate;
  storage location is decided by the upload step, not the prompt.
- Keep templates text-only — binaries live in Drive, never here.

## Example

`hero-clip.prompt.md`

```
A cinematic {{duration}}s product hero shot of {{product}} for the
{{brand}} brand. Mood: {{mood}}. End on the tagline "{{tagline}}".
```

A job using it:

```json
{
  "prompt": {
    "template": "hero-clip",
    "vars": {
      "duration": 8,
      "product": "the X1 headset",
      "brand": "Elite",
      "mood": "premium, calm",
      "tagline": "See further."
    }
  }
}
```
