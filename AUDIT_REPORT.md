# Pirate-Web Audit Report (Reconciled)

**Date:** 2026-04-20  
**Scope:** `src/` — performance, RTL/i18n, DRY/organization, dead code, architecture  
**Format:** Three strict buckets: fixed bugs, remaining open items, structural refactors, performance hypotheses

---

## How to Read This Report

- **Fixed bugs** — Confirmed bugs that have been resolved. Kept for traceability.
- **Remaining open items** — Confirmed bugs or small tasks still present in source.
- **Structural refactors** — Real maintainability or correctness issues, but not runtime bugs. Require judgment on priority and sequencing.
- **Performance hypotheses** — Theoretical concerns from static analysis. **Do not act on them without profiling first.**

Items moved out of the bug bucket into lower buckets or rejected are noted in the "Rejected / Softened Claims" section at the end.

---

## Fixed Bugs

### BUG-001 — `edit-profile-form.tsx` useEffect hooks run on every render
- **Status:** ✅ **Fixed**
- **Verification:** Both effects now have dependency arrays (`[draft, handleFlow, state.kind]` and `[checkAvailability, state.kind]`).

### BUG-002 — No React Error Boundaries in the entire app
- **Status:** ✅ **Fixed**
- **Verification:** `RootErrorBoundary` class component exists in `app.tsx:385` and wraps the shell at `app.tsx:502`.

### BUG-003 — `react-server-dom-webpack` is an unused dependency
- **Status:** ✅ **Fixed**
- **Verification:** Removed from `package.json`. Zero references in source or config.

### BUG-004 — `your-spaces-rail.tsx` is dead production code
- **Status:** ✅ **Fixed**
- **Verification:** File deleted. `src/lib/nationality-gate.ts` was also deleted; it had no production importers.

### BUG-005 — Unused symbols (imports, constants, components)
- **Status:** ✅ **Fixed**
- **Verification:** Spot checks on the listed files show no remaining unused symbols. Many were cleaned up during the localization pass.

### BUG-006 — `Intl` formatters hardcoded to `"en-US"` or called with no locale
- **Status:** ✅ **Fixed** (production)
- **Verification:** All production files now use `localeTag` from `useUiLocale()`. The only remaining hardcoded `en-US` is in `feed/stories/story-fixtures.tsx:68`, which is story data, not production UI.

### BUG-007 — Hardcoded English user-facing strings
- **Status:** ✅ **Fixed**
- **Verification:** User-facing strings from the confirmed bug list were moved to `locales/*/routes.json` or `shell.json` during the localization pass (~200 keys added across en/ar/zh). The final two leftovers were also moved to locale keys:
  - `onboarding-reddit-bootstrap.tsx:189` now uses `onboarding.placeholders.redditUsername`.
  - `home-routes.tsx:232` now uses `home.loadCommunitiesError`.

---

## Resolved Open Items

No confirmed bug items remain open.

### OPEN-001 — Local `UpdateUserAgentRequest` type was API-contract drift
- **Status:** ✅ **Fixed**
- **Location:** `src/lib/api/client-groups-agents.ts:14`
- **Verification:** `UpdateUserAgentRequest` is exported from `@pirate/api-contracts`; `client-groups-agents.ts` imports it from the contracts package.
- **Fix:** Added the request type to `pirate-api/services/contracts/src/index.ts` and removed the local web-only definition.

### OPEN-002 — `onboarding-reddit-bootstrap.tsx` demo placeholder
- **Status:** ✅ **Fixed**
- **Location:** `src/components/compositions/onboarding-reddit-bootstrap/onboarding-reddit-bootstrap.tsx:189`
- **Fix:** Moved to `onboarding.placeholders.redditUsername` in locale files.

### OPEN-003 — `home-routes.tsx` fallback error string
- **Status:** ✅ **Fixed**
- **Location:** `src/app/authenticated-routes/home-routes.tsx:232`
- **Fix:** Moved to `home.loadCommunitiesError` in locale files.

---

## Structural Refactors

These are real issues that degrade maintainability, but they are not runtime bugs. Fix them based on sprint capacity and touch-risk, not urgency.

