# Deploy

## Canonical Validation

Run this before any deploy:

```bash
rtk bun run validate
```

## Main Worker

The main worker must be deployed from the built artifact, not from the generated
`dist/worker/wrangler.json`.

Use:

```bash
rtk bun run deploy:main:staging
rtk bun run deploy:main
```

These commands:

- verify the required production Vite env is present
- build with `vite build`
- deploy `dist/worker/index.js`
- use the checked-in [`wrangler.jsonc`](../wrangler.jsonc)
- attach `dist/client` assets
- pass `--no-bundle`

Required client env for the main production build:

```bash
VITE_PRIVY_APP_ID
VITE_PRIVY_CLIENT_ID
```

These are read at Vite build time and baked into the browser bundle. A deploy
machine without them will produce a client where Connect is disabled.

Do not use this for the main worker:

```bash
rtk ./node_modules/.bin/wrangler deploy --env staging
```

That path can pick up the generated `dist/worker/wrangler.json` and publish the
wrong routes.

## Public Worker

Use:

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
  - production: `pirate.sc/u/*`
  - staging: `staging.pirate.sc/u/*`
