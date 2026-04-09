# Pirate Social Club Web

Active web UI workspace for Pirate Social Club.

This repository currently centers on the Storybook-driven component and composition work that runs on port `6006`, alongside the supporting source files that will grow into the production web app.

Use Bun for installs and scripts in this repo.

## Commands

```bash
bun install
bun run dev
bun run build
bun run storybook
bun run build-storybook
bun run test
bun run types
```

## Notes

- `bun run storybook` runs the active UI workspace on `http://localhost:6006`
- `storybook-static/` is generated output from `build-storybook` and is ignored
- `debug-storybook.log` is local debug output and is ignored

## License

Licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).