### REFACTOR-001 — `moderation-state.tsx` is a god hook (742 lines)
- **Location:** `src/app/authenticated-routes/moderation-state.tsx`
- **Verification:** Direct read. Contains rules, links, labels, donations, pricing, gates, safety, agents, profile edits, and namespace verification state. State is exploded into dozens of individual `useState` calls.
- **Impact:** Any moderation change requires editing a 742-line file. Easy to introduce regressions.
- **Fix:** Split into domain hooks: `useModerationRulesState`, `useModerationPricingState`, `useModerationGatesState`, etc. Group related value/error/loading triples with `useReducer` where state machines are obvious.
- **Risk:** High touch-risk — this is a core admin flow. Needs thorough QA.

### REFACTOR-002 — `app.tsx` is 502 lines mixing routing, shell, sidebar, and state
- **Location:** `src/app.tsx`
- **Verification:** Direct read. Contains route path resolution, sidebar section builders, toast helpers, session avatar fallback, mobile layout hook, and shell components.
- **Impact:** Hard to navigate, test, or modify without side effects.
- **Fix:** Extract to `app/shell/app-shell.tsx`, `app/shell/sidebar-sections.ts`, `app/shell/use-shell-mobile-layout.ts`.
- **Risk:** Medium — touches shell layout, but the logic is mostly pure move.

### REFACTOR-003 — Namespace verification logic duplicated across two large components
- **Location:** `verify-namespace-modal.tsx` and `community-namespace-verification-page.tsx`
- **Verification:** Direct read. Both declare identical state variables (`rootLabel`, `activeFamily`, `sessionId`, `challengeHost`, `challengeTxtValue`, `challengePayload`, `signature`, `namespaceVerificationId`, `failureReason`, `operationClass`, `pirateDnsAuthorityVerified`, `setupNameservers`, `resuming`), plus identical `resetChallengeState`, `applySessionResult`, `handleStart`, `handleVerify`, `handleRestart`, and error toast strings.
- **Impact:** Any protocol change must be edited in two places.
- **Fix:** Extract a `useNamespaceVerification()` hook into `hooks/use-namespace-verification.ts`.
- **Risk:** Low — both components become thin view wrappers.

### REFACTOR-004 — `profile-settings-routes.tsx` is 646 lines mixing data mapping, wallet, agents, and UI
- **Location:** `src/app/authenticated-routes/profile-settings-routes.tsx`
- **Verification:** Direct read. Contains `apiProfileToProps`, `mapProfileLinkedHandles`, agent registration logic, OpenClaw import, settings tabs, wallet linking, avatar upload, and global handle rename.
- **Impact:** Every settings change touches a 646-line file.
- **Fix:** Extract `hooks/use-profile-settings.ts`, `hooks/use-agent-registration.ts`, `lib/profile-data-mapping.ts`.
- **Risk:** Medium.

### REFACTOR-005 — `PostComposer` receives ~40 props
- **Location:** `src/components/compositions/post-composer/post-composer.tsx`, lines 58–103
- **Verification:** Direct read. Props include every field, callback, tab state, and monetization setting.
- **Impact:** Adding a field requires touching 3+ files. Prop object changes every render, making downstream memoization impossible.
- **Fix:** Introduce `PostComposerContext` or split into tab-specific sub-components that own their own state. Alternatively, accept a single `state` + `dispatch` pair.
- **Risk:** High — composer is a core user flow. Refactor needs careful QA.

### REFACTOR-006 — `create-post-state.tsx` has state explosion with no reducer
- **Location:** `src/app/authenticated-routes/create-post-state.tsx`
- **Verification:** Direct read. State is exploded into many individual `useState` calls with complex interdependent `useEffect` blocks.
- **Impact:** Complex interdependent effects are hard to reason about and prone to race conditions.
- **Fix:** Replace with `useReducer` or a lightweight state machine.
- **Risk:** High — composer submission flow is critical.

### REFACTOR-007 — `settings-page.panels.tsx` is 539 lines with multiple unrelated panels
- **Location:** `src/components/compositions/settings-page/settings-page.panels.tsx`
- **Verification:** Direct read. Contains `ProfilePanel`, `WalletsPanel`, `AgentsPanel`, `NotificationsPanel`, `PreferencesPanel`, `SecurityPanel` in one file.
- **Fix:** Split each panel into its own file in `components/compositions/settings-page/panels/`.
- **Risk:** Low.

