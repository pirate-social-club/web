# Solid Storybook Migration — Agent Handoff (2026-08-15, post-B6.5)

## Mission

Migrate the entire React Storybook catalog (177 CSF files under `web/src/`) to
SolidJS. Not an audit, not just the DS subset — full coverage with a checked-in
parity manifest. Per the coordinator brief:

- Reusable components/patterns → `web/packages/solid-ui` (authoritative DS).
- Product/route/feature UI → `web/solid/src/features/<area>/`.
- The standalone `pirate-solid-design-system/` checkout is a frozen intake
  copy. Never implement there.
- Stories are deterministic and offline: typed fixtures, callback-driven
  adapters, no live APIs/auth/router state/timers/random data. Port real
  components, never story-only replicas. No original story state may silently
  disappear; consolidations go in the manifest's status column.
- Perimeter security work is a separate track; it does NOT block this work.

## Where things are

- Worktree: `/run/media/x42/codedrive/Code/pirate-workspace/.worktrees/web/solid-storybook`
- Branch: `feat/solid-storybook`, 17 commits over `main@c3b077ce`, clean.
  NOT fully pushed (7+ commits ahead of origin) — push is the human's call.
- Parity manifest: `docs/solid-storybook-parity.md` (update Status per batch).
- Read first: workspace `AGENTS.md`, `web/AGENTS.md` (typography/color/UI
  rules are enforced by review), then the manifest.

## Done

- App-side Storybook: `solid/.storybook/` (port 6008), locale/direction/theme
  toolbar wired to UiLocaleProvider, localStorage locale reset for determinism.
- Batch 5 (all DS chrome/navigation/route-state patterns): FlatTabs,
  StackedSectionNav, Sidebar, AppHeader, MobileFooterNav, MobilePageHeader,
  Modal, ResponsiveOptionSelect, AvatarBadge, StatusCard, route-states,
  StackPageShell. Libs: `createClientHydrated`, `createMediaQuery` in
  `packages/solid-ui/src/lib/`.
- B6 (app shell): page/mobile-route/content-rail shells, AppSidebar,
  VersionBadge, AppShellHeader/MobileNav, AppSearchDialog, RootErrorBoundary,
  RouteContentFallback in `solid/src/features/shell/`.
- B6.5: `solid/src/design-system.ts` facade expanded to 47 exports; ALL app
  feature imports go through it (`../../design-system`). Never import
  `@pirate/web-solid-ui` directly from feature code.
- `desktop-chat-widget` moved to B12: its story needs the real chat views.
- `app-shell-chrome` story: covered by DS AppHeader/MobileFooterNav stories +
  AppShell adapter stories (stated in manifest).

## Reconciliation notes (2026-08-17)

- `MobileFooterNav` now uses the CSS-first DS API; `forceMobile` was removed
  from this surface only. The prop remains live on `AppHeader`, `Modal`, and
  wallet modal callers, so do not copy it back into the footer API or the
  page-header API.
- `MobilePageHeader` now uses the DS callback-driven implementation directly;
  it no longer composes `AppHeader` or passes `forceMobile` through that
  boundary. Its fixed positioning and safe-area padding keep callers within the
  existing shell clearance, though the header itself grows from `h-16` (4rem,
  the old AppHeader mobile branch) to `h-[var(--header-height)]` (4.5rem);
  callers pad `calc(env(safe-area-inset-top)+5rem)`, so nothing clips. The back
  affordance now defaults to the accessible name `Back` where `AppHeader`
  defaults to `Go back`; both remain overridable props. With neither
  `onBackClick` nor `onCloseClick` supplied the leading slot renders empty —
  `AppHeader`'s hamburger fallback is not carried over, since
  `MobilePageHeader` never passed `onMenuClick` and that control was inert.
  Its Solid callers use only the callback-driven title/back/close/trailing
  surface.
- `ResponsiveOptionSelect` is reconciled against the DS implementation. It
  affects live B8d wallet consumers and wallet SSR tests because the mobile
  branch changes to an `aria-pressed` button group and the desktop branch owns
  the single named form control. Custom mobile triggers use
  `mobileTriggerContent` and must be a single control or content-only element.

