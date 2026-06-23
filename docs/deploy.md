# Deploy

## Release Workflow

Production deploys should go through the Blacksmith GitHub Actions workflow in
`.github/workflows/release.yml`.

> **⚠️ Known blocker (web prod auto-deploy broken since ~2026-06-05):** the Release
> workflow fails at *Deploy staging → Install API dependencies* because
> `api/services/api/package.json` pins `@pirate/karaoke-runtime` to a `file:` path
> into the `web-karaoke-rel` dev worktree, which CI does not check out (CI only fetches
> `web`, `api`, `core`). Prod is stuck at the Jun-5 build until the canonical home for
> `@pirate/karaoke-runtime` is decided. Do **not** manual-bypass `wrangler deploy` for
> web prod — it skips the release gates. See pirate-social-club/web#39.

The release workflow:

- deploys staging
- verifies staging/production metadata
- runs the existing HTTP smoke check
- installs Chromium for Playwright
- runs the blocking browser E2E suite against `https://staging.pirate.sc`
- runs the non-blocking live staging browser integration
- applies staging community migrations
- deploys production only after the staging job succeeds

The blocking browser suite is deterministic and uses mocked authenticated API
responses where needed. The live staging integration uses real staging services:
it exchanges a JWT-based session, creates a real staging post, and adds a real
comment in the seeded `MCP Guest Comment Smoke` community.

Required GitHub Actions variables for the live staging check:

```bash
AUTH_UPSTREAM_JWT_AUDIENCE
AUTH_UPSTREAM_JWT_ISSUER
```

Required GitHub Actions secret for the live staging check:

```bash
AUTH_UPSTREAM_JWT_SHARED_SECRET
```

`AUTH_UPSTREAM_JWT_SHARED_SECRET` is sourced from Infisical staging
`/services/api` during setup or rotation. The staging issuer/audience values are
public JWT claims and should be stored as GitHub Actions variables:

```bash
AUTH_UPSTREAM_JWT_ISSUER=pirate-staging-upstream
AUTH_UPSTREAM_JWT_AUDIENCE=pirate-api-staging
```

## Validation

Production deploys normally rely on the release workflow validation. For local preflight, prefer focused checks first:

```bash
rtk bun run types:safe
rtk bun run ui:audit
rtk bun test path/to/touched.test.tsx
```

The broad validation script remains available when CI-parity is explicitly needed:

```bash
rtk bun run validate
```

## Main Worker

The main worker must be deployed from the built artifact, not from the generated
`dist/worker/wrangler.json`.

For manual operator deploys only, use:

```bash
rtk bun run deploy:main:staging
rtk bun run deploy:main
```

These commands:

- verify the required staging/production Vite env is present
- build with `vite build`
- deploy `dist/worker/index.js`
- use the checked-in [`wrangler.jsonc`](../wrangler.jsonc)
- attach `dist/client` assets
- pass `--no-bundle`

Required client env for the main staging build:

```bash
VITE_PRIVY_APP_ID
```

Required client env for the main production build:

```bash
VITE_PRIVY_APP_ID
VITE_PRIVY_CLIENT_ID
```

These are read at Vite build time and baked into the browser bundle. A deploy
machine without `VITE_PRIVY_APP_ID` will produce a client where Connect is
disabled. Staging intentionally omits `VITE_PRIVY_CLIENT_ID` so Privy uses the
app-level allowed origins, including `https://staging.pirate.sc`; the staging
build and deploy scripts force this value empty even when a local `.env.local`
contains a production client id.

GitHub Actions reads these values from `VITE_PRIVY_APP_ID` and, for production
only, `VITE_PRIVY_CLIENT_ID` repository or organization secrets/variables.

Required API staging secrets:

```bash
OPENROUTER_API_KEY
PRIVY_APP_ID
PRIVY_APP_SECRET
```

The staging deploy script checks these Cloudflare Worker secrets before
deploying `api-staging.pirate.sc`; missing Privy API bindings break
`/auth/session/exchange` after the web OTP flow completes.

API endpoint selection is host-based at runtime:

- `staging.pirate.sc` uses `https://api-staging.pirate.sc`
- `pirate.sc` and `www.pirate.sc` use `https://api.pirate.sc`
- local hosts use `VITE_PIRATE_API_BASE_URL` when set, otherwise `http://127.0.0.1:8787`

Do not use this for the main worker:

```bash
rtk ./node_modules/.bin/wrangler deploy --env staging
```

That path can pick up the generated `dist/worker/wrangler.json` and publish the
wrong routes.

## Public Worker

For manual operator deploys only, use:

```bash
rtk bun run deploy:public:staging
rtk bun run deploy:public
```

The public worker deploys from [`wrangler.public.jsonc`](../wrangler.public.jsonc)
directly.

## Route Split

- Main worker:
  - production: `pirate.sc/*`
  - staging: `staging.pirate.sc/*`
- Public worker:
  - native Handshake profile hosts only, for example `name.pirate`
  - `/u/*` on `pirate.sc` and `staging.pirate.sc` stays on the main app worker
