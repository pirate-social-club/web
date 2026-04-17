# Pirate Social Club Web

Active web UI for Pirate Social Club.

React 19 + Vite + Cloudflare Workers (rwsdk). Tailwind CSS v4 + Radix UI. Bun for installs and scripts.

## Commands

```bash
bun install
bun run types          # typecheck (run first)
bun run locales:generate
bun run dev            # dev server on :5173
bun run test
bun run storybook      # component workspace on :6006
bun run build          # full production build (heavy, avoid by default)
```

See [AGENTS.md](./AGENTS.md) for validation escalation order and style rules.
See [docs/ui-structure.md](./docs/ui-structure.md), [docs/ui-best-practices.md](./docs/ui-best-practices.md), and [docs/ui-maintenance.md](./docs/ui-maintenance.md) for the component structure and maintenance rules.

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
