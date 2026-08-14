# SolidStart Phase B: Storybook components — findings

Status: **pass-with-caveats** (second review closed)  
Date: 2026-08-14  
Repository: `solid-storybook-poc` (Storybook on port 6007; package name
`pirate-solid-design-system`)

## Verdict

Gate 0 (repair and normalize the existing batch) is complete with caveats. The nine
surfaces — Button, Input, TextField, Dialog, AlertDialog, DropdownMenu, ActionMenu,
Toast/Toaster, ConfirmDialog — live in the target hierarchy under `src/components/`
and `src/patterns/`, all audit blockers from the 2026-08-14 pass are closed, 58
focused tests pass, the SSR smoke check passes, and the static Storybook build
succeeds. The catalog has 0 axe violations on the open Dialog and open ActionMenu
stories in dark and light themes.

A follow-up review found two code defects and several documentation/contract
gaps; both defects are fixed and everything else is recorded here and in the
design-system brief. The reviewer's findings and their disposition:

| Finding | Disposition |
| --- | --- |
| High: foreground uses of `--primary`/`--destructive` fail contrast on dark surfaces (link variant 3.50:1, destructive menu text 3.45:1) | Fixed: split tokens. `--primary-text` dark `oklch(0.7 0.17 29)` / light `oklch(0.5 0.18 29)`; `--destructive-text` dark `oklch(0.7 0.17 25)` / light `oklch(0.25 0.02 250)`. Measured in-browser: link 6.54:1 vs page, destructive item 5.71:1 vs popover. Solid fill roles keep the existing tokens. TextField error text also moved to `--destructive-text`. |
| Medium: `loading` did not override an explicit `disabled={false}` (spread order bug) | Fixed: `disabled` is omitted from the rest spread and set as `props.disabled \|\| props.loading`. Regression test added (58 total). |
| Medium: toast priority always assertive (alpha default `high`) | Fixed: `ShowToastOptions.priority` maps to the alpha `priority` prop; default is `low` (polite `aria-live`), `error` toasts default to `high` (assertive). Tests assert `aria-live` per type. |
| Medium: Dialog/AlertDialog duplication | Fixed: shared internal presentation module `src/components/overlays/dialog-presentation.tsx` (overlay/content/close/title/description class recipes + header/footer/close-button layouts). Providers remain separate. |
| Medium: nothing committed | Fixed: initial commit in `solid-storybook-poc`; the two Web findings docs are committed to the Web repo. |
| Low: docs said 57 tests, actual 58; `@types/node` caret range; toast story named `Types`; package still named `solid-storybook-poc` | Fixed: counts corrected, version pinned exact, story renamed `Variants`, package renamed `pirate-solid-design-system`. Noisy Controls curated (`class`, refs, JSX slot props, callback args hidden from the panel). |

## Renderer and test-runner status

- Renderer: `storybook-solidjs-vite` 10.6.0 with `storybook` 10.5.8, Solid
  `2.0.0-rc.0`, Vite 8. Autodocs, Controls, and the a11y addon all work.
- The `storybook test` CLI command is **not shipped** in storybook 10.5.8 core
  for this renderer, so story `play` functions have no automated Storybook
  execution path. Equivalent interaction and keyboard assertions run in Vitest
  (`rtk bun run test`, jsdom + testing-library/dom + user-event), and axe checks
  run both in Vitest and in the Storybook a11y addon (in-browser). The `play`
  functions remain on canonical stories for the in-browser interaction panel
  and future test-runner support. This is the main test-runner caveat.
- Vitest runs two projects: `components` (jsdom) and `ssr` (node with
  `resolve.conditions: ["node", ...]` so `@solidjs/web` resolves to the server
  build). A single jsdom project cannot load the server entry because the
  default browser-first condition ordering wins.

## Kobalte 2.0.0-alpha.0 mismatches encountered

Recorded against the installed types/source, which are authoritative over the
public site (which still shows 0.13.x).

1. **Reactive write in owned scope (patched).** `create-list-state` writes
   `selectionBehavior` and `focusedKey` from two-phase effect apply callbacks,
   which Solid 2 rejects with `REACTIVE_WRITE_IN_OWNED_SCOPE` and halts the
   reactive system. A minimal `bun patch` (`patches/@kobalte%2Fcore@2.0.0-alpha.0.patch`)
   marks those two signals `ownedWrite: true`. Remove the patch when a fixed
   alpha ships.
2. **Menu content keeps focus on open.** Dropdown menus focus the content
   element on open; the first ArrowDown highlights the first item (roving
   focus, `data-highlighted`). Items are skipped when disabled. This differs
   from APG initial-focus guidance and from Kobalte 0.13; tests encode the
   alpha behavior.
3. **Radio items do not close the menu.** `MenuRadioItem` defaults
   `closeOnSelect: false` in the alpha (0.13 defaulted to close). Escape closes
   and returns focus to the trigger.
