# Post-Launch Worklist

## 1. Pirate Ecosystem Karma on Profiles

Goal: show a user's aggregate Pirate karma on their profile, with a click-through breakdown by community.

Launch constraint: do not block launch on this. The current profile should not show account join date, and should not show a placeholder or imported Reddit score as Pirate karma.

Product decisions:

- Decide whether the aggregate includes all community-local karma or only karma from communities visible to the viewer.
- Add user privacy controls for showing the aggregate and/or community breakdown.
- Add community controls for whether member karma from that community can appear on public profiles.
- Define private/gated community behavior, such as including hidden rows in the aggregate but hiding names from unauthorized viewers.
- Keep the distinction between Pirate ecosystem karma and global platform reputation clear.

Data model direction:

- Keep community-local reputation authoritative in each community database.
- Maintain a Pirate-level read model of per-user, per-community karma snapshots for ecosystem-wide profile display.
- Derive the aggregate from the read model instead of storing a hand-maintained total.
- Support spun-out communities publishing accurate reputation snapshots back into the Pirate ecosystem index.

Profile UX:

- Show an aggregate `Karma` stat on the profile once backed by real Pirate community reputation.
- Clicking or tapping the stat opens a breakdown sorted by community karma.
- Breakdown rows should show community, effective karma, trust tier, and last updated time when appropriate.

Engineering notes:

- Avoid naming the stored aggregate `global_karma`; prefer `ecosystem_karma` or derive `total_effective_karma`.
- Use `effective_karma` for trust/display unless product explicitly wants raw component totals.
- Add API contract fields only after the privacy and community visibility rules are decided.

## 2. Commerce Observability and Effect Hardening

Goal: make the most sensitive purchase, settlement, and entitlement paths observable first, then incrementally move the riskiest control flow to typed Effect programs.

Launch constraint: do not block launch on the full rewrite. Sentry capture is proven for backend 500s; source maps, alerting, and deeper workflow instrumentation can happen after launch.

Immediate observability work:

- Backend Sentry smoke test is complete: `GET /__debug/sentry-error` reaches the backend Sentry project from the Wrangler-backed Worker path.
- Confirm event details after launch as needed: `route`, `method`, `status`, environment, and redacted request headers.
- Trigger or simulate one scheduled task failure and confirm `scheduled_task` is present.
- Configure source map upload in CI with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.
- Add alert rules for `rollback_failed`, `receipt_timeout`, `rpc_revert`, `operator_unauthorized`, `config_invalid`, and `libsql_busy_exhausted`.
- Capture a before/after bundle size benchmark for the Sentry integration.

Domain tagging work:

- Add request and workflow tags where they are naturally available: `request_id`, `user_id_hash`, `purchase_id`, `community_id`, `quote_id`, `chain_id`, `settlement_kind`, `error_tag`, `error_stage`, and `tx_hash`.
- Keep raw user identifiers, auth headers, session IDs, anonymous IDs, wallet private data, and cookies out of Sentry.
- Prefer stable, low-cardinality tags for alert routing; put high-cardinality values in contexts or extras only when needed for debugging.

Effect pilot scope:

- Start with Story-native purchase settlement, not broad route or repository rewrites.
- First candidate: the `settlePurchaseOnStory` flow in `settlement-service.ts`, especially the sequence that reserves settlement effects, calls Story royalty settlement, mints locked-asset entitlement, confirms or fails effects, and finalizes local purchase rows.
- Second candidate: transaction and retry helpers around local write finalization, including rollback failure capture and `libsql_busy` exhaustion handling.
- Third candidate: Story RPC calls that need typed error categories for receipt timeout, revert, operator authorization, invalid config, and insufficient signer balance.

Effect design direction:

- Define a small error taxonomy before moving code: validation, conflict/idempotency, config, database, external RPC, receipt timeout, revert, authorization, rollback failure, and invariant violation.
- Introduce `withWriteTransaction` as a narrow helper with explicit commit/rollback behavior and Sentry capture on rollback failure.
- Use retry schedules only around operations that are actually safe to retry, such as transient database busy errors or receipt polling.
- Preserve existing idempotency keys and settlement effect rows as the source of truth for whether an external side effect has already happened.
- Keep route handlers thin; convert Effect results back to the existing `HttpError` and response contracts at the boundary.

Acceptance criteria:

