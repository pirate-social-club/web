# Pirate Social Club Web

Active web UI workspace for Pirate Social Club.

This repository currently centers on the Storybook-driven component and composition work that runs on port `6006`, alongside the supporting source files that will grow into the production web app.

Use Bun for installs and scripts in this repo.

## Commands

```bash
bun install
bun run dev:web
bun run dev:web-local-shell
bun run build:dev
bun run build:staging
bun run build
bun run deploy:dev
bun run deploy:staging
bun run deploy:production
bun run storybook
bun run build-storybook
bun run test
bun run test:web
bun run smoke:onboarding -- --url <api-base-url>
bun run types
```

## Modes

| Mode | Config file | API backend | Intended use |
|---|---|---|---|
| `local-sqlite` | `.env.local-sqlite` | `rtk bun run dev:local-sqlite` on `127.0.0.1:8787` | Default day-to-day development |
| `dev` | `.env.dev` | Remote dev API | Shared Cloudflare dev deployment |
| `staging` | `.env.staging` | Remote staging API | Shared integration testing |
| `production` | deploy-time config | Deployed production API | Real production only |

`dev:web` defaults to `--mode local-sqlite`. `dev:web-local-shell` also defaults to `local-sqlite`.

Do not use `.env.local`. Mode-specific files are the single source of truth.

## Local SQLite Quickstart

Start the API first:

```bash
cd pirate-api/services/api
cp .env.local-sqlite.example .env.local-sqlite
rtk bun run local:reset
rtk bun run dev:local-sqlite
```

Then start the web app:

```bash
cd pirate-web
cp .env.local-sqlite.example .env.local-sqlite
rtk bun run dev:web
```

## Environment

Each mode loads from a mode-specific env file.

| Mode | Config file | API backend |
|---|---|---|
| `local-sqlite` | `.env.local-sqlite` | `rtk bun run dev:local-sqlite` on `127.0.0.1:8787` |
| `dev` | `.env.dev` | Remote dev API |
| `staging` | `.env.staging` | Remote staging API |

Create `pirate-web/.env.local-sqlite`:

```bash
VITE_PIRATE_API_BASE_URL=http://127.0.0.1:8787
VITE_PRIVY_APP_ID=your-privy-app-id
VITE_IPFS_GATEWAY_URL=https://psc.myfilebase.com/ipfs
```

For shared Cloudflare dev, create `pirate-web/.env.dev` from `.env.dev.example` and replace the placeholder API origin with the real deployed dev API URL.
For staging, create `pirate-web/.env.staging` from `.env.staging.example`.

`.env.production.example` is included only as a reference for the required client keys. Production env should come from deploy-time config, not a committed local file, and the example file is not proof of the live production API origin.

When running `dev:web`, pass `--mode dev` or `--mode staging` to target a remote API.

## Cloudflare Deploy Targets

Cloudflare Workers uses explicit worker names for each deploy target:

- `pirate-web-dev`
- `pirate-web-staging`
- `pirate-web`

Public `VITE_*` values come from the Vite mode env files at build time, not from Wrangler runtime vars. The deploy scripts build first, then deploy the generated `dist/worker/wrangler.json` to the target worker name:

```bash
rtk bun run deploy:dev
rtk bun run deploy:staging
rtk bun run deploy:production
```

The staging site is expected to talk to `https://api-staging.pirate.sc`, and that value should come from `.env.staging` during the `build:staging` step.

For dev and production, this repo does not pin a single live API origin. Those values must come from the actual environment-specific config used during the build.

## Onboarding Smoke

For post-deploy onboarding route checks, run:

```bash
cd pirate-web
rtk bun run smoke:onboarding -- --url <api-base-url>
```

Use `--token <pirate-access-token>` for the deeper authenticated read-only check. See [docs/runbooks/onboarding-reddit-deploy-smoke-checklist.md](../docs/runbooks/onboarding-reddit-deploy-smoke-checklist.md).

## Notes

- `bun run storybook` runs the active UI workspace on `http://localhost:6006`
- `bun run dev:web-local-shell` is a temporary fallback for local route testing when the RWSDK Worker
  path is unhealthy; it is not the intended production runtime. It uses `--mode local-sqlite` by default.
- if the API says `missing communities table` or `missing community DB root`, fix the API first with `rtk bun run local:reset`
- `storybook-static/` is generated output from `build-storybook` and is ignored
- `debug-storybook.log` is local debug output and is ignored

## License

Licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).
