# Auth Origin Guard Rollout

> Extracted from `auth-origin-spec.md`.
> Last reviewed: 2026-05-31.

Generic community interactions now flow through `use-community-interaction-gate.tsx`, which shows the canonical "Open in Pirate" CTA off canonical auth origins before attempting Privy.

Covered:

- [x] `public-community-route.tsx` — follow and join CTAs
- [x] `community-route.tsx` — join, vote, comment, and create-post gated actions
- [x] `post-route.tsx` — post auth prompts and gated interaction actions
- [x] Home feed — unauthenticated vote actions

Remaining:

- [ ] Wallet/royalty claim connect flows still call Privy directly from wallet UI. Either keep wallet routes canonical-only or route wallet connect attempts through the same auth-origin helper before exposing them on custom namespace hosts.