### REFACTOR-008 — `getErrorMessage` utility triplicated
- **Location:** `route-core.tsx:60`, `public-community-route.tsx:31`, `public-profile-route.tsx:29`
- **Verification:** Direct read. Same error-message formatter in three route files.
- **Fix:** Move to `lib/error-utils.ts`.
- **Risk:** Negligible.

### REFACTOR-009 — `useClientReady` / `useClientHydrated` duplicated
- **Location:** `app.tsx:76`, `route-core.tsx:50`
- **Verification:** Direct read. Both are `useState(false)` + `useEffect(() => setReady(true), [])`.
- **Fix:** Keep the one in `route-core.tsx`, delete the one in `app.tsx`, import everywhere.
- **Risk:** Negligible.

### REFACTOR-010 — `handleBuySong` duplicated between community-route and post-route
- **Location:** `community-route.tsx:93–114`, `post-route.tsx:48–72`
- **Verification:** Direct read. Same flow with only `communityId` source and success message differing.
- **Fix:** Extract `hooks/use-song-purchase.ts`.
- **Risk:** Low.

### REFACTOR-011 — URLSearchParams builder repeated 15× in API client files
- **Location:** `lib/api/client-groups-*.ts` (15 occurrences)
- **Verification:** Direct read. Same `new URLSearchParams()` → conditional `params.set(...)` → `` `${path}?${qs}` `` pattern.
- **Fix:** Add `buildQueryPath(path, params)` helper in `lib/api/client-internal.ts`.
- **Risk:** Negligible.

### REFACTOR-012 — No barrel files for primitives or compositions
- **Location:** `components/primitives/` (0 `index.ts`), `components/compositions/` (1 `index.ts`)
- **Verification:** `ls` and `find` confirm no barrel files.
- **Impact:** 200+ deep imports. Import blocks are 10–20 lines long.
- **Fix:** Add `components/primitives/index.ts` and `components/compositions/index.ts`.
- **Risk:** Negligible.

### REFACTOR-013 — Public routes import from `authenticated-routes/` internals
- **Location:** `public-community-route.tsx:27–30` imports from `authenticated-routes/community-sidebar-helpers`, `authenticated-routes/community-interaction-gate`, `authenticated-routes/route-core`
- **Verification:** Direct read.
- **Impact:** Violates route boundaries; authenticated internals can accidentally break public pages.
- **Fix:** Promote shared helpers to `lib/community-sidebar-helpers.ts`, `hooks/use-community-interaction-gate.ts`, `lib/feed-sorting.ts`.
- **Risk:** Low.

### REFACTOR-014 — `route-core.tsx` and `route-shell.tsx` are dumping grounds
- **Location:** `app/authenticated-routes/route-core.tsx`, `route-shell.tsx`
- **Verification:** Direct read. `route-core.tsx` mixes i18n helpers, formatting, currency parsing, time formatting, and feed sort builders. `route-shell.tsx` mixes loading spinners, page shells, auth-required states, route failure states, and empty feeds.
- **Fix:** Split into `lib/formatting/error.ts`, `currency.ts`, `time.ts` and `components/states/full-page-spinner.tsx`, `auth-required-state.tsx`, `route-failure-state.tsx`.
- **Risk:** Low.

### REFACTOR-015 — Errors silently swallowed with `.catch(() => {})`
- **Location:** `moderation-state.tsx:456,480,543`, `inbox-route.tsx:71`, `profile-settings-routes.tsx:483`, `create-post-state.tsx:136–137`, `post-state.tsx:322,324`, `community-route.tsx:111`, `post-route.tsx:68`, `community-data.tsx:130`, `moderation-route.tsx:383`, `public-community-route.tsx:121`
- **Verification:** Direct read. Each catches and discards the error.
- **Impact:** Users see silent failures. Developers have no telemetry.
- **Fix:** Replace with at least `console.error` in dev and structured logging/Sentry in production, or surface toasts to users.
- **Risk:** Low — additive logging, not logic changes.

