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

## 2. Customizable Notifications

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
