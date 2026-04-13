# UI Maintenance

Use this checklist when touching `src/components/`.

## Before Adding A Component

1. Decide whether it is a primitive or a composition.
2. Check whether an existing component already owns the same job.
3. Keep the public API as small as possible.

## Before Exporting

1. Confirm there is at least one real consumer or a near-term caller.
2. Add a primitive story if the export is reusable UI.
3. Add or update a composition smoke test if the change affects a core flow.

## When Refactoring

1. Move files to the correct ownership boundary first.
2. Update imports in the same change.
3. Delete dead story-only surface instead of preserving it.
4. Run `rtk bun test`.
5. Run `rtk bun run types`.

## Ongoing Hygiene

- remove unused exports promptly
- keep stories aligned with actual public APIs
- avoid oversized primitive files
- prefer one clear source of truth for layout ownership
