# Reward ticket fulfillment policy

Date: 2026-08-12

## Status

This is the locked planning basis for Megapot ticket rewards. The Storybook
components render the intended states but are not connected to production
controllers or backend contracts yet.

## Campaign terms

A ticket campaign has `reward_kind = "megapot_ticket"` and an immutable
`max_ticket_cents` ceiling. The ceiling is an economic term, so it must be part
of the canonical terms payload covered by `terms_hash`. Two otherwise identical
campaigns with different ceilings must produce different hashes.

The ceiling is set when the campaign is created and is never repriced in place.
A funder who wants a different ceiling creates a new campaign after the current
one reaches a terminal state.

## Quote and qualification policy

The application maintains a durable cached ticket-price quote. Refreshing or
verifying that quote happens outside the qualification database transaction,
using the repository's existing claim-token and compare-and-set pattern for
RPC-backed verification.

A fresh cached quote is only an admission check:

- If the current ticket price is at or below `max_ticket_cents`, qualification
  may proceed.
- If the price exceeds `max_ticket_cents`, qualification is blocked and no
  reservation is created.
- If the quote is missing or stale, qualification is blocked and no reservation
  is created.

Every admitted qualification reserves exactly `max_ticket_cents`. The cached
or live ticket price never sizes the reservation. This protects an admitted
fulfillment from ordinary price movement below the funder's accepted ceiling.

The cache record must preserve enough evidence to audit admission, including
the chain, ticket product or drawing, payment token, quoted atomic and cents
amounts, observation time, and expiry time. The exact cache TTL and freshness
alert threshold must be selected before implementation.

Quote freshness is operational health, not only a UI state. Monitoring and an
alarm for stale or missing quotes ship with the first ticket-reward release so
a dead price feed cannot silently reduce qualifications to zero while general
service health remains green.

## Fulfillment state machine

Every qualification creates one retry-safe fulfillment effect with a stable
idempotency key. Chain RPC work occurs outside database transactions. Durable
state and evidence allow a worker to resume without buying a duplicate ticket.

| State | Reservation behavior | User meaning |
| --- | --- | --- |
| `reserved` | Hold the full ceiling | Purchase is queued |
| `submitted` | Keep the full ceiling reserved | Transaction awaits confirmation |
| `confirmed` | Move actual cost to fulfilled and release the delta | Ticket was delivered |
| `failed` | Release the full reservation | Terminal failure; safe to retry |
| `reservation_expired` | Release the full reservation | Work did not start before its claim expired |
| `needs_review` | Keep the full reservation | Outcome is uncertain and must be reconciled |

A confirmed effect records the transaction hash, ticket identifier, actual
atomic payment, actual cents cost, block evidence, and confirmation status.
Reorg handling follows the same confirmation and reconciliation discipline as
existing on-chain funding receipts.

## Accounting policy

Ticket delivery is not a user cash liability. Add `fulfilled_cents` to the
campaign accounting model and preserve these invariants:

```text
reserved_cents + credited_cents + fulfilled_cents + refunded_cents <= funded_cents
paid_cents <= credited_cents
```

On confirmation, remove the full ceiling from `reserved_cents`, add the actual
ticket cost to `fulfilled_cents`, and return the difference to the campaign's
available funding. A price decrease therefore restores more availability; a
price increase within the ceiling restores less. A terminal failure or expired
reservation releases the entire ceiling. `needs_review` retains it.

The schema migration is incomplete until every reader of the existing counters
understands `fulfilled_cents`. This includes, at minimum:

- Core migrations and audit views for campaign safety, refund execution,
  solvency observations, top-up budget checks, funding retirements, and
  rehearsal fixtures (`0134`, `0135`, `0149`, `0150`, `0159`, `0160`, `0192`,
  `0195`, and `0202`).
- API availability, lifecycle and retirement gates, the campaign reconciler,
  campaign creation and serialization, visibility, solvency monitoring and
  gates, read services, rehearsal code, song-practice reconciliation, service
  contracts, generated API contracts, and their fixtures and tests.
- Cashout and paid-liability readers, which must be audited and explicitly keep
  cash-only semantics where appropriate rather than accidentally treating a
  fulfilled ticket as withdrawable cash.

The migration window must assert old and new counter projections agree for
cash campaigns before the new invariant becomes authoritative.

## Delivery order

1. Commit the Storybook cleanup and this policy.
2. Merge the inert Storybook review artifact.
3. Land claim hardening and the first-time-claimant acceptance check.
4. Wire multi-funder top-up into the merged `top_up` sheet state.
5. Implement the cached-price, fulfillment-effect, freshness-alarm, and
   `fulfilled_cents` backend contract together.
6. Add Study and Karaoke objective slots and then move claim uniqueness to the
   objective-scoped boundary.

Claim hardening remains a prerequisite for the objective-scoped claim change.
ERC-20 registry and atomic-accounting work remains a separate later project;
community-token campaigns must not be inferred from this USDC ticket rail.

## Storybook infrastructure note

The Storybook Vite configuration deduplicates `react` and `react-dom` for the
entire catalog. This prevents isolated worktrees from loading two React
instances. Because the setting is repository-wide rather than reward-specific,
the pull request must disclose it and include an unrelated-story smoke result.
