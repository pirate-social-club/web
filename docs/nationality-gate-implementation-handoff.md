# Identity Gate Implementation Notes

Last reviewed: 2026-05-31.

This file used to be a backend-to-web handoff for the first nationality gate rollout. That implementation has landed and the old file-by-file replacement instructions are no longer current. Use this document as the current map for identity-gated communities in `pirate-web`.

## Current Model

Community access is now expressed through `gate_policy`, not the older one-off `gate_rules` handoff shape. The web draft type is `IdentityGateDraft` in:

- `src/components/compositions/community/create-composer/create-community-composer.types.ts`

Supported draft gate types today:

- `altcha_pow`
- `unique_human` via Very
- `nationality` via Self or ZKPassport-compatible document providers
- `minimum_age` via document providers
- `gender` via document providers
- `wallet_score` via Passport
- `erc721_holding`
- `erc721_inventory_match` via Courtyard inventory metadata

The create-community composer currently works with `request` and `gated` membership modes. Moderation/access settings use the same draft model so create and edit flows stay aligned.

## Main Web Entry Points

- `src/components/compositions/community/create-composer/`
  Owns the create-community UI, validation, review state, and draft gate editing.
- `src/app/authenticated-routes/create-community-route.tsx`
  Uploads avatar/banner media, serializes gate drafts with `serializeIdentityGateDrafts`, and sends `api.communities.create`.
- `src/app/authenticated-state/use-community-access-state.ts`
  Loads existing gate policy into drafts for moderation settings and saves edits through `api.communities.updateGates`.
- `src/app/authenticated-helpers/community-gate-rule-serialization.ts`
  Converts `IdentityGateDraft[]` to the API `gate_policy` contract.
- `src/app/authenticated-helpers/moderation-helpers.ts`
  Converts API gate policy summaries back into edit drafts.
- `src/lib/identity-gates.ts`
  Formats requirements and join CTAs from API `membership_gate_summaries`, `gate_evaluation`, and `JoinEligibility`.
- `src/hooks/use-community-interaction-gate.tsx`
  Handles join, vote, comment, verification, and proof-of-work gating for community interactions.

## API Client Surface

The current API client is split across groups:

- `src/lib/api/client-groups-communities.ts`
  Community create, reads, media upload, live rooms, and composed community APIs.
- `src/lib/api/client-groups-community-membership.ts`
  `preview`, `getJoinEligibility`, `join`, follow/unfollow, and membership request actions.

`ApiError` already carries `details`, so gate failures can read structured backend failure information.

## Viewer Flow

Authenticated and public community pages load community preview data before owner-only metadata:

- `api.communities.preview(communityId, { locale })`
- `api.communities.getJoinEligibility(communityId)` when a session exists or an action needs it

Owner-only `api.communities.get()` is optional for viewer rendering. If it fails for a non-owner, the route uses preview data instead of blocking the page.

## Verification Providers

Self and ZKPassport document verification can satisfy document-style gates such as nationality, minimum age, and gender when the API gate evaluation requests those capabilities. Very is used for unique-human gates. Passport wallet score and wallet/NFT gates are not document verification flows.

ALTCHA proof-of-work is handled as an interaction gate. Proofs are scoped to the exact action, such as community join, post/comment create, or vote.

## When Touching This Area

Run focused tests for the touched surface first:

```bash
rtk bun test src/components/compositions/community/create-composer/create-community-composer.test.tsx
rtk bun test src/app/authenticated-state/use-community-access-state.test.tsx
rtk bun test src/hooks/use-community-interaction-gate.helpers.test.ts
```

Then run:

```bash
rtk bun run types:safe
rtk bun run ui:audit
```

Avoid resurrecting the old chip-only nationality gate model. New gate UI should update `IdentityGateDraft`, serialization, summary formatting, and focused tests together.
