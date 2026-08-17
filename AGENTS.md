# Pirate Web — Agent Notes

## Repository Boundary

`/run/media/x42/codedrive/Code/pirate-workspace` is a workspace directory, not this Git repo. This repo root is `/run/media/x42/codedrive/Code/pirate-workspace/web`.

Run web git commands from this directory. The sibling `api/` and `core/` directories are separate Git repositories and must be committed independently.

## Default Checks

Use the cheap gate first:

```bash
bun run types:safe
bun run ui:audit
```

Use `bun run types:safe` instead of `bun run types` for routine local verification. It uses the TypeScript 7 native preview compiler (`tsgo`) with incremental build info, bounded memory, and lower process priority so it is less likely to stall the machine. Use `bun run types` only when exact uncapped CI parity is required.

Do not use bare `bun test` as the repository-wide gate. It collects Playwright specs and runs unit files in one shared process, while `.github/workflows/web-ci.yml` deliberately limits discovery to `src/` and `packages/` and isolates each test file across four shards. Run focused files locally with `bun test path/to/file.test.ts`; rely on `web-ci` for the full unit/component suite.

Storybook is safe to run locally after the watcher exclusions in
`.storybook/main.ts`. Those exclusions must stay in `viteFinal`: Storybook's
Vite builder can replace `server.watch` after loading the standalone Vite
config, which previously caused Vite to watch the hundreds of nested checkouts
under `.tmp/` and `worktrees/` and retain 3–5 GB RSS.

Use focused discovery for routine component work:

```bash
env STORYBOOK_ONLY=components/primitives bun run storybook
```

The path is relative to `src/`. Use `bun run storybook` when the full local
catalog is genuinely useful. Keep one foreground instance on port 6006, never
detach or auto-restart it, and stop it when verification is complete. Before
starting, verify port 6006 is free and avoid overlapping Storybook with builds,
broad checks, or other heavy processes.

For a shareable static catalog or CI-parity build, push the intended ref and
run the optional remote artifact workflow:

```bash
gh workflow run storybook-artifact.yml --ref <pushed-ref> -f storybook_only=components/primitives
```

Monitor the run to completion and download its `storybook-static-<run-id>`
artifact. Leave `storybook_only` empty for the full catalog. The input takes a
path relative to `src/` (for example `components/compositions/wallet`). This
remote workflow is a fallback, not a prerequisite for local Storybook use.

Supplement story verification with focused component tests,
`bun run types:safe`, and `bun run ui:audit`. Avoid `bun run build`
unless a full production build is explicitly required.

Value-import `@web3icons/react` icons via per-icon subpaths (`@web3icons/react/icons/tokens/TokenBTC`), never the package root barrel — the barrel alone produced a ~31 MB prebundle (~38 MB source map) during Storybook startup. Root type-only imports are safe because Vite erases them before dependency scanning.

## Branch Workflow

Feature work lands on a branch and merges via pull request; do not commit
directly to `main`. Production releases go through the release branch and the
`release.yml` workflow (see Deployment).

## Deployment

Production web deploys must go through the Blacksmith GitHub Actions release workflow in `.github/workflows/release.yml`. Do not run `bun run build:prod`, `bun run deploy:main`, `bun run deploy:public`, `wrangler deploy`, or `scripts/deploy-production.sh` locally for production unless the user explicitly asks for that exact local deploy/build command after being told the CI workflow is the normal path.

For production-ready changes, commit and push to the release branch, then use or instruct the user to use the `release.yml` workflow. Local verification should stay to focused tests, `bun run types:safe`, and other cheap checks unless the user explicitly requests a local production build.

The release workflow first checks the pinned API/Core pair and the live community
schema fleet, then deploys staging. The Web release gate and API-owned staging
contract gate run in parallel; both block production. Production re-checks
freshness and the production schema fleet immediately before deploying.

Read [`docs/release-pipeline.md`](docs/release-pipeline.md) before changing or
re-running the workflow. In particular:

- Re-run a failed community-schema gate only when its SHA is still the current
  `main` tip. An old re-run shares the cancellable schema-scan group and can
  cancel the tip run.
- A skipped production job is not a deployment. After success, inspect the
  individual jobs and verify `https://pirate.sc/__version` and
  `https://api.pirate.sc/__version`.
- Before interpreting a cancelled run as supersession, confirm that the
  `Release` workflow is enabled. A manually disabled workflow is an explicit
  operator pause; re-enabling it does not replay missed pushes.
- Do not push a no-op commit merely to retry or measure a gate. Let the next
  natural release provide the sample unless a real deployment is required.

## Browser Automation

