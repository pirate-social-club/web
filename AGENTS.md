# Pirate Web — Agent Notes

## Default Checks

Use the cheap gate first:

```bash
rtk bun run types
rtk bun run ui:audit
```

Use Storybook validation when component stories change. Avoid `rtk bun run build` by default; use the lighter Vite checks from the workspace instructions unless a full production build is required.

## UI Rules

- Do not use `text-xs` or `text-sm` in app UI or stories.
- Do not add explanatory helper copy when a label or control already carries the decision value.
- Do not use badge/pill UI for inline status.
- Prefer icon-only circle buttons for obvious tool actions.
- Keep steppers above the card, not inside it.

## Storybook Coverage

- Primitive: default plus meaningful variants.
- Form/control: default, disabled, error, and mobile where layout can change.
- Composition/flow: default, loading, error or empty, and mobile.
- RTL stories are required only when text direction can change layout.
- Every exported primitive must have a same-name `.stories.tsx`; `rtk bun run ui:audit` enforces this.

## Code Quality

- Do not keep dead exports or story-only primitive wrappers.
- Extract shared layout/state helpers on the second real caller.
- Avoid compatibility shims unless they have an owner, a removal condition, and a dated TODO.
- Generated locale output and vendor crypto/ABI files are exempt from size cleanup.
- Split large product compositions on next meaningful touch when review becomes hard.
