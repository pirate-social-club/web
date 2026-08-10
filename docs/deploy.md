# Deploy

## Release Workflow

Production deploys should go through the Blacksmith GitHub Actions workflow in
`.github/workflows/release.yml`.

> **Release safety:** do not manually deploy Web production with
> `wrangler deploy`. Production must advance through `Release`, which enforces
> release-input compatibility, fleet-schema attestation, staging smoke,
> API-owned live contracts, migration, freshness, and production verification.
> Read [`release-pipeline.md`](release-pipeline.md) for the current topology and
> incident rules.
>
> The former karaoke-runtime install blocker is resolved: the API uses
> `file:../../../web/packages/karaoke-runtime`, and the workflow checks out `web`,
> `api`, and `core` as sibling directories so that cross-repository file dependencies
> resolve during `bun install`. Treat the current Release run and its individual job
> results as the authoritative deployment status.

The release workflow:

- verifies the pinned API/Core pair and migration classifications
- cancels obsolete staging schema scans; writer-epoch fencing keeps their
  shadow-ledger invalidation fail-closed
- verifies the live staging community fleet before deploying the pinned API
- serializes and deploys staging with an in-lane freshness check
- runs the deterministic Web release gate and blocking API-owned staging
  contract gate in parallel
- re-checks the current `main` tip and production schema fleet
- serializes the production deploy, applies control-plane migrations, and
  verifies production release metadata

The Web browser suite is deterministic and uses mocked authenticated API
responses where needed. The API-owned contract gate uses real staging services
and persistent fixtures. It inventories the selected tests before executing
exactly six live contracts and three mobile non-member contracts.

A successful aggregate workflow is not sufficient evidence by itself. Inspect
the individual `Deploy production` job, then verify:

```bash
rtk curl -sS https://pirate.sc/__version
rtk curl -sS https://api.pirate.sc/__version
```

If production was skipped because a live successor existed, that successor is
responsible for deployment. If no live successor remains, the validated older
run may deploy only when it is still on `main`'s ancestry and moves production
forward. The freshness decision fails closed when run, deployment, or ancestry
state cannot be established.

A manually disabled `Release` workflow is an operator pause, not a successful
or superseded release. Re-enabling it does not replay pushes received while it
was disabled. To deploy the current tip after a pause, dispatch `Release` from
`main` with `deploy_production: true`, then inspect the production job and both
version endpoints as usual.

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

Required main Web Worker production secret:

```bash
HNS_FORWARDER_HMAC_KEY
```

The release script checks this binding before deploying. During the initial
gateway compatibility window, `HNS_FORWARDER_AUTH_TOKEN` may also be present;
it is deliberately optional so its scheduled removal does not require a code
change. `HNS_FORWARDER_HMAC_PREVIOUS_KEY` is optional during key rotation.
Trusted ingress IPs and maximum clock skew are non-secret values declared in
`wrangler.jsonc` and reflected in the generated Worker environment types.

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
