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
