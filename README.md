# Pirate Web

Active web UI for Pirate.

React 19 + Vite + Cloudflare Workers (rwsdk). Tailwind CSS v4 + Radix UI. Bun for installs and scripts.

## Commands

```bash
rtk bun install
rtk bun run types:safe     # preferred local typecheck on weak machines (TS7 tsgo)
rtk bun run ui:audit       # component hygiene, layout rules, and stale-marker checks
rtk bun run locales:generate
rtk bun test path/to/file.test.tsx
rtk bun run test:e2e              # Playwright browser suite, defaults to local base URL
rtk bun run test:e2e:staging      # Playwright browser suite against staging
rtk bun run test:e2e:live-staging # real staging JWT session + post/comment flow
rtk bun run types                 # uncapped typecheck; use only when CI parity matters
rtk bun run build                 # full production build; heavy, avoid by default
rtk bun run validate              # broad pre-deploy validation; heavy
```

See [AGENTS.md](./AGENTS.md) for validation escalation order and style rules.
See [docs/ui-structure.md](./docs/ui-structure.md), [docs/ui-best-practices.md](./docs/ui-best-practices.md), and [docs/ui-maintenance.md](./docs/ui-maintenance.md) for the component structure and maintenance rules.
See [docs/deploy.md](./docs/deploy.md) for the canonical main/public worker deploy commands.

## Browser E2E

The Playwright suite lives in [`e2e/`](./e2e). The default project is deterministic and safe for CI: it checks public staging routes, authenticated app shells, mocked authenticated mutation flows, thread comments, and mobile layout without mutating real backend data.

`bun run test:e2e:live-staging` is the Tier 3 staging integration check. It exchanges a real staging JWT session, opens the deployed browser app, creates a real post, and adds a real comment in the seeded staging smoke community. CI reads its JWT values from GitHub Actions secrets; `AUTH_UPSTREAM_JWT_SHARED_SECRET` should be copied from Infisical staging `/services/api` whenever that secret is rotated.

`bun run test:zkpassport:staging` is the ZKPassport staging smoke harness. Run it with staging `/services/api` secrets injected, for example:

```bash
rtk env infisical run --project-config-dir ../core --env staging --path /services/api -- \
  bun run test:zkpassport:staging
```

Set `ZKPASSPORT_SMOKE_START_ONLY=1` to prove staging auth exchange, ZKPassport session creation, launch payload construction, and SDK request URL generation without waiting for a proof. Full completion still requires the printed URL to be opened by the ZKPassport app or a ZKR/dev proof source. Opening that URL in a normal desktop browser only shows the ZKPassport download page and does not emit SDK proof/result callbacks.

For dev-mode proofs, follow the official ZKPassport dev-mode docs to enable mock IDs in the mobile app: https://docs.zkpassport.id/getting-started/dev-mode. Those docs state that all mock passport proofs use unique identifier `1`; the smoke script therefore defaults to a stable subject so repeated runs bind to the same staging user instead of accidentally testing cross-user nullifier conflicts.

Do not start `rtk bun run dev`, `rtk bun run storybook`, or worker dev servers from an agent session unless the user explicitly asks for that exact server. If visual verification is needed, use an already-running server.

## Source Layout

- `src/app/` — pages, router, document shell
- `src/components/` — shared UI components
- `src/hooks/` — React hooks
- `src/lib/` — shared utilities
- `src/locales/` — i18n translation files
- `src/styles/` — global CSS

## Network Config

`src/lib/network-config.ts` is the checked-in environment matrix for Base, Story, and EFP.

Optional overrides:

- `VITE_PIRATE_APP_ENV` — `dev`, `staging`, or `prod`
- `VITE_BASE_NETWORK` — `base-sepolia` or `base-mainnet`
- `VITE_STORY_NETWORK` — `story-aeneid` or `story-mainnet`
- `VITE_BASE_MAINNET_RPC_URL`, `VITE_BASE_SEPOLIA_RPC_URL`
- `VITE_STORY_MAINNET_RPC_URL`, `VITE_STORY_AENEID_RPC_URL`
- `VITE_EFP_ENVIRONMENT` — `mainnet` or `testnet`
- `VITE_EFP_API_URL` — override the default EFP API/indexer URL

## License

Licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).
