# elite-saas

Tiered SaaS dashboard (free/member/admin) for generating Italian lead-gen sites from expired domains. Public signup via Google OAuth + magic link. Conference-demo-friendly.

Sibling repo: `andreabbo/elite-pipeline-dashboard` (internal agency tool, NOT for public).

## Local dev

```bash
pnpm install
pnpm dev
# Cloudflare bindings (D1, R2, KV) are not available without `wrangler dev`.
# For schema/UI work, `pnpm dev` is enough.
```

## Tests

```bash
pnpm vitest run
```

## Deploy

Push to `main` triggers GitHub Actions -> wrangler builds + deploys via OpenNext.
**Requires real `CLOUDFLARE_API_TOKEN` GH secret** + real D1/KV IDs in `wrangler.toml`.