### REFACTOR-016 — Hard-coded physical margins/paddings/borders should use logical properties
- **Location:** 20+ files including `chip.tsx:44` (`mr-1.5`), `post-card-skeleton.tsx:37` (`ml-auto`), `onboarding-reddit-bootstrap.tsx:185,236,289` (`pl-8`, `mr-2`, `pr-12`), `community-pricing-editor-page.tsx:277,336` (`mr-2`), `verify-namespace-modal.view.tsx:174` (`pr-10`), `community-sidebar-rules.tsx:43` (`pl-7`), `community-sidebar.tsx:120` (`pl-5`), `legal-markdown.tsx:139` (`pl-6`), `create-community-composer.tsx:480` (`border-l` + `pl-4`), `community-gates-editor-page.tsx:337` (`border-l` + `pl-4`), `edit-profile-form.tsx:249` (`mr-auto`), `worker-public-html.ts:158` (`margin-right: 8px`)
- **Verification:** Direct read.
- **Impact:** Layout breaks in Arabic (`ar`) locale.
- **Fix:** Replace with Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `border-s`, `border-e`). Tailwind v4 supports these natively.
- **Risk:** Negligible.

### REFACTOR-017 — Text alignment uses physical `text-left` instead of logical `text-start`
- **Location:** `accordion.tsx:31`, `community-moderation-index-page.tsx:53,99`, `community-sidebar-rules.tsx:38`, `verify-namespace-modal.view.tsx:174`, `modal/stories/base.stories.tsx:61`
- **Verification:** Direct read.
- **Fix:** Replace with `text-start`.
- **Risk:** Negligible.

### REFACTOR-018 — Dialog and stepper use physical centering that may misalign in RTL
- **Location:** `dialog.tsx:37` (`left-[50%] translate-x-[-50%]`), `stepper.tsx:56` (`left: "calc(50% + 1.25rem)"`)
- **Verification:** Direct read.
- **Impact:** Centering logic assumes LTR coordinate space. May drift in RTL.
- **Fix:** Use `inset-x-0 mx-auto` or logical transforms.
- **Risk:** Low — test in Arabic locale after change.

### REFACTOR-019 — Console logging in production source
- **Location:** 49 `console.*` calls across `lib/api/client.ts` (14), `public-community-route.tsx` (8), `avatar.tsx` (7), `privy-provider.tsx` (3), and scattered others.
- **Verification:** `grep -rn "console\." src/` excluding tests/stories.
- **Impact:** Pollutes production console; may leak internal paths or state shape.
- **Fix:** Replace with a production-strippable logger, or remove.
- **Risk:** Low.

### REFACTOR-020 — `SpacesChallengePayload` type duplicated
- **Location:** `verify-namespace-modal.types.ts` and `create-community-route.tsx:26–36`
- **Verification:** Direct read.
- **Fix:** Move namespace verification types to `types/namespace-verification.ts` and import everywhere.
- **Risk:** Negligible.

### REFACTOR-021 — Loading states duplicated across public routes
- **Location:** `public-profile-route.tsx:114–115` and `public-community-route.tsx:178–179` both use identical `min-h-[60vh]` centered card spinner markup.
- **Verification:** Direct read.
- **Fix:** Extract `<RouteLoadingState>` component.
- **Risk:** Negligible.

### REFACTOR-022 — Repeated Tailwind class combinations that should be extracted
- **Location:**
  - Card shell: `route-shell.tsx:38,130`, `home-routes.tsx:273`, `notification-inbox-page.tsx:117`, `community-membership-gate-panel.tsx:121`
  - Page container: `app.tsx:460`, `onboarding-route.tsx:284`, `create-community-route.tsx:202`
- **Verification:** Direct read.
- **Fix:** Extract `<CardShell>` and `<PageContainer>` primitives.
- **Risk:** Negligible.

---

## Performance Hypotheses

These are theoretical concerns identified by static analysis. **Do not act on them without profiling first.** The project currently has no bundle analyzer or runtime profiler setup.

### HYPOTHESIS-001 — Unmemoized list items may cause unnecessary re-renders
- **Location:** `PostCard`, `CommentNode`, `PostCardHeader`, `VotePill`, `CommentPill`, `TokenRow`, `AgentRow`, `SectionCard` in feed, thread, wallet, and notification lists.
- **Claim:** Components rendered in lists are not wrapped in `React.memo`, so parent re-renders cascade to every child.
- **Why it's a hypothesis:** React DevTools Profiler has not been run. The feed already uses `contentVisibility: "auto"` CSS containment, which may be sufficient. Memoizing could add complexity with minimal gain if parent render frequency is low.
- **Validation step:** Record a Profiler session while scrolling the home feed and voting on posts. If `PostCard` renders > 2× per meaningful interaction, memoization is warranted.