4. **Toast root renders `<li role="status">` inside `<ol>`.** Axe flags
   `aria-allowed-role` (`status` is not allowed on `li`). The design-system
   wrapper renders the toast and list as `div`s (`as` polymorphism), keeping
   the `status` live region while dropping the list semantics. Announcement
   priority is wrapped explicitly: `low` (polite) by default, `high`
   (assertive) for error toasts.
5. **Native button sets no `aria-disabled`.** Kobalte's ButtonRoot only sets
   `aria-disabled` on polymorphic non-native elements; native buttons rely on
   the `disabled` attribute. Tests assert `toBeDisabled()`, not the ARIA
   attribute.
6. **AlertDialog has no dedicated context hook.** The alpha composes
   AlertDialog from the same root internals as Dialog, so programmatic close
   uses `useDialogContext` from the dialog module. A proper alert-dialog
   context export would be cleaner; recorded for the next alpha.
7. **Checkbox/radio item change prop is `onChange`**, not
   `onCheckedChange` (0.13 naming). ActionMenu wires `onChange` internally and
   exposes its own typed `onCheckedChange(key, checked)`.

## Corvu Solid 2 compatibility status

Still gated: published Corvu packages declare a Solid `^1.8` peer dependency
while this repository uses Solid `2.0.0-rc.0`. No override was introduced.
Kobalte remains the only approved provider for the current catalog; a Corvu
Drawer spike stays blocked until a Solid 2-compatible release.

## React/Radix-to-Solid provider mapping

| React (web) surface | Solid surface | Provider |
| --- | --- | --- |
| `Button` (Radix Slot + cva) | `Button` | Kobalte Button |
| `Input` (Radix slot input) | `Input` | native input, styled only |
| n/a (compound field) | `TextField` | Kobalte Text Field |
| `Dialog` (Radix Dialog) | `Dialog` | Kobalte Dialog |
| n/a (new) | `AlertDialog` | Kobalte Alert Dialog |
| Radix DropdownMenu (inline use) | `DropdownMenu` | Kobalte Dropdown Menu |
| `ActionMenu` (Radix + Sheet mobile) | `ActionMenu` pattern | DropdownMenu parts |
| `sonner` Toaster/toast | `Toaster` + `toast` | Kobalte Toast |
| n/a (new) | `ConfirmDialog` pattern | AlertDialog; calls `onConfirm`, mounts no toaster |

The local PoC `cva` was replaced with the maintained `class-variance-authority`
0.7.1 (re-exported from `src/lib/recipe.ts`). Icons are single-sourced in
`src/components/media/icons.tsx` until the Batch 1 icon foundation.

## A11y results

- In-browser (Storybook a11y addon, axe): 0 violations on the open Dialog
  story in dark and light and on the open ActionMenu story; measured
  primary-button contrast 5.37:1 (text) and 3.5:1 (component) in dark.
- Foreground and solid roles use separate semantic tokens. Dark-theme values
  differ from the web reference to meet WCAG AA: `--primary`
  `oklch(0.55 0.2 29)` (web `0.637 0.237 29` is 3.82:1 vs white), `--primary-text`
  `oklch(0.7 0.17 29)` (6.54:1 vs page, measured in-browser), `--destructive`
  `oklch(0.58 0.21 25)` (web value was 4.41:1), `--destructive-text`
  `oklch(0.7 0.17 25)` (5.71:1 vs popover, measured in-browser). Light theme:
  `--primary oklch(0.53 0.19 29)`, `--primary-text oklch(0.5 0.18 29)`,
  `--destructive-text oklch(0.25 0.02 250)`. Per-theme `--primary-hover`/
  `--destructive-hover` tokens keep hover states above 4.5:1. **Web parity
  flag:** the React repo's tokens still carry the failing values; a web audit
  item is warranted.
- Vitest runs axe on every component test (`expectNoA11yViolations`) with the
  `region` rule disabled (component-level renders have no page landmarks);
  jsdom cannot evaluate CSS contrast, which is why in-browser measurement
  backs the token split.
- ConfirmDialog mounts no toaster; tests assert no `region`/`status` elements
  appear after confirm.
- Toast announcement priority: informational/success/warning toasts render
  `aria-live="polite"`; error toasts render `aria-live="assertive"`. Tests
  assert the live-region attribute per type.
- Visible labels now drive accessible names everywhere: Dialog footer actions
  are plain Buttons using dialog-context close ("Cancel", "Save changes"), and
  only the icon X is a close button ("Close"). No `Dismiss` names remain.

## SSR results

`renderToString` smoke checks pass for all nine surfaces under node resolution
(no module-scope `window`/`document` in design-system code). The Kobalte
dependency chain (`@solid-primitives/platform`) is SSR-safe only when
`@solidjs/web` resolves to the server build, hence the dedicated node project.

## Open items (Batch 1+)

- Port the React Storybook locale/direction controls and add explicit
  mobile/RTL stories where layout changes (Dialog/ConfirmDialog footers).
- Batch 1 foundation: tokens docs, Type, IconButton, Label, Separator,
  Skeleton, Spinner, Tooltip, Card, LayoutShell.
- Re-check the Kobalte patch and recorded mismatches against each new alpha.
- Consider a web-side contrast audit of `--primary`/`--destructive` parity.