- Use `agent-browser` only when visual/browser verification is needed and code inspection or unit tests are insufficient.
- Keep at most one `agent-browser` session active for this repo. Do not open multiple tabs/sessions or run `agent-browser` commands in parallel.
- Serialize all open/wait/snapshot/screenshot/click actions. Take one snapshot or screenshot after the page is loaded, then inspect code locally before deciding whether another browser action is necessary.
- Before starting a permitted dev server or browser session, check existing processes with `ps -ef` or `pgrep -af "storybook|vite|wrangler|next|6006|5173|8787"`.
- Local Storybook is permitted under the Storybook rules above. Use only one browser session, and close both the session and Storybook when verification is complete.
- If another desired dev server is already running, use the existing URL. Do not start a second instance or switch ports merely because the default port is occupied unless the user explicitly asks for a separate server.
- Do not run browser automation while any permitted build, full typecheck, or other heavy command is running unless the user explicitly asks for that tradeoff.
- Stop any permitted dev server or browser session started for the task when it is no longer needed. Never detach it or leave it for another agent session.

## UI Rules

- Do not use `text-xs` or `text-sm` in app UI or stories.
- Do not add explanatory helper copy when a label or control already carries the decision value.
- Do not use badge/pill UI for inline status.
- Prefer icon-only circle buttons for obvious tool actions.
- Keep steppers above the card, not inside it.

## Typography Rules

- Use the `Type` primitive for all text surfaces. Do not freestyle `text-*`, `font-*`, `leading-*`, or `tracking-*` utilities directly in compositions or pages.
- Allowed type variants: `display`, `h1`, `h2`, `h3`, `h4`, `body`, `body-strong`, `label`, `caption`, `overline`.
- Do not use arbitrary font sizes (`text-[...]`), arbitrary leading (`leading-[...]`), or arbitrary tracking (`tracking-[...]`).
- Do not use hardcoded Tailwind palette colors for text (`text-amber-700`, `text-green-600`, `text-blue-500`, etc.). Use semantic tokens (`text-warning`, `text-success`, `text-info`).
- Body text is always `text-base` (16px). No exceptions.

## Color Theme Rules

- Use semantic color tokens only (`bg-primary`, `text-muted-foreground`, `border-border-soft`, `shadow-lg`, etc.).
- No hardcoded hex/rgb/hsl in component markup or inline styles. Exception: standalone generated strings (OG images, SVGs, mock data).
- No arbitrary color values (`bg-[...]`, `text-[...]`, `border-[...]`, `shadow-[...rgba(...)]`) except CSS variable references (`var(--sidebar-width)`).
- Use `bg-primary-subtle` for low-tint primary backgrounds instead of `bg-[color-mix(...)]`.
- Use shadow tokens (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`) instead of one-off `rgba(...)` shadows.

## Spacing Rules

- Prefer standard Tailwind spacing scale over arbitrary values (`w-48` instead of `w-[12rem]`, `max-w-5xl` instead of `max-w-[64rem]`).
- Use semantic radius tokens (`rounded-[var(--radius-lg)]`, `rounded-[var(--radius-xl)]`, etc.) instead of arbitrary `rounded-[1.75rem]` or `rounded-[28px]`.
- Use `--header-height` CSS variable for chrome dimensions (`h-[var(--header-height)]`, `top-[var(--header-height)]`).
- 1px dividers use `h-px` / `w-px`, not `h-[1px]` / `w-[1px]`.
- Exceptions that may remain arbitrary: viewport calculations (`calc(100dvh - ...)`), safe-area insets (`env(safe-area-inset-bottom)`), character-based widths (`max-w-[72ch]`), and third-party embed dimensions.

## Storybook Coverage

- Primitive: default plus meaningful variants.
- Form/control: default, disabled, error, and mobile where layout can change.
- Composition/flow: default, loading, error or empty, and mobile.
- RTL stories are required only when text direction can change layout.
- Migration batches are counted by distinct rendered states, not export-name
  parity. Do not satisfy coverage by aliasing one `Story` object to another;
  each exported story must render a distinct state or interaction.
- Every exported primitive must have a same-name `.stories.tsx`; `bun run ui:audit` enforces this for React primitives and Solid design-system entry modules.
- `bun run ui:audit` ratchets raw typography utilities in the Solid roots by file; refresh the committed baseline only after an intentional burn-down with `bun run ui:audit:typography-baseline`.

## Code Quality

- Do not keep dead exports or story-only primitive wrappers.
- Extract shared layout/state helpers on the second real caller.
- Avoid compatibility shims unless they have an owner, a removal condition, and a dated TODO.
- Generated locale output and vendor crypto/ABI files are exempt from size cleanup.
- Split large product compositions on next meaningful touch when review becomes hard.