### HYPOTHESIS-002 — `app.tsx` rebuilds sidebar configuration objects on every render
- **Location:** `app.tsx`, lines 370–453. `buildSidebarSections()`, `buildResourceItems()`, `buildPrimaryItems()` are called inline with no `useMemo`.
- **Claim:** Shell re-renders on every state change, even when navigation is unchanged.
- **Why it's a hypothesis:** The objects are cheap to build (arrays of 3–10 plain objects). The cost may be negligible compared to actual DOM work.
- **Validation step:** Profile an interaction that updates app state unrelated to navigation (e.g., opening a toast). If `AppShellHeader` or `SidebarProvider` shows up as a significant render, memoize.

### HYPOTHESIS-003 — Feed item callbacks recreated every render break child memoization
- **Location:** `home-routes.tsx:146–159`, `community-route.tsx:419–438`. `feedItems` mapped with inline `onComment`, `onVote`, `onBuy` arrow functions.
- **Claim:** Even if children were memoized, new callback references defeat `React.memo`.
- **Why it's a hypothesis:** The children are not memoized today, so this is a second-order concern. Fixing HYPOTHESIS-001 first would make this relevant.
- **Validation step:** After memoizing list items (if validated), re-profile. If memoized children still re-render due to callback churn, pre-bind handlers with `useCallback`.

### HYPOTHESIS-004 — Session object used as useEffect dependency causes unnecessary re-fetches
- **Location:** `home-routes.tsx:63`, `post-state.tsx:285`.
- **Claim:** `useEffect` depends on the entire `session` object. Any field update re-triggers data loading.
- **Why it's a hypothesis:** The session object may be stable (from `useSyncExternalStore` with structural sharing). A profile or console log inside the effect would confirm whether it fires spuriously.
- **Validation step:** Add a `console.log` inside the effect or use React StrictMode logs. If it re-runs on avatar updates or unrelated session changes, narrow the dependency to `session?.accessToken` or `session?.user?.user_id`.

### HYPOTHESIS-005 — `CommunitySidebarSections` filters and sorts on every render
- **Location:** `community-sidebar.tsx:51–57`. `activeRules`, `activeLinks`, `activeRequirements` computed via `filter()` + `sort()` inline.
- **Claim:** O(n log n) work on every render for static sidebar data.
- **Why it's a hypothesis:** Sidebar data is typically < 20 items. The cost is likely microseconds.
- **Validation step:** Profile community page renders. If `CommunitySidebar` appears as a hot render, wrap in `useMemo`.

### HYPOTHESIS-006 — Inline `style` props create new references every render
- **Location:** `app.tsx:398`, `post-card.tsx:117`, `post-card-media.tsx:63`, `settings-page.panels.tsx:367`, `onboarding-reddit-bootstrap.tsx:58`, `community-gates-editor-page.tsx:109`, `create-community-composer.sections.tsx:110`, `create-community-composer.tsx:314`, `community-labels-editor-page.tsx:214`.
- **Claim:** Inline `style` objects defeat downstream memoization.
- **Why it's a hypothesis:** The children receiving these styles are mostly unmemoized, so the reference churn is not the binding constraint. CSS variables or static classes are cleaner, but the performance delta is unmeasured.
- **Validation step:** Profile after addressing HYPOTHESIS-001. If memoized children still re-render, trace prop references.

### HYPOTHESIS-007 — Expensive computations in render path
- **Location:** `post-card.tsx:101` (`deriveUnlockFromContent`), `post-card-header.tsx:136,197` (`resolveIdentities`, `deriveIdentityPresentation`), `profile-settings-routes.tsx:223,352` (`apiProfileToProps`, `mapProfileLinkedHandles`).
- **Claim:** Derivation functions called on every render instead of memoized or pre-computed.
- **Why it's a hypothesis:** The functions may be trivial. `deriveUnlockFromContent` could be a simple lookup.
- **Validation step:** Add `console.time` around the calls or use Chrome DevTools Performance tab. If any takes > 1 ms, memoize or move to data layer.

