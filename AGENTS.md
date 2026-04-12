# Pirate Web — Repo Workflow

Follow the root [AGENTS.md](../AGENTS.md) for workspace ownership, repo boundaries, GitButler rules, and machine-safety constraints.
Use this file for `pirate-web`-specific validation and CI workflow.

## Daily Flow

1. create the task branch with `but branch new <task-slug>`
2. make the smallest relevant change set
3. run the lightest local check that matches the change
4. if `.github/workflows/web-ci.yml` exists on the current branch, run it locally with `agent-ci`
5. commit with `but commit -m "<message>"`
6. push for review and remote validation

## Local Checks

Prefer this order for frontend verification:

- `rtk bun run types`
- `rtk bun run locales:generate`
- `rtk ./node_modules/.bin/vite build --ssr src/worker.tsx --minify false --sourcemap false`
- `rtk ./node_modules/.bin/vite build --minify false --sourcemap false` only when a full client asset build is truly needed

Do not default to `rtk bun run build`. It is heavier than the targeted SSR check and can freeze the machine.

## Local CI

When the repo contains a real workflow at `.github/workflows/web-ci.yml`, use that file as the source of truth.

Run CI locally with:

- `npx @redwoodjs/agent-ci run --quiet --workflow .github/workflows/web-ci.yml`

If you need the whole repo CI set and matrix coverage is unnecessary:

- `npx @redwoodjs/agent-ci run --quiet --all --no-matrix`

If a step fails, fix it locally and retry only that runner:

- `npx @redwoodjs/agent-ci retry --name verify`

Do not push just to trigger remote CI when `agent-ci` can run the same workflow locally.

## Remote CI

Remote validation for `pirate-web` runs through GitHub Actions on Blacksmith.
The workflow file is the same source of truth for both:

- local `agent-ci` runs
- remote PR and branch runs on Blacksmith

## Scope

Keep this repo-local workflow focused on build and validation behavior.
Do not put parent-workspace repo-boundary rules here; those belong in the root `AGENTS.md`.
