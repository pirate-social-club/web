# Pirate Web — Agent Notes

## Default Checks

Use the cheap gate first:

```bash
rtk bun run types
rtk bun run ui:audit
```

Use Storybook validation when component stories change. Avoid `rtk bun run build` by default; use the lighter Vite checks from the workspace instructions unless a full production build is required.

## Browser Automation

- Use `agent-browser` sparingly on local dev pages.
- Do not run multiple `agent-browser` commands in parallel. Open/wait/snapshot/screenshot actions must be serialized so only one browser automation command is active at a time.
- Prefer a single snapshot or screenshot after the page is loaded, then inspect code locally. Avoid repeated screenshots or long concurrent waits unless the user explicitly asks for deeper browser testing.
- Before starting a dev server or browser session, check whether one is already running. Stop any dev server or browser session started for the task when it is no longer needed.

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
- Every exported primitive must have a same-name `.stories.tsx`; `rtk bun run ui:audit` enforces this.

## Code Quality

- Do not keep dead exports or story-only primitive wrappers.
- Extract shared layout/state helpers on the second real caller.
- Avoid compatibility shims unless they have an owner, a removal condition, and a dated TODO.
- Generated locale output and vendor crypto/ABI files are exempt from size cleanup.
- Split large product compositions on next meaningful touch when review becomes hard.
