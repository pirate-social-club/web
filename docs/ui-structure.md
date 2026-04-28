# UI Structure

`pirate-web` keeps UI code in two layers:

- `src/components/primitives/` for small reusable building blocks with narrow APIs.
- `src/components/compositions/` for assembled product UI, cross-primitive orchestration, or anything that owns layout, navigation, or flow behavior.

## Move A Component To `compositions/` When

- the file starts coordinating multiple primitives
- the API grows into a compound export surface
- the component owns product layout or shell chrome
- the story is demonstrating a product pattern instead of a primitive state

## Keep A Component In `primitives/` When

- it is a focused reusable control
- the public surface is small and stable
- consumers can understand it without product-specific context

## Current Expectations

- large navigation shells belong in `compositions/`
- primitive stories should cover every exported primitive
- compositions should have smoke tests for key render paths
- dead exports should be removed instead of kept for hypothetical reuse

## Page Layout Ownership

To avoid gutter/safe-area duplication and negative-margin hacks, layout ownership is split across a strict hierarchy:

| Layer | Owner | Responsibility |
|-------|-------|--------------|
| **AppShell** | `app/shell/app-shell.tsx` | Chrome only: sidebar, top header, bottom nav, safe-area offsets, route chrome mode. Does **not** own page gutters. |
| **Route Frame** | `compositions/app/page-shell/` | Route-level spacing: top/bottom clearance for headers and nav, vertical page rhythm. Chooses the page shell explicitly based on route type. |
| **PageContainer** | `primitives/layout-shell.tsx` | Max-width and horizontal gutters only. Encodes the page rhythm via CSS custom properties. |
| **Full-bleed sections** | `FullBleedMobileListSection` | The **only** approved negative-margin escape hatch. Cancels mobile gutters so lists can be full-bleed on phone screens. |
| **Product compositions** | WalletHub, Feed, etc. | Content layout only. No `-mx-*`, no guessing shell padding. If a list needs to bleed, it asks through `FullBleedMobileListSection`. |
| **Leaf rows/cards** | AssetRow, PostCard, etc. | Internal padding only. They should not know whether the page is full-bleed. |

### CSS Gutter Tokens

Gutters are defined as CSS custom properties in `src/styles/tokens.css`:

```css
--page-gutter-x: 1rem;        /* mobile */
--page-gutter-x-md: 1.25rem;  /* tablet / desktop */
--page-gutter-x-lg: 2rem;     /* large desktop */
```

`PageContainer` applies these via `px-[var(--page-gutter-x)]`. `FullBleedMobileListSection` cancels them on mobile with `mx-[calc(var(--page-gutter-x)*-1)]`. New code and migrated routes should not use local negative margins to break gutters.

### Route Shell Components

Routes should import the appropriate shell from `compositions/app/page-shell/`:

- `<StandardRoutePage size="rail">` — default sidebar route with header + bottom nav
- `<StandaloneMobilePage title="..." onBack={...}>` — mobile standalone page with its own header
- `<ChatRoutePage>` — constrained chat layout with overflow control
- `<PublicRoutePage size="default">` — public profile/agent routes

### Rules

1. **AppShell does not apply `px-*` to `<main>` for migrated routes.** Temporary legacy support exists for unmigrated routes; new routes must choose their own page shell.
2. **PageContainer is the only component that applies horizontal gutters.** It does so via the CSS gutter tokens.
3. **Product compositions do not fight the shell.** New or migrated product UI should not use `-mx-3` or hardcoded `px-4` to "fix" missing shell padding.
4. **FullBleedMobileListSection is the only approved negative-margin component.** If a list needs to bleed on mobile, wrap it in this component.
5. **Stories must include route context.** Component stories that appear inside a route should render through the same route frame the route uses, so gutter issues are caught in Storybook.

### Migration Status

Migrated routes (own their own page shell):
- `wallet`
- `home` / `popular`

Legacy routes (still receive legacy padding from AppShell `<main>`):
- All other routes. These will be converted incrementally.

Some legacy routes and stories still contain local gutter workarounds. When a route migrates to `StandardRoutePage` or another page shell, those workarounds should be replaced with `PageContainer gutter` and `FullBleedMobileListSection`.
