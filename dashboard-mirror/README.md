# dashboard-mirror/

Working **copies** of product code that normally lives in sibling repos
out of this session's push-scope (`andreabbo/*`). Mirrored here, on owner
request (2026-05-25), so the dashboard can be worked on from a META-only
session without re-uploading a zip each time (uploads are ephemeral).

**Not the source of truth.** The canonical repo is still
`andreabbo/elite-saas`. Treat this as a snapshot + working tree:
- Changes made here must be synced back to `andreabbo/elite-saas` (the
  owner pulls/applies and deploys — see that repo's deploy flow).
- `node_modules/` and build dirs (`.next`, `.open-next`, `dist`) are not
  committed; run `pnpm install` before `tsc`/build.
- The nested `.github/workflows/` does **not** run as META CI (GitHub only
  triggers workflows at the repo root).

## elite-saas/

Snapshot of the `elite-saas-main` upload **with the fix-stage chat
applied** (see `docs/dashboard-fix-stage-chat.md`): `api/builds/fix-stage`
proxy, `FixStageButton`, `SitesTable` wiring, it/en i18n. Verified
`tsc --noEmit` clean + 48/48 vitest at copy time.

To work on it:
```
cd dashboard-mirror/elite-saas
pnpm install
npx tsc --noEmit
```
Deploy is still an owner action against the real account (OpenNext build +
`wrangler deploy` per `docs/infrastructure.md`).
