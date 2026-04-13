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

## License

Licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).
