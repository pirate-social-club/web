# Reward ticket pool policy

Date: 2026-08-13

## Status

This is the authoritative planning basis for Megapot rewards. It supersedes the
per-qualification, direct-to-earner ticket policy previously stored at this
path.

Megapot is a daily pooled reward attached to a song. The platform holds one or
more tickets for a drawing and credits any winnings across the verified people
who qualified by singing that song during the drawing's entry period.

The reward Storybook artifact is already on `main`, but its ticket fulfillment
and wallet stories still model user-owned tickets and user-initiated claims.
Those parts are superseded by this policy, remain unconnected to production
controllers, and must not be used as an implementation contract.

## Product contract

- Any eligible song may have a ticket pool alongside its Study and Karaoke
  bounties.
- A pool funds `tickets_per_drawing` tickets for each drawing while it has
  enough available budget and at least one qualifying singer.
- A verified person receives at most one beneficiary position for a song and
  drawing, regardless of how many qualifying attempts they submit.
- If any ticket assigned to that song and drawing wins, v1 divides the total
  net USDC claim proceeds equally across that drawing's frozen beneficiaries.
- V2 may weight that same frozen set by streak, using streak values snapshotted
  before the drawing resolves.
- A person does not own a ticket and does not call Megapot to claim. Their
  allocated winnings become an in-app USDC balance backed by the custody
  account until cashout.
- Zero beneficiaries means no purchase, no reservation, and no spend for that
  drawing.

Lower participation on a funded song intentionally means a larger potential
share for each singer if the pool wins. This is an attention-allocation
mechanic: it gives people a reason to discover under-sung funded music. It is
not a separate random draw among singers, so Chainlink VRF and a winner-selection
beacon are not part of v1.

## Protocol assumptions

The integration documentation reviewed on 2026-08-13 states:

- tickets cost 1 USDC and the protocol draws daily;
- a purchase is bound to the current drawing and does not roll forward;
- a purchase can send ticket NFTs to a specified recipient and accepts at most
  10 tickets per transaction;
- the jackpot exposes 12 payout tiers, including partial-match payouts; and
- only the ticket holder can claim its winnings.

These are integration assumptions, not constants to hardcode. Before shipping,
verify the live contracts, ABIs, addresses, drawing schedule, ticket price,
number limits, payout tiers, ownership rules, and claim behavior. Runtime copy
must use live prize and drawing data.

## Separation from cash bounties and ERC-20 rewards

The ticket pool is a parallel song overlay, not a `reward_kind` inside the
Study/Karaoke slot identity. It must not occupy or block either objective slot.
A qualifying performance may independently earn a cash or community-token
bounty and enter the song's ticket pool.

The pool is a separate logical entity with its own identity, terms, budget,
purchase effects, drawings, beneficiary snapshots, claims, and allocations.
Implementation may reuse proven reward funding and reconciliation machinery,
but must not overload a cash campaign row in a way that reintroduces slot
conflicts.

Megapot ticket purchases and winnings use USDC. Community-selected ERC-20
assets remain a separate registry and atomic-accounting project. The ticket
pool neither solves nor blocks that work. Its atomic USDC winnings ledger is a
narrow custody requirement, not a generic multi-asset abstraction.

## Pool identity and immutable terms

V1 permits one non-terminal ticket pool per `(community_id, post_id)`. Ended or
canceled pools release that identity. Exhausted pools remain discoverable and
may be revived by an authorized top-up.

The immutable terms payload includes at least:

- community and song identity;
- qualifying activity and score threshold;
- identity-verification requirements;
- `tickets_per_drawing`;
- `max_ticket_cents`;
- entry cutoff policy and drawing association policy;
- beneficiary algorithm version (`equal_v1` initially); and
- referral and source-attribution policy.

Every economically meaningful term, including `max_ticket_cents` and
`tickets_per_drawing`, is covered by `terms_hash`. Terms are never repriced or
reweighted in place. A materially different offer requires a new pool after
the current one reaches a terminal state.

Third-party funding policy applies to pool creation and top-up in the same way
as cash bounties: an owner opt-out blocks other funders, not the song owner.

## Drawing period and daily loop

The period key is derived from the Megapot chain, contract, and drawing ID—not
from a loosely interpreted calendar date. Product copy may say "today" only
when the drawing schedule and local display timezone make that accurate.

Each drawing follows this sequence:

1. **Entry.** Accept one qualifying beneficiary position per verified reward
   identity for the song and drawing until the published cutoff.
2. **Freeze.** At cutoff, freeze the canonical beneficiary list. If the list is
   empty, close the period without spending.
3. **Commit.** Publish a commitment to the frozen list before the drawing can
   resolve.
4. **Reserve.** If the cached price is fresh, within the ceiling, and the pool
   can fund the full ceiling reservation, reserve
   `tickets_per_drawing * max_ticket_cents`.