- Sentry events for settlement failures carry enough tags to route alerts and diagnose the affected purchase without querying logs first.
- Retried operations are idempotent by construction, not by convention.
- A failed Story side effect records a failed settlement effect with a useful error stage.
- A confirmed external side effect is never repeated after a retry or worker restart.
- The first Effect pilot reduces branching and error ambiguity in one sensitive flow without forcing a repo-wide rewrite.

## 3. Customizable Notifications

Goal: let users decide which notifications they receive, where they receive them, and whether an AI bot should help triage or deliver lower-priority updates.

Launch constraint: do not block launch on full preference management. The current inbox and badge experience can remain the default until delivery channels, permission prompts, and bot behavior are specified.

Product decisions:

- Define notification categories users can tune, such as replies, mentions, community moderation tasks, royalty and purchase events, agent activity, direct messages, and system notices.
- Decide which channels are supported first: in-app inbox, badge counts, email, push, XMTP/chat, and AI bot summaries.
- Decide whether preferences are global only, community-specific, conversation-specific, or a mix.
- Define sane defaults so important security, commerce, and moderation events are not silently suppressed.
- Clarify whether "Bedsheet" is the AI bot surface, a bot persona, or an internal delivery workflow before naming it in user-facing settings.

Preference UX:

- Add a settings surface where users can choose per-category delivery channels.
- Support simple modes like `All`, `Priority only`, `Digest`, and `Off` before exposing advanced per-event controls.
- Let users pick digest cadence, quiet hours, and community-level overrides once basic routing is stable.
- Make irreversible or high-stakes notifications visibly non-optional, with copy explaining why.

AI bot direction:

- Treat bot-delivered notifications as a channel with explicit opt-in and clear provenance.
- Let users choose whether the bot sends immediate pings, daily summaries, or only actionable items.
- Keep bot summaries traceable back to the original notification events.
- Prevent the bot from revealing private community or gated content in channels where the user may not expect that context.

Data model direction:

- Store notification preferences as structured settings keyed by user, category, channel, and optional community scope.
- Keep notification events authoritative even when a user disables delivery; preferences should affect routing, not event creation.
- Record delivery receipts per channel so support and analytics can distinguish generated, routed, delivered, read, dismissed, and failed states.
- Version the preference schema so new notification types can inherit safe defaults without breaking older users.

Acceptance criteria:

- A user can change at least one notification category and see routing behavior change without deleting historical inbox items.
- Mandatory security, billing, and moderation notifications still reach the user through at least one approved surface.
- Bot summaries include links back to the source items and respect community visibility rules.
- Analytics can report opt-in rates and delivery success by notification category and channel without storing sensitive message content.

## 4. External Boundary and Code Health Hardening

Goal: reduce production risk from malformed external data, weak client-only identifiers, and slow codebase drift without blocking launch.

Launch constraint: do not block launch on a repo-wide validation or cleanup sweep. The current critical security fixes are in place; this work should be incremental and targeted at unstable boundaries first.

Runtime validation scope:

- Add lightweight runtime validation at external fetch and storage boundaries before expanding into internal APIs.
- Start with Story CDR access payloads, EFP API responses, XMTP-derived records, public SEO metadata fetches, and persisted JSON in browser storage.
- Prefer narrow schema modules close to each integration instead of introducing a broad validation layer everywhere at once.
- Treat validation failures as typed, user-safe errors with enough internal context for debugging, but no raw payload logging.

Client ID cleanup:

- Replace remaining `Math.random()` draft IDs with `crypto.randomUUID()` where IDs can be opaque.
- Keep deterministic IDs only where tests, DOM relationships, or persisted contracts require stability.
- Add small fallback helpers only if a target runtime lacks `crypto.randomUUID()`.

Dead export policy:

- Run an orphan export audit for production `src/lib` and `src/app` surfaces.
- Remove true production orphans instead of keeping hypothetical extension points.
- Exclude stories, mocks, generated files, vendor files, and explicitly named test helpers such as `__reset...ForTests`.
- Consider adding a CI check only after the first cleanup pass avoids noisy false positives.

Large file follow-up:

- Split files over roughly 500 LOC on the next meaningful touch when review becomes hard.
- Prioritize route/controller files that mix data loading, state machines, UI composition, and side effects.
- Preserve current behavior while extracting named helpers or hooks; avoid cosmetic decomposition that only moves code around.

Acceptance criteria:

- External integration failures fail closed with typed, user-safe messages instead of unchecked casts.
- No client draft ID path depends on `Math.random()` where `crypto.randomUUID()` is available.
- Production orphan exports trend down without breaking story/test ergonomics.
- Large file splits reduce review complexity in touched areas without broad rewrites.
