# Global Search Status

Last updated: 2026-06-10

## Purpose

Pirate global search should provide lightweight discovery across public Pirate resources without opening community databases in the search path. The MVP is intentionally control-plane-only and eventually consistent.

This document is a task handoff/status note, not a separate product spec. The implementation lives across the `api/` and `web/` repositories.

## Current Status

### API / MCP

Implemented in the API repository:

- `GET /search`
  - Bounded cursor response.
  - Canonical `object` / `id` shape.
  - `score_decimal` is a string.
  - Optional `kinds` filter.
  - Server-generated `suggestions` derived from ranked public profile/community display names.
  - `cache-control: no-store`.
  - Latency and candidate-count instrumentation via `logPipelineInfo` (`[search] completed`): `query_length`, `has_cursor`, `requested_kinds`, `limit_per_kind`, `candidate_count`, `ranked_count`, `result_count`, `suggestion_count`, `has_more`, `duration_ms`.

- `searchPirate` service
  - Pure query normalization and ranking helpers.
  - Searches public candidates from a `SearchControlPlaneClient`.
  - Filters non-public candidates defensively after source fetch.
  - Paginates with opaque base64url cursors.

- Control-plane source
  - Profiles / primary ENS linked handles.
  - Agents.
  - Active communities.
  - Public/routable namespaces.
  - Published public post projections.
  - No comments in MVP, because comment projections do not have body excerpts.

- MCP `search_pirate`
  - Advertised in `tools/list`.
  - Delegates to the same `searchPirate` service.
  - Returns canonical web links only.
  - Does not return capabilities or policy matrices.

Latency contract for MVP:

- Search reads open zero Turso/community DBs.
- No per-result hydration in the search path.
- No capabilities, previews, policy matrices, or board permission payloads in search results.
- The tradeoff is eventual consistency through control-plane projections.

### Web

Implemented in the web repository:

- Persistent top search in the app header.
- `GlobalSearchBox` autocomplete surface.
  - Supports uncontrolled header use and controlled `/search` route use through `value`, `onValueChange`, and `onSubmit`.
- `SearchAutocompletePanel` with:
  - unlabeled server-provided query suggestions at the top,
  - typed result sections below (`Profiles`, `Communities`),
  - local recents when the input is focused and empty,
  - loading, empty, and error states,
  - a single flat display list shared by keyboard navigation, `aria-activedescendant`, and DOM order,
  - keyboard selection, Escape, and outside-click close.
- `/search?q=...` route page with cursor-based Load more.
- Web API client group for `/search`.
- React Query hooks for autocomplete and paged search.
- Storybook stories render the real `GlobalSearchBox` against a stubbed `fetch` for idle, recents, loading, results, profiles, suggestions-only, empty, error, and narrow layout.
- Removed the old `searchUnavailableToast` stub.

Production profile-row contract (locked in this slice):

- `title` is `COALESCE(NULLIF(profile.display_name, ''), global_handles.label_display)`. The display name is shown first, falling back to the bare handle label.
- `subtitle` is `@<handle>.pirate`.
- Example: `Blackbeard` / `@blackbeard.pirate`. There is no `u/` prefix in the title.

Current autocomplete behavior:

- Bare queries request `profile,community` for autocomplete. If profile matches come back, the dropdown can show `Profiles` without requiring `u/`.
- `u/...` and `@...` narrow autocomplete to profiles.
- `/c/...` and `/r/...` narrow autocomplete to communities.
- The full `/search` page still uses the broad global search result set.

## Linked Findings: Candidate-Window Retrieval

The full-search source and cursor pagination are the same architectural constraint, not two independent problems:

- SQL retrieves a bounded candidate window per kind (`limitPerKind = max(limit * 4, 50)`).
- The pure ranker cannot recover matches excluded by SQL.
- Cursor pagination only traverses that window, not the complete matching dataset.

Treat candidate-window retrieval, multi-token recall, and pagination bound as one measured problem. Do not independently "fix recall" and "fix pagination" before deciding whether observed scale requires a dedicated index.

## Performance Gate

A dedicated search index is gated on measured workload, not on theory. Provisional budget:

- Dataset: 100k profiles, 10k agents, 25k communities/namespaces, 1M projected posts.
- Autocomplete: profiles and communities only.
- Full search: all current kinds.
- Query mix: exact handles/IDs, prefixes, contains matches, multi-token phrases, and no-result queries.
- Measure warm and cold runs separately.
- Autocomplete target: p95 ≤ 200 ms warm, ≤ 400 ms cold.
- Full-search target: p95 ≤ 500 ms warm, ≤ 1 second cold.
- Also record `candidate_count`, `ranked_count`, `result_count`, `suggestion_count`, and serialized response size.

These are provisional budgets. Real production cardinalities should replace the fixture sizes once they are observed. Actual benchmarking requires a representative dataset that does not exist yet, so the gate is documented but unmeasured. The `[search] completed` log line is the source of truth for production measurements.

## Accessibility

The anchored autocomplete is a non-modal combobox. It does not use focus trapping; focus stays in the input while `aria-activedescendant` identifies the active option.