5. **Purchase.** Buy the configured ticket count for the current drawing with
   the custody account as recipient, batching transactions when required.
6. **Confirm.** Record ticket IDs, drawing ID, actual cost, transaction and
   block evidence, and release the unused reservation delta.
7. **Sweep.** After the drawing resolves, inspect every held ticket for a
   payout tier.
8. **Claim.** The custody account claims all winning tickets with retry-safe,
   reconciled effects.
9. **Allocate.** Aggregate the net USDC proceeds for the song and drawing,
   compute the beneficiary allocations, and atomically credit them once.

The cutoff must leave enough time for purchase confirmation before the drawing.
A performance arriving after cutoff enters the next eligible drawing rather
than mutating the committed set.

## Beneficiary commitment

The commitment is load-bearing because the platform learns the ticket outcome
before it distributes winnings. An internal timestamp is insufficient proof.

For each song and drawing, canonicalize and hash at least:

- pool ID and drawing ID;
- ordered reward identity IDs or privacy-preserving stable commitments;
- qualification evidence references;
- algorithm version; and
- for v2, the frozen streak weight for every beneficiary.

Before the Megapot drawing resolves, publish an externally timestamped batch
root covering every pool snapshot for that drawing. Store the inclusion proof
with each snapshot. Anyone auditing a payout must be able to reconstruct the
root and confirm that beneficiaries and weights were fixed before the outcome
was known.

This commitment protects the beneficiary set; it does not choose a winner.
Every committed beneficiary shares every net win according to the committed
algorithm.

## Price admission and purchase reservation

Maintain a durable cached ticket-price quote. Refresh and verification happen
outside database transactions using the repository's existing leased claim and
compare-and-set pattern for RPC-backed work.

The quote is an admission check only:

- fresh price at or below `max_ticket_cents`: the drawing may proceed;
- price above the ceiling: no reservation or purchase; and
- quote missing or stale: no reservation or purchase.

The reservation is always
`tickets_per_drawing * max_ticket_cents`; the quote never sizes it. A confirmed
purchase converts actual cost to fulfilled spend and returns the delta to pool
availability.

The cached record preserves chain, contract, drawing, payment token, quoted
atomic and cents amounts, observation time, expiry, and evidence. Quote TTL and
alarm thresholds are release-blocking parameters. A stale or missing feed must
page operationally rather than silently produce days with no tickets.

## Ticket custody

Tickets are held by a dedicated custody account, separate from the purchase
operator and reward treasury. The purchase call names the custody account as
ticket recipient; only that account claims winnings.

The custody design assumes an unexpected top-tier payout. It requires:

- multisig-controlled recovery and governance from day one;
- narrowly allowlisted purchase, ticket-inspection, and claim operations;
- separation of submitter authority from recovery authority;
- durable ticket inventory reconciliation by drawing;
- balance and liability reconciliation after every claim and credit batch; and
- an incident path for a lost, paused, or ambiguous transaction.

Key loss is not recoverable through application bookkeeping when the protocol
requires the ticket holder to claim. Custody readiness is therefore a release
gate, not a follow-up hardening task.

## Purchase and claim effects

Every purchase and claim uses a stable idempotency key and durable chain
evidence. RPC work occurs outside database transactions.

Purchase effects use:

| State | Reservation behavior | Meaning |
| --- | --- | --- |
| `reserved` | Hold the full ceiling | Purchase is queued |
| `submitted` | Keep the full ceiling reserved | Transaction awaits confirmation |
| `confirmed` | Move actual cost to fulfilled and release the delta | Tickets are held for this drawing |
| `failed` | Release the full reservation | Proven terminal failure; re-entry repeats admission |
| `reservation_expired` | Release the full reservation | Work did not start before its lease expired |
| `needs_review` | Keep the full reservation | Outcome is uncertain and must be reconciled |

`needs_review` is leased, bounded work. Each effect has a review deadline, next
reconciliation time, and attempt count. Evidence moves it to `confirmed` or
`failed`. A deadline breach creates an owned operational item. If the outcome
remains ambiguous, the pool enters `operational_hold` and preserves the
reservation. There is no evidence-free release or close action.

Claim effects separately track `detected`, `submitted`, `confirmed`, `failed`,
and `needs_review`. Confirmation records the exact atomic USDC received. A
unique claim key and unique allocation-batch key prevent repeated sweeps from
claiming or crediting the same proceeds twice.

The drawing sweep is recurring operational health. A freshness alarm ships
with v1 so winning tickets cannot remain silently unclaimed.

## Accounting

Purchase budget and pool winnings are distinct ledgers.

### Purchase budget

Funders' USDC pays for tickets. Ticket purchases are not user cash liabilities.
The ticket-pool budget preserves:

```text
reserved_cents + fulfilled_cents + refunded_cents <= funded_cents
```

On confirmation, remove the full ceiling reservation, add actual ticket cost
to `fulfilled_cents`, and return the delta to available funding. Terminal
failure and reservation expiry release the full ceiling. `needs_review` retains
it.