## Gates (run per batch, in the worktree)

- DS: `cd packages/solid-ui && bun run typecheck && bun run test` (376 green)
  and `bun run build-storybook` (277 entries).
- App: `cd solid && bun run typecheck && bun run build-storybook` (32 entries).
- Commit per batch on `feat/solid-storybook`; stage exact paths, never -A.
  Do not push. Watch `git log` for same-author "preserve" checkpoint commits
  from a workspace automation — verify content is yours, they are benign.

## Solid 2.0 gotchas (hard-won, apply everywhere)

- `createEffect(compute, effect)` — two functions required; one-shot effects
  throw MISSING_EFFECT_FN. Effects never run during SSR.
- Signals written inside effect apply phases need
  `createSignal(v, { ownedWrite: true })` + comment.
- No `onMount`. No `Context.Provider` — call the context as a component:
  `<MyContext value={...}>`.
- `import type { JSX } from "@solidjs/web"` (not solid-js).
- Kobalte alpha components don't type `style` — forward via non-fresh spread
  (`const p = () => ({style: ...}); <Comp {...p()}>`) and cover with a test.
- Don't swap components with `<Dynamic>` over Kobalte parts (props leak);
  use `<Show when fallback>` branches.
- `tabindex` lowercase in Solid 2 JSX types; `aria-hidden="true"` explicit.
- Kobalte Trigger components must BE the button (style them directly);
  nesting a Button inside a Trigger is invalid.
- jsdom has no matchMedia — guard `typeof window.matchMedia !== "function"`.

## UI rules (web/AGENTS.md, enforced in review)

- Type primitive for ALL text; no freestyled `text-*`/`font-*`/`leading-*` on
  raw elements. Body text is text-base. No `text-xs`/`text-sm`.
- Semantic color tokens only; no hardcoded palette/hex in markup. One-off CSS
  (e.g. `.notification-count-badge`, `.media-overlay-scrim`) lives in
  `packages/solid-ui/src/styles/tokens.css` `@layer components`.
- Stories: default + meaningful variants; mobile via
  `globals: { viewport: { value: "mobile1", isRotated: false } }`; RTL via
  `globals: { direction: "rtl" }`; a11y clean (axe runs in component tests via
  `expectNoA11yViolations`); SSR smoke checks in
  `packages/solid-ui/scripts/ssr-check.test.tsx`.

## Next: B7 — posts (19 manifest rows)

Sub-split by size (sources under `src/components/compositions/posts/`):

- B7a post-card: `post-card.tsx` (594) + song (843) + embed (721) + live-room
  (628) + video (596) + media (460) sources; stories post-card (1615!), song
  (808), live (348), video (238), song-player. Biggest surface; start here.
- B7b post-composer: write-step (561), publish-settings (500),
  event-section (475) + stories (base 348, song 815, video 700, text 209,
  submit-progress 181+155, file 98).
- B7c feed/thread/video: feed (384 + fixtures 240), post-thread (383 + 214),
  video-feed (646 story; source 1620 — check overlap with DS VerticalFeed
  pattern, engagement-owned: do NOT edit vertical-feed/**), video-player,
  crosspost-composer (220), feed-side-panel (120).

Patterns to follow: read the React story FIRST, enumerate its states, port
component with callbacks/fixtures, mirror every state, add play for primary
interactions, component test with a11y, SSR check for DS-side pieces. Target
`solid/src/features/posts/`. Icons needed beyond the barrel: add to
`packages/solid-ui/src/components/media/icons.tsx` (inline SVG style) and
export from the barrel + facade.

## Also pending (not blocking)

- B12 includes chat-route-views (815 lines) which unblocks desktop-chat-widget.
- Track-2 (not this migration): split the root barrel, remove `@/` alias
  coupling, align Storybook versions, browser-level a11y/interaction CI.
- Control plane: stale `api/dance-telegram-gate0b` exception in
  `bin/workspace-check`; dirty workspace root (TASKS.md etc.) awaits the
  human's preservation decision.