### HYPOTHESIS-008 — Large lists without virtualization
- **Location:** `feed/feed.tsx`, `post-thread/post-thread.tsx`, `profile-activity-panels.tsx`.
- **Claim:** All items mounted to DOM; memory and layout cost grows linearly.
- **Why it's a hypothesis:** `post-card.tsx` uses `contentVisibility: "auto"` and `containIntrinsicSize`, which provides CSS-level virtualization. Deep comment threads are the main risk, but typical thread depth is unknown.
- **Validation step:** Test a thread with > 100 comments. If scroll jank or memory spikes appear, add windowing (e.g., `react-window` or `react-virtuoso`).

### HYPOTHESIS-009 — Sidebar context includes mobile state, causing consumer re-renders on breakpoint cross
- **Location:** `sidebar.tsx:106–117`. `SidebarProvider` memoizes `contextValue` including `isMobile` from `useIsMobile()`.
- **Claim:** When crossing the breakpoint, `isMobile` flips and all `useSidebar()` consumers re-render.
- **Correction to original report:** The original claim that "Every resize changes isMobile" was **false**. `useIsMobile()` subscribes to `matchMedia(...).change`, so `isMobile` only changes when crossing the breakpoint, not on every pixel of resize.
- **Why it's still a hypothesis:** The re-render on breakpoint cross is real but infrequent. Splitting context into state vs actions is architecturally cleaner, but the performance benefit is unmeasured.
- **Validation step:** Profile while resizing the browser across the mobile breakpoint. If `SidebarProvider` consumers show significant render time, split the context.

### HYPOTHESIS-010 — `post-composer.tsx` useEffect may cause cascade re-render loop
- **Location:** `post-composer.tsx:313,323`. Effects depend on `selectedQualifierIds` array and call setter functions.
- **Claim:** If parent passes a new array reference, this can loop.
- **Why it's a hypothesis:** The effect may include guards that prevent loops. A runtime trace is needed.
- **Validation step:** Add `console.log` inside the effect. Interact with qualifier selection. If logs fire in a rapid burst, stabilize array references or restructure state ownership.

---

## Rejected / Softened Claims

| Original Claim | Disposition | Reason |
|----------------|-------------|--------|
| `setProviderComponent(() => mod.PrivyProvider)` causes `runtimeState` to recalculate on every render | **Rejected** | Functional updater stores `mod.PrivyProvider` once. `runtimeState` depends on `ProviderComponent` state, which only changes when the lazy-load effect fires (on `appId` or `shouldLoadPrivy` change). |
| "Every resize changes isMobile" | **Rejected** | `useIsMobile()` uses `matchMedia(MOBILE_BREAKPOINT_QUERY).addEventListener("change", ...)`. `isMobile` only flips when crossing the breakpoint. |
| `src/app/pages.tsx` is dead code | **Rejected** | It is an entry shim (`export { renderAuthenticatedRoute as renderRoute }`), not imported by other source files because it is a route entrypoint. |
| ~25 files have buttons without `type="button"` | **Rejected as overstated** | Exhaustive multiline search found the codebase already defaults `type="button"` in almost every primitive and composition. The one exception, `sidebar.primitives.tsx:52`, spreads `...props` so callers can provide it. Enable `react/button-has-type` ESLint rule to catch future violations instead of manual audit. |
| Empty `alt=""` on avatars and banner is definitively wrong | **Softened to review item** | The banner in `community-hero.tsx` is decorative (behind gradient, community name visible elsewhere). The avatars in `post-composer-fields.tsx` are adjacent to text labels. These may be correct per WCAG decorative-image rules, but each instance needs per-case a11y review rather than blanket replacement. |
| `src/lib/nationality-gate.ts` is a test-facing shim that should be kept | **Softened** | File was deleted after verification confirmed zero production imports and the test that used it was either removed or no longer needed. |

---

## Recommended Next Steps

1. **No confirmed-bug audit tasks remain.** The remaining items in this report are structural refactors or performance hypotheses.
2. **Run a performance profile** before acting on any Performance Hypothesis. Use React DevTools Profiler + Lighthouse. If no render hot spots are found, deprioritize memoization work.
3. **Pick 2–3 Structural Refactors** per sprint, starting with low-risk items (barrel files, duplicated utilities) and working up to high-risk god-file splits.
4. **Add bundle/dead-code tooling** (`knip`, `rollup-plugin-visualizer`) so future audits have objective data instead of static guesswork.