This invariant belongs to the ticket-pool ledger. Reusing existing campaign
counter code requires auditing all safety, refund, solvency, top-up, retirement,
rehearsal, availability, visibility, reconciliation, and monitoring readers so
fulfilled spend can never look refundable or retirable.

### Winnings liability

Claimed winnings come from Megapot, not funders. They never enter
`funded_cents`, pool availability, or cash-bounty solvency calculations.

USDC has atomic precision below one cent, while the current reward balance is
cents-authoritative. Equal division can therefore produce valid sub-cent
shares. V1 must add an atomic-USDC liability and allocation path; it must not
round a beneficiary to zero, report a pool as a zero-dollar win, or silently
retain dust as platform revenue.

For net proceeds `P` atomic units and `N` beneficiaries, allocate `P / N` to
each canonical beneficiary and distribute the `P % N` one-unit remainder in
canonical snapshot order. The allocation sum must equal the exact net amount
received.

Each allocation records asset, atomic amount, derived cents when exactly
representable, claim evidence, pool, drawing, snapshot commitment, algorithm
version, and idempotency key. The existing wallet and cashout experience may
present the resulting USDC balance, but its backend contract must preserve
atomic amounts through aggregation and settlement.

Custody solvency must continuously reconcile:

```text
claimed USDC - cashed-out USDC = outstanding atomic beneficiary liabilities
```

Protocol referral earnings and other platform revenue are separate from net
claim proceeds allocated to beneficiaries. The product must disclose any
protocol-level deduction or win-share that affects the net receipt.

## V1 and v2 distribution

V1 uses `equal_v1`: everyone in the committed beneficiary set receives an
equal atomic share, with deterministic remainder handling as defined above.
The relevant live product number is the current beneficiary count or projected
share denominator—not a claimed probability of winning.

V2 may introduce `streak_weighted_v2`. It must define the weight formula as an
immutable, versioned policy and commit every beneficiary's weight before the
drawing resolves. It must not compute weights after learning the payout.

Changing from equal to streak-weighted allocation does not mutate existing
pool terms or prior snapshots. It requires a new term version or successor
pool and new Storybook review.

## Product and Storybook impact

The discovery mechanic requires a browsable funded-song surface. Each song
shows the current drawing, tickets assigned, entry cutoff, current beneficiary
count, and pool funding state. Under-sung funded songs should be discoverable
without promising a fixed share before cutoff.

The existing Storybook artifacts need a dedicated correction pass:

- replace per-qualification delivery states with entry-open, entered,
  cutoff/frozen, tickets-confirmed, drawing-pending, no-win, winnings-detected,
  claim-pending, credited, and operational-review states;
- remove copy saying a ticket belongs to the singer's wallet;
- remove the user's `Claim winnings` action and user-owned
  `MegapotTicketHolding` model;
- represent winnings as atomic-USDC balance credits with pool/drawing evidence;
- add a ticket-pool card independent of the Study and Karaoke slots; and
- cover zero beneficiaries, stale price, insufficient budget, purchase
  failure, snapshot-commit failure, delayed drawing, sweep stale, small-tier
  dust allocation, multiple winning tickets, and a top-tier win.

Until that pass lands, the deployed but unreferenced ticket compositions are
historical review artifacts only.

## Release-blocking decisions and gates

Before backend implementation begins, settle and record:

- the precise entry cutoff and confirmation lead time relative to each drawing;
- the public append-only commitment channel and proof format;
- custody account implementation and recovery policy;
- cached-price TTL, sweep freshness threshold, and reconciliation SLA;
- beneficiary treatment after account deletion or identity revocation;
- the minimum cashout threshold without a minimum recorded credit;
- referral wallet and win-share disclosure policy; and
- pool cancellation and final-drawing behavior.

V1 does not require VRF or a random-selection service. It does require live
contract verification, custody readiness, public pre-draw beneficiary
commitments, atomic-USDC liability accounting, idempotent claim and credit
effects, and price/sweep freshness alarms.

## Delivery order

Already complete:

1. Merge the inert Storybook review artifact.
2. Land claim hardening and the first-time-claimant acceptance check.

Next:

1. Correct this policy on `main`.
2. Finish the permanent-pool resolver and multi-funder top-up controller,
   including removal of the live-bounty UI blocker.
3. Rework and review the ticket-facing Storybook surfaces for the pooled model.
4. Turn the release-blocking decisions above into an implementation spec.
5. Implement ticket-pool funding, drawing periods, commitments, purchases,
   custody, sweeps, claims, atomic allocations, cashout integration, and
   operational alarms together.
6. Add Study and Karaoke objective slots, then move claim uniqueness to the
   objective-scoped boundary.

Claim hardening remains a prerequisite for objective-scoped claims. ERC-20
registry and generic multi-asset accounting remain a later, separate project.