Production criteria:

- `role="combobox"` with accurate `aria-expanded`.
- `aria-controls` references the mounted listbox.
- Every active descendant ID exists exactly once.
- Visual order, DOM order, keyboard order, and selection order are identical. The flat `displayItems` array is the single source of truth for all four.
- Arrow navigation wraps predictably.
- Escape closes without clearing or moving focus.
- Pointer hover updates the active descendant.
- Screen readers can announce section headings without treating them as options. Section headings carry `aria-hidden="true"` and `role="presentation"`.
- Loading, error, and empty changes use an appropriate live region.
- Tab leaves the combobox normally; no focus trap.

The grouped-index bug previously violated the active-descendant and visual-order contract; it is now regression-tested.

## Suggestion Empty State

Resource-name completions have a discoverability failure mode: when no matching resources exist, users receive no guidance, and the current system cannot suggest related or historically successful queries.

The empty state contract is based on both collections:

```text
empty = suggestions.length === 0 && results.length === 0
```

This prevents a future regression where valid suggestions are displayed alongside an incorrect "No matches" state. The contract is regression-tested.

## Deliberate Deferrals / Non-Goals

- No `global_search_documents` table or dedicated search index yet. The performance gate must be measured before this is reconsidered.
- No comment search until comment body excerpts are projected into the control plane.
- No transfer/federation/sovereign-community schema beyond the predicates already required by the current source.
- No fake trending. Trending needs a real backend signal.
- No popularity/history-based suggestion corpus yet. Current suggestions are deterministic completions derived server-side from ranked public profile/community display names.
- No mobile search sheet yet. Mobile currently routes to `/search`.
- No federated/sovereign search behavior. The control plane is the only search source.

## Current Verification

API repo:

```bash
rtk bun test services/api/tests/routes/search-routes.test.ts services/api/tests/routes/mcp-routes.test.ts
```

Result: 26 passing.

Web repo:

```bash
rtk bun test src/lib/api/client.test.ts src/lib/api/use-search-results.test.tsx src/components/compositions/app/app-shell-chrome/global-search-box.test.tsx src/app/authenticated-routes/search-route.test.tsx src/app/router.test.ts src/app/route-manifest.test.ts
```

Result: 79 passing (was 74; added five controlled-mode and navigation tests).

Targeted Biome on changed web search files is clean.

`rtk bun run types:safe` in `web/` is still blocked by unrelated existing errors:

- `src/app/authenticated-state/use-domains-tab.ts`: `paidQuote` possibly null.
- `src/lib/query/public-thread-cache.ts`: missing `karaoke_enabled` in a `CommunityPreview` fixture/value.

No search files are reported by that type pass.

`rtk bun run --cwd services/api check` is blocked by unrelated pre-existing errors in `services/api/src/lib/communities/commerce/settlement-service.ts` and `services/api/src/lib/search/rank-search-results.test.ts` (`toSorted` requires ES2023+ lib). No new search errors are introduced by the instrumentation change.

`rtk bun run ui:audit` reports a pre-existing `text-sm` violation on `search-autocomplete-panel.tsx:174` (recents clear button) that pre-dates this slice. Out of scope to fix here.

## Important Follow-Ups

1. Build a representative synthetic dataset and run the performance gate. Record `candidate_count`, `ranked_count`, `result_count`, `duration_ms` from the `[search] completed` log line.
2. Decide whether the measured workload justifies a dedicated search index. The current SQL plan is gated, not assumed broken.
3. Decide whether resource-name completions are sufficient or whether a behavioral suggestion corpus is required. The empty-state contract locks the panel behavior either way.
4. Decide whether autocomplete should request profiles and communities only, or also include agents once agent discovery UX is ready.
5. Add a mobile-specific search sheet if routing directly to `/search` feels too abrupt.
6. Add comment search after control-plane comment body excerpts exist.
7. Revisit score display/ranking only if the UI starts showing score/confidence. The UI currently does not display `score_decimal`.

## Key Files

API repo:

- `services/api/src/lib/search/search-service.ts`
- `services/api/src/lib/search/control-plane-source.ts`
- `services/api/src/lib/search/normalize-search-query.ts`
- `services/api/src/lib/search/rank-search-results.ts`
- `services/api/src/routes/search.ts`
- `services/api/src/lib/mcp/search-tools.ts`
- `services/api/src/lib/mcp/community-tools.ts`
- `services/api/tests/routes/search-routes.test.ts`
- `services/api/tests/routes/mcp-routes.test.ts`

Web repo:

- `src/lib/api/client-groups-search.ts`
- `src/lib/api/use-search-results.ts`
- `src/components/compositions/app/app-shell-chrome/global-search-box.tsx`
- `src/components/compositions/app/app-shell-chrome/search-autocomplete-panel.tsx`
- `src/components/compositions/app/app-shell-chrome/search-result-row.tsx`
- `src/components/compositions/app/app-shell-chrome/stories/global-search-box.stories.tsx`
- `src/app/authenticated-routes/search-route.tsx`
- `src/app/shell/app-shell-header.tsx`
