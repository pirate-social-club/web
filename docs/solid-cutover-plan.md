# Solid cutover plan

Date: 2026-08-14
Status: proposed — interim lane ownership assigned; production sign-offs pending

This is the source of truth for the React-to-Solid migration. A presentation
copy exists as an HTML artifact; where the two differ, this file wins.

## Decision summary

Migrate by strangling: React stays in production and Solid takes one
allowlisted, signed-out, read-only route at a time. Release gates cover safety
and correctness only. Comparative performance is measured on the first live
route and informs optimization; it does not authorize or block a release.

## What blocks a release

The complete list. Anything not here is tracked work, not a gate.

1. **Security** — perimeter authentication, fail-closed host handling, policy
   headers.
2. **Reproducibility** — a clean checkout builds and tests without hidden
   inputs.
3. **Rollback** — a demonstrated path back to React.
4. **Correctness** — the route behaves as React does, including its failure
   states.
5. **Hydration and CSP errors** — zero, in a real browser.
6. **Unbounded I/O** — no upstream call without a timeout; none before the
   request's disposition is known.
7. **Cloudflare runtime limits** — CPU time, subrequest count, and memory
   within platform bounds under realistic load.

Being slower than React is not on this list. It is a reason to optimize with
real numbers, and never on its own a reason to declare the architecture failed.

## Decisions

### ADR-001 — Strangler migration, not big-bang

**Decision.** React remains production throughout. Solid receives one
allowlisted, signed-out, read-only vertical slice at a time, dispatched at the
Cloudflare edge. React is never deleted during migration and never rebuilt in
order to roll back.

**Because.** The surface is 50 route kinds, 47 primitives, and 201 composition
implementations. A parallel rewrite of that size on a prerelease stack has no
safe landing point and no partial value.

**Consequences.** Every migrated route carries a dual-maintenance window. A
route-level feature freeze applies: inside its window a route receives only
security-critical and API-contract-critical fixes in React. Unmigrated React
development continues at normal pace. Rollback mechanics are ADR-006.

**Revisit.** If more than three slices are in an open window simultaneously,
stop starting new slices until the count drops.

### ADR-002 — One web migration workspace

**Decision.** Absorb the Solid app into this repository without relocating the
React tree. Framework-neutral platform code moves into `packages/web-platform`,
and both apps consume the same implementation and the same tests, atomically.

**Because.** "Port, don't reimplement" has no mechanism across two git repos. A
published package would add a third release train; vendored copies drift.
Absorption also dissolves the missing `../solid-storybook-poc` dependency rather
than solving it.

**Consequences.** Local packages use the existing `file:./packages/*`
convention (`package.json:66,68`), not a new workspace mechanism. React import
sites change in the same PR as each extraction — no compatibility shims.
Extraction is incremental: only what a slice needs, when it needs it. After
cutover, React is removed and the tree normalized; `pirate-web-solid` becomes
archived migration history.

**Revisit.** If a second consumer outside this repo needs `web-platform`,
promote it to a published package then, not now.

### ADR-003 — Conditional prerelease authorization

**Decision.** The stack — Solid 2 RC, Router 2 next, Kobalte 2 alpha with a
local patch, TanStack Query 6 RC, a custom Cloudflare adapter — is authorized to
proceed, conditionally, under one named Web Platform DRI and one named Design
System DRI. Exact pins and a committed lockfile remain mandatory.

**Conditions**, all of which must hold continuously:

- clean-checkout CI is green;
- no additional *behavioral* Kobalte patch is required beyond the existing one;
- upstream issue ownership and upgrade testing remain active;
- Router, Meta, and Query upgrades pass the SSR and hydration canary suite;
- the adapter does not require maintaining a fork of Solid, Router, or the
  Cloudflare plugin.

**Abort triggers.** A second component family requires another upstream
behavioral patch; an upstream security fix cannot be consumed promptly; or the
adapter requires a framework fork. On any trigger: pause product migration,
empty the allowlist, and reopen SolidStart, stable Solid, or another supported
architecture.

**Note.** Cloudflare documents TanStack Start and React Router as its official
SSR integrations. This adapter is platform code the team owns, and that
ownership cost is accepted knowingly.

### ADR-004 — Solid's script model wins the CSP merge

**Decision.** Do not copy React's script policy. The merged policy uses a nonced
`script-src` with `'strict-dynamic'`, keeps `'self'` only as the fallback for
browsers that ignore `strict-dynamic`, and adds `'wasm-unsafe-eval'` only when a
migrated, tested feature requires it.

**Inherited unchanged from React.** The independently applicable directives —
`connect-src`, `img-src`, `media-src`, `font-src`, `form-action`, `frame-src`,
`child-src`, `frame-ancestors`, worker sources — plus the referrer,
MIME-sniffing, and permissions headers. Source of truth:
`src/lib/security/csp.ts`.

**Deliberate temporary looseness.** `style-src 'self' 'unsafe-inline'` is
retained initially. Tightening is tracked separately, not as a blocker.

**Proof scope is per-slice.** The policy is proven against the Solid surface
that actually ships: streamed `$HY` hydration scripts, late patches, dynamic
route imports, and the Kobalte families in use. Telegram framing, embed
surfaces, and unshipped component families are proven when their slices arrive,
not before.

### ADR-005 — Ship first, measure on the real route

**Decision.** Comparative performance is not a release gate. Before traffic, a
route clears a cheap runtime sanity checkpoint that records timings without
ratcheting them. Real measurement and optimization happen after the first
product slice is live, using lightweight observability rather than a benchmark
program.

**Because.** Benchmark infrastructure built before the first route measures a
prototype, not the product. One real route produces better evidence sooner and
at lower cost.

**Consequences.** Failing to beat React by any particular margin is not an
architectural failure and rolls nothing back. The one performance-shaped
exception is a Cloudflare runtime limit — CPU time, subrequest count, or
memory. Those are correctness failures and they block.

**Revisit.** After the first slice is at full traffic, decide whether absolute
budgets are worth ratcheting in CI. Decide it with numbers in hand.

### ADR-006 — Two-layer rollback

**Decision.**

- **Routine** — a KV-backed route allowlist for enabling and disabling
  individual routes. This is a *propagating route toggle*, not an instant
  switch.
- **Emergency** — Cloudflare Worker version rollback, reactivating a previously
  deployed version without building a new artifact.

**Because.** Cloudflare KV is eventually consistent; a write can take on the
order of a minute to become visible everywhere. Calling that a global kill
switch would put a minute of unmitigated traffic behind a word. Version rollback
is the mechanism that matches the word.

**Consequences.** Incident runbooks name version rollback, not the allowlist.
The propagation window is documented as an expected delay, not a fault. Both
layers are exercised before any slice takes traffic, with time-to-restore
recorded for each. Rollback starts manual and rehearsed; automation follows once
field signals are trustworthy.

**Revisit.** If the propagation window proves operationally painful, evaluate
moving the allowlist into the dispatcher's deployed configuration and accepting
a deploy per route change.

References: [KV consistency][kv], [Worker versions and deployments][versions].

[kv]: https://developers.cloudflare.com/kv/concepts/how-kv-works/
[versions]: https://developers.cloudflare.com/workers/versions-and-deployments/

## Workspace topology

```
web/
  src/                          # current React app — unmoved
  solid/                        # Solid app (from pirate-web-solid)
    src/
      app/  entry/  layouts/  features/  routes/
      server/
        hns/  security/  request-context/  response-policy/
    e2e/
    wrangler.jsonc
  packages/
    bookings-domain/            # existing
    karaoke-runtime/            # existing
    web-platform/               # NEW — framework-neutral, both apps
    route-contracts/            # NEW — parity inventory + migration state
    solid-ui/                   # NEW — Solid design system + Storybook
  .github/workflows/            # extended, not replaced
```

### Extraction is incremental

Move only what the current slice needs, and move it with its tests, rewriting
React's import sites in the same commit. A `repo-hygiene` check fails the build
on any duplicate implementation left behind.

**Extracted for Slice 0 and 1a/1b:**

| Module | From | Tests |
| --- | --- | --- |
| HNS forwarder auth, effective origin, sovereign scope | `src/lib/hns-forwarded-origin.ts` | 16 + regression suite |
| Security policy construction | `src/lib/security/csp.ts` | 10 |
| API origin resolution | `src/lib/hns-forwarded-origin.ts`, `src/lib/api/hns-hostname.ts` | existing unit and regression suites |

**Deferred until a second consumer appears:** `agent-discovery.ts` (arrives with
Slice 1c), `content-locale.ts`,
`ui-locale-core.ts`, `report-csp-violations.ts`, and
`scripts/build-provenance.ts`. The Solid release still stamps a version and
serves `/__version`; only the *shared package extraction* is deferred.

### `@pirate/route-contracts`

Promote `ROUTE_MANIFEST` out of `src/app/route-manifest.test.ts` into a package
and add one field per entry: `migration: "react" | "migrating" | "solid"`. That
field is the single source of truth for the edge allowlist, the parity check,
and the freeze policy. Both apps assert against it.

The package also inventories non-app Worker endpoints that participate in edge
dispatch, beginning with `/privacy` and `/robots.txt`. Without those entries,
Slice 0 would sit outside the same allowlist and rollback contract it is meant
to prove.

### Absorption hazard — alias collision

`tsconfig.json` maps `@/*` to `./src/*`. The Solid app's Vite config aliases
bare `@` to the design-system `src` (`pirate-web-solid/vite.config.ts:44`).
The source currently has no `@/...` imports; the collision is in configuration
and would become active if the absorbed app inherited Web's root tsconfig.
Resolve during the move: `solid-ui` gets real subpath exports, the `@` alias and
the `WEB_SOLID_DESIGN_SYSTEM_ROOT` escape hatch are both deleted, and
`src/design-system.ts`'s deep
`pirate-solid-design-system/src/...` imports become package imports.

The source also hard-depends on an unpublished sibling checkout through its
`package.json` workspace, `bun.lock`, Vite aliases, `src/design-system.ts`, and
`src/index.css`. P1 removes that hidden input rather than registering it as a
permanent sibling. `packages/solid-ui` must provide compile-capable runtime and
type stubs for the frozen `Button`, `Dialog`, and `TextField` surface, plus the
minimum local token stylesheet needed for a clean build. These are bootstrap
surfaces, not the lane U implementation. No absorbed dependency may resolve to
`../solid-storybook-poc` or `pirate-solid-design-system` outside this repository.

## Strangler mechanics

### Dispatch

The production entry Worker stays React's. It consults the allowlist before
routing: a matched request is forwarded to the Solid Worker over a service
binding; everything else falls through unchanged. Solid is never the entry point
during migration.

### Stopping traffic

| Layer | Mechanism | Speed | Use for |
| --- | --- | --- | --- |
| Routine | KV route allowlist — remove the entry | Propagating; a minute or more to reach everywhere | Planned enable/disable, ramp steps, ending a slice |
| Emergency | Worker version rollback to the prior deployed version | Immediate; no build | Incidents, failed ramps, anything user-visible |

Naming these differently is the point: a runbook that reaches for the slower one
during an incident loses the minute it thought it had.

### Slice constraints

- GET only. No writes, no mutations, no form posts.
- Signed-out rendering only. Session cookies are not forwarded across the
  binding.
- Read-only upstream API access, with the cache semantics React serves today.
- The route must exist in `route-contracts` with `migration: "migrating"` before
  it can be allowlisted. CI validates the allowlist as a subset of the
  `migrating` and `solid` entries. It becomes `solid` only at full traffic.

### Feature freeze

A route enters its window when its slice branch opens and leaves when it reaches
full Solid traffic or is rolled back. Inside the window React gets security and
API-contract fixes for that route only. **Windows are capped at four weeks.** On
expiry the slice rolls back, the freeze lifts, and the slice is re-planned. The
cap protects React's velocity, so it is enforced rather than extended.

### Parity standard

Semantic, status, and header parity — **not** byte-identical HTML. Framework
output ordering will differ and chasing it wastes the slice. Concretely: the
same metadata values, the same status codes, the same cache and security
headers, the same rendered states. Non-HTML text endpoints such as `robots.txt`
are the exception and are compared byte-for-byte, because there it is cheap and
meaningful.

## Fast-path sequence

### Step 1 — Sign the ADRs, name the owners

One to two working days. A signature step, not an engineering step.

1. ADR-001 through ADR-006 reviewed and merged.
2. Web Platform DRI and Design System DRI named, with ADR-003's abort triggers
   explicitly accepted by both.
3. Dates and staffing agreed for steps 2 through 4. Later steps sized only.
4. Version-rollback runbook owner identified with whoever owns production
   Cloudflare configuration.
5. Freeze policy and the four-week cap accepted by the React team.
6. Slice 0 scope accepted: `/privacy` and `robots.txt`.

### Step 2 — Reproducible workspace, closed perimeter

Estimate 2–3 weeks, two engineers. Scope is bounded to what Slice 0 and Slice 1a
need; anything proving a future route belongs to that route's slice.

1. A clean clone with no environment variables set installs, typechecks,
   builds, and passes tests. Enforced by a `solid-clean-checkout` job in
   `web-ci.yml`.
2. `web-platform` (HNS, CSP, API origin only), `route-contracts`, and
   `solid-ui` exist. Both apps consume the first two; Solid consumes `solid-ui`.
   No duplicate implementations survive the hygiene check.
3. The HNS negative suite passes against the Solid request pipeline, unchanged
   from React's semantics — spoofed markers stripped, source authenticated,
   HMAC and timestamp and path verified, replay rejected, sovereign requests
   confined to their forwarded community.
4. Unknown hosts fail closed. No host classification path returns `canonical`
   for an unrecognized `Host`.
5. Zero upstream subrequests occur before authentication, redirect, and route
   matching resolve, verified by a fetch spy. This retires the four-second
   pre-render fetch.
6. Every upstream call has an explicit bounded timeout, including the seam
   paths that currently have none.
7. The merged CSP per ADR-004 is served, with zero browser violations across
   the *currently shipped* Solid surface: streamed hydration, late patches,
   dynamic imports, and the Kobalte families in use.
8. `/seam/*` returns 404 in a production build and is unreachable on staging.
9. No local or preview environment can resolve the production API origin.
10. Asset routing works for what Slice 0 needs: `/assets/*`, `favicon.ico`,
    `robots.txt`.
11. The client entry cannot execute before its mount node exists, verified with
    a cached chunk against a throttled document.
12. Staging deploys from CI with correct auxiliary-Worker ordering, environment
    values, observability, and a `/__version` endpoint probed by the canary
    workflow.
13. The full Solid test suite runs in CI — no hand-picked file lists.

### Checkpoint — Minimum runtime sanity

Before any dispatched traffic. Cheap, binary, no benchmark infrastructure.
Timings here are **recorded, not ratcheted**; they exist to give later
optimization a starting point.

- **R1** No request performs upstream I/O before host authentication and routing
  disposition.
- **R2** All upstream calls have bounded timeouts.
- **R3** Unknown hosts fail closed.
- **R4** Production cannot reach `/seam/*`.
- **R5** Zero CSP, hydration, or uncaught browser errors on dispatched routes.
- **R6** Assets load and client navigation works after dispatch.
- **R7** Both rollback layers exercised once, with time-to-restore recorded.
- **R8** Response timing, Worker CPU, and subrequest count recorded. For memory,
  a realistic smoke run must produce no platform-limit failure — no memory
  benchmarking infrastructure is built.

### Step 3 — Slice 0: dispatch and rollback proof

Estimate under a week. **`/privacy` and `robots.txt`.** `/privacy` is a stable,
signed-out HTML route that exercises SSR, document policy, and headers without
product state. Together, the two endpoints are enough to prove the plumbing;
sitemap, the remaining `.well-known` endpoints, and API docs follow afterwards
without holding up the first proof.

1. `/privacy` meets semantic, status, and header parity. `robots.txt` matches
   React byte-for-byte.
2. Allowlist enable and disable demonstrated end to end, with the propagation
   delay observed and written into the runbook.
3. Version rollback demonstrated under live dispatch, time-to-restore recorded.

### Step 4 — Slice 1: first real product surface

Split into three independently shippable and independently rollback-scoped
sub-slices. Each clears the checkpoint and the parity criteria before its ramp.

| Sub-slice | Scope | Brings with it |
| --- | --- | --- |
| 1a | canonical `/u/:handle` | the `solid-ui` dependency spine |
| 1b | sovereign profile host | the HNS host path under real traffic |
| 1c | `public-agent` — `/a/:agent` and its host | `agent-discovery` extraction |

Per sub-slice:

1. **Functional parity** — every state React renders, including not-found,
   error, and empty.
2. **SEO parity** — title, description, canonical, Open Graph, and structured
   data equivalent in value; status codes identical. Not byte-identical markup.
3. **Accessibility parity** — axe clean, keyboard path equivalent, focus order
   preserved through hydration.
4. **Mobile parity** — layout and interaction at the breakpoints React
   supports.
5. **Failure parity** — upstream 4xx, 5xx, and timeout produce React's status
   codes and cache headers, never a blocked render.
6. **Cache parity** — identical `cache-control`, `vary`, and CDN behavior.
7. **API contract parity** — same pinned API commit, verified against the
   contract pin CI already enforces.
8. **Ramp** — alerting armed on error rate and on any field hydration or CSP
   error, with a rehearsed manual version rollback. Automatic rollback is
   enabled once those signals have proven trustworthy, not before.

### Step 5 — Measure the live route, then optimize

Non-blocking. Produces evidence and a work list; authorizes nothing.

**The performance readout is a one-time required readout, not a standing
committee.**

- **Owner:** Web Platform DRI.
- **Timing:** after Slice 1a reaches full traffic and has accumulated
  representative data.
- **Required disposition:** exactly one of `accept`, `optimize`, or
  `architecture reassessment`.
- **Output:** top bottlenecks, assigned follow-ups, and a revisit trigger.
- **Non-blocking:** the readout cannot retroactively gate Slice 1 merely because
  React was faster.
- **Repeat only if** two successive slices show the same material gap, a field
  regression appears, or runtime headroom becomes concerning.

Ordinary latency, errors, Cloudflare limits, and hydration/CSP alerts belong to
the existing production and on-call owner as standing responsibilities, not to
this readout.

What gets captured:

1. Real timings from live traffic: TTFB, time to first and final chunk,
   middleware time.
2. Bundle sizes — initial and per-route JS and CSS, Brotli encoded.
3. Field errors and hydration behavior, alerting on non-zero.
4. Worker CPU, subrequest count, and memory against Cloudflare's limits. **These
   alert and block; the rest inform.**
5. React comparison on the same route, as decision evidence.
6. Optimization work opened against actual bottlenecks, prioritized against
   slice work rather than ahead of it.

### Step 6 — Continue public, read-only slices

`post`, `community-landing`, `community-videos` — signed-out views only;
authenticated views stay on React. Each slice clears the checkpoint and the
parity criteria before its ramp, and is marked `solid` in `route-contracts` at
full traffic, which lifts its freeze. Maximum three open freeze windows.

### Step 7 — Authenticated and heavy routes

Opens after the public slices hold their error budgets across an agreed
observation window. Sized, not scheduled.

1. Real session handling replaces the pass-through boundary, with a redirect
   policy and negative tests.
2. Write paths, locale and RTL, theme, navigation shell, settings, wallet,
   inbox, notifications.
3. Heavy islands — chat, live, karaoke, study, XMTP, Agora, Telegram — strictly
   lazy-loaded, each measured against Cloudflare runtime limits.
4. `home` lands here, rewritten on `solid-ui`. The prototype feed is not
   repaired.

## Blocker to test map

Every defect found in the audit of `pirate-web-solid`, bound to one named test
that must go red to green. A blocker with no test here is not closed.

| ID | Blocker | Class | Step | Named test |
| --- | --- | --- | --- | --- |
| B1 | Forwarder marker trusted without authentication | Security | 2 | `packages/web-platform/src/hns-forwarded-origin.test.ts` (16, unchanged) + `solid/src/server/hns/authenticate-middleware.test.ts` |
| B2 | Unknown hosts default to canonical | Security | 2 | `solid/src/server/security/host-classification.test.ts` |
| B3 | Upstream fetch before authz and redirect | Correctness | 2 | `solid/src/server/request-pipeline.test.ts` — fetch spy |
| B4 | Four-second pre-render fetch, unbounded and pre-disposition | Unbounded I/O | 2 | same pipeline test + `solid/src/server/upstream-timeouts.test.ts` |
| B5 | CSP missing connect, img, media, style, font, form-action, framing | Security | 2 | `packages/web-platform/src/security/csp.test.ts` (12 planned extraction tests) + `solid/src/server/security/csp-script-model.test.ts` |
| B6 | Merged CSP unproven against Solid streaming | Hydration/CSP | 2 | `solid/e2e/csp-streaming.spec.ts`, shipped surface only |
| B7 | Checkout requires an absent sibling repo | Reproducibility | 2 | `web-ci.yml` job `solid-clean-checkout` |
| B8 | `/seam/*` reachable, untimed, uncaught | Security | 2 | `solid/src/server/seam-gating.test.ts` + `solid/e2e/seam-denied.spec.ts` |
| B9 | Local preview resolves the production API | Correctness | 2 | `solid/src/lib/api/origin.test.ts`, extended |
| B10 | Only `/assets/` routed to ASSETS | Correctness | 2 | `solid/e2e/discovery-assets.spec.ts`, Slice 0 set |
| B11 | Async entry script races the mount node | Hydration | 2 | `solid/e2e/entry-order.spec.ts` |
| B12 | No production topology or release order | Reproducibility | 2 | `.github/workflows/solid-release.yml` + `/__version` probe in `release-canaries.yml` |
| B13 | `verify` omits the public-feed test | Reproducibility | 2 | `web-ci.yml` job `solid-unit` runs the whole suite |
| B14 | Stream gate asserts nothing about response timing | Recorded only | Checkpoint | `scripts/stream-check.mjs` v2 — records, does not ratchet |
| B15 | Rollback never exercised | Rollback | Checkpoint | Runbook drill, both layers, time-to-restore recorded |
| B16 | Route parity unmeasured | Correctness | 3 | `packages/route-contracts/src/parity.test.ts` |
| B17 | Session boundary is a pass-through; settings are public | Security | 7 | `solid/src/lib/auth/require-session.test.tsx` + redirect e2e |

Reuse the CI that exists. This repo already runs `hns-forwarder-boundary.yml`
and `hns-forwarder-negative-probe.yml` as scheduled live probes,
`sovereign-routing-health.yml`, `release-canaries.yml`, and a contract pin read
from `.github/release-refs/api.sha`. Extend these to the Solid staging origin
rather than building a parallel pipeline.

## Deferred work register

Known work deliberately not being done yet, with the step that claims it.

| Item | Claimed by | Why not now |
| --- | --- | --- |
| Middleware ordering, host classification, seam gating, timeouts, CSP, API origin in `pirate-web-solid` | Step 2 | All of it moves during absorption. Fixing before the move means fixing twice. |
| `auth-origin`, `content-locale`, `ui-locale-core`, `report-csp-violations`, `build-provenance` extraction | When a second consumer appears | Extracting before Solid consumes them proves a future route at today's cost. |
| `agent-discovery` extraction | Slice 1c | Arrives with the route that needs it. |
| Sitemap, remaining `.well-known`, API-doc routes | After Slice 0 | Slice 0 only needs enough to prove dispatch and rollback. |
| Telegram framing and embed CSP proof | Their slices | ADR-004 scopes CSP proof to the shipped surface. |
| Automatic rollback | After Slice 1a | Alert plus rehearsed manual rollback first; automate once signals are trustworthy. |
| Public video feed defects — observer misses paginated cards; pagination failure is unrecoverable because `cursor` is never cleared; play/pause label tracks `activeId` rather than playback state; caption track has no source; arrow keys stolen from `<video controls>`; card and video maps grow unbounded; `data-feed-status` ignores pagination errors; hardcoded colors and radii | Step 7 | `home` is an authenticated route kind. It will be rewritten on `solid-ui`, not repaired. |
| `pirate-web-solid` documentation contradictions | Step 2 | Docs are rewritten during absorption. |
| `style-src 'unsafe-inline'` tightening | Scheduled separately | Out of scope per ADR-004. |
| Absolute performance budgets ratcheted in CI | Step 5 | Per ADR-005, decided with live numbers in hand — if at all. |

## Risk register

| Risk | Signal | Response |
| --- | --- | --- |
| Kobalte alpha needs further behavioral patching | A second patch proposed in review | ADR-003 abort trigger |
| Adapter drifts toward a framework fork | Any patch against Solid, Router, or the Cloudflare plugin | ADR-003 abort trigger |
| Cloudflare runtime limit hit | CPU, subrequests, or memory near the platform bound under realistic load | Blocking; treat as correctness, not performance |
| Allowlist mistaken for an instant kill switch | A runbook or incident review naming KV as the emergency lever | Correct the runbook to version rollback |
| Dual maintenance outgrows capacity | More than three open freeze windows, or any window past four weeks | Stop starting slices; roll back the oldest |
| Perimeter regression after exposure | Any step 2 criterion failing on staging | Empty the allowlist; step 2 criteria are continuous |
| Solid persistently slower than React | Same material gap across two successive slices | Repeat the readout; optimize against measured bottlenecks. Not a rollback trigger |
| Deferred extraction turns out to be needed mid-slice | A slice reaching for `locale`, `discovery`, or `provenance` | Extract then, in one atomic PR. This is the designed path, not a miss |
| Platform extraction destabilizes React | React test failures during a `web-platform` move PR | Extraction PRs are atomic and revertible; revert rather than patch forward |

## Step 1 sign-off

Estimates in this document are proposals for confirmation, not commitments.

| Role | Name | Date |
| --- | --- | --- |
| Web Platform DRI | Workspace coordinator (interim; pending user naming) | 2026-08-15 |
| Design System DRI | Workspace coordinator (interim; pending user naming) | 2026-08-15 |
| Cloudflare config owner | | |
| Version-rollback runbook owner | | |
| React team — freeze policy acceptance | | |

**Interim lane assignment (2026-08-15).** The workspace coordinator in this
session is also the interim owner for Lane R, pending the user's naming of
human owners for Web Platform, Design System, and Lane R. This assignment
authorizes P1 skeleton work only; Cloudflare, rollback, React-freeze, and
production-exposure sign-offs remain open.

Schedule: step 2 start/end, steps 3–4 start/end, engineers allocated.

### Open questions

- Who executes a version rollback out of hours, and is that an existing rotation
  or a new one?
- Who owns the upstream Kobalte relationship, and are they inside the team?
- What observation window does step 7 require — one week at full traffic on the
  public slices, or longer?
- Does the `public-agent` host surface share Slice 1b's HNS path exactly, or does
  it need separate perimeter tests?

## Three-agent execution contract

Nothing in this section is authorized before step 1 signatures. It exists so
that when lanes do start, they start with disjoint paths.

### Lanes

| Lane | Owner role | Owns |
| --- | --- | --- |
| **P** — perimeter and bootstrap | Web Platform DRI | absorption into `solid/`, all shared configuration, `web-platform`, `route-contracts` schema, server perimeter, Cloudflare config, CI |
| **U** — Solid UI | Design System DRI | `packages/solid-ui/**` and nothing else |
| **R** — routes and application | unnamed | `solid/src/{app,layouts,routes,features}/**`, route e2e, Slice 0 endpoints |

Lane P is the integration owner. It reviews every change to shared
configuration and is the only lane that may modify it.

### Path ownership

Exact, and exhaustive for the contended surfaces. A path not listed here is
lane P's by default.

| Path | Lane |
| --- | --- |
| `solid/src/server/**` | P |
| `solid/src/entry-*.tsx`, `solid/src/Document.tsx` | P |
| `solid/src/index.css`, Tailwind config | P |
| `solid/vite.config.ts`, `solid/wrangler.jsonc`, `solid/workers/public/wrangler.jsonc` | P |
| `packages/web-platform/**` | P |
| `packages/route-contracts/**` — schema, types, parity test | P |
| `packages/route-contracts/**` — per-route `migration` data entries | the lane shipping that route |
| root `package.json`, `bun.lock`, `tsconfig*.json`, `vite.config.ts`, `knip.jsonc`, `eslint.config.js` | P |
| `.github/workflows/**` | P |
| `src/**` (React) | P plus the affected React module owner, in coordinated extraction PRs only |
| `packages/solid-ui/**` | U |
| `packages/solid-ui/.storybook/**` | U, but watcher exclusions need P review |
| `.storybook/**` (existing React catalog) | P |
| `solid/src/app/**`, `solid/src/layouts/**`, `solid/src/routes/**`, `solid/src/features/**` | R |
| `solid/e2e/**` route specs | R |
| `e2e/**` (React) | untouched |

### Bootstrap base

`web@7510f3d7` is the execution-contract baseline. Lane P branches from `main`
at or after that commit. Lanes U and R branch from the P1 merge commit, not from
the plan baseline. Absorption source material is
`pirate-web-solid@ab33300`, whose workspace disposition is already recorded as
`absorb-into-web`.

Before lane edits, the integration owner fetches and prunes `origin`, verifies
the remote `main` OID directly, and rebases `solid/perimeter` onto the commit
that merged this plan. The pre-existing local `origin/main` ref is not a valid
baseline until that reconciliation has happened.

### Branches and worktrees

Named by work, not by worker, per the workspace agent rules.

| Worktree | Branch |
| --- | --- |
| `.worktrees/web/solid-perimeter` | `solid/perimeter` |
| `.worktrees/web/solid-ui` | `solid/ui` |
| `.worktrees/web/solid-routes` | `solid/routes` |

The canonical `web/` checkout stays integration-owned. No lane edits it.

**Concurrency limit.** The workspace allows two auxiliary worktrees per
repository. Three lanes do not fit. The default resolution is phasing: phase A
runs `solid-perimeter` alone, and that worktree is retired when the skeleton
merges, freeing a slot for phase B's `solid-ui` and `solid-routes`. If perimeter
work must continue into phase B, file the documented exception — named owner,
purpose, expiry — with the workspace steward *before* opening a third worktree.

**Web has three registered auxiliary worktrees**, with lane P holding one
default slot and a named capacity exception holding the third:

| Worktree | Branch | State |
| --- | --- | --- |
| `.worktrees/web/solid-perimeter` | `solid/perimeter` | clean — P1 skeleton committed locally; clean-checkout, runtime, UI, routes, parity, and production-build gates green |
| `.worktrees/web/generic-digital-goods` | `feat/generic-digital-goods-flag-20260814` | 20 modified, 3 untracked — do not disturb |
| `.worktrees/web/ci-cross-repo-pins` | `chore/ci-cross-repo-pins` | clean — named exception for CI pin correction, owner workspace coordinator, expiry 2026-08-22 |

The former `audit/dead-code-current` worktree has been retired. Capacity does
not block lane P's existing worktree, but it does block opening lanes U and R
concurrently until P1 merges and `solid-perimeter` is retired, or until another
documented exception is approved. As of the current 2026-08-15 reconciliation,
the workspace has **10 registered auxiliary worktrees against a limit of
eight**: API has four, Core two, Contracts one, and Web three. API's
`reward-asset-descriptor` worktree is a named second API capacity exception:
owner **workspace coordinator**, purpose dependency-backed verification and
review handoff for the reward-campaign asset descriptor, expiry **2026-08-22 or
immediately after handoff**. Web's `ci-cross-repo-pins` worktree is a named
Web/global exception: owner **workspace coordinator**, purpose prepare and
verify the cross-repository CI pin correction, expiry **2026-08-22**. No
additional worktree may open until an exception expires or a worktree is
retired.

### Merge order

1. **P1, the skeleton** — one PR to `main`, green, before anything else opens.
2. **U and R** — independent PRs to `main`, each green, each rebased on `main`.
3. **P** — continuing perimeter PRs to `main`.

No long-lived integration branch. The Solid tree is inert — not deployed, and
excluded from the React build and gates — so `main` absorbs partial work safely
and lanes stay short-lived.

### The skeleton, P1

"Landed" is a CI event, not a judgment call. P1 is done when a clean clone of
`main` passes a `solid-clean-checkout` job, and:

1. `solid/` exists, absorbed, with the `@` alias collision and the
   `WEB_SOLID_DESIGN_SYSTEM_ROOT` escape hatch both removed.
2. `packages/solid-ui` exists with its **public export surface frozen as
   compile-capable runtime and type stubs**, plus the minimum local token CSS
   required by the absorbed app, so lane R can build against components lane U
   has not implemented yet. Nothing resolves to an unpublished sibling checkout.
3. `packages/web-platform` exists with HNS, CSP, and API origin extracted.
4. `packages/route-contracts` exists with its schema and parity test.
5. **The Solid tree has its own tsconfig and CI jobs, and the React gates —
   `types`, `deadcode:audit`, `deps:audit`, `lint:hooks` — do not traverse
   `solid/` or `packages/solid-ui/`.** Without this every lane PR breaks the
   React gate. `types` is already bounded by `tsconfig.app.json` to `src/**/*`;
   P1 preserves that boundary and adds the needed ESLint and Knip exclusions
   for the other three gates.
6. CI job stubs exist in `.github/workflows/web-ci.yml` for each lane, invoking
   `bun run solid-ui:ci` and `bun run solid-routes:ci`, so lanes own the script
   behind a stable job name and never edit workflow files. Duplicate-extraction
   enforcement remains in `.github/workflows/repo-hygiene.yml`; P1 extends that
   workflow rather than silently folding it into `web-ci.yml`.

### Interface freeze

From P1 onward:

- **Shared configuration is frozen.** Changes only by lane P, announced to open
  lanes, with a rebase required before the next lane merge.
- **`solid-ui` public exports are additive-only** while a slice is open. Renames
  and removals need lane R sign-off in a coordinated PR.
- **`web-platform` exports are additive-only.** Signature changes need notice to
  both consuming lanes.
- **`route-contracts` schema is frozen.** Data entries move with the route.
- **Dependencies are a lane P operation.** `bun.lock` has one writer; lanes
  request additions rather than installing.

### Definition of done

| Lane | Done when |
| --- | --- |
| P1 skeleton | `solid-clean-checkout` green on `main`; the six criteria above satisfied |
| P perimeter | Step 2's thirteen criteria and blockers B1–B13 red-to-green |
| U | Slice 1a's component spine exported, with Storybook, interaction tests, axe, SSR tests, and the app hydration fixture green as one gate |
| R | `/privacy` at semantic, status, and header parity; `robots.txt` byte-identical; Slice 1a meeting all eight parity criteria; `route-contracts` entries flipped |

### Cross-lane defects

File, do not fix. A lane that finds a defect outside its paths opens an issue
referencing the blocker ID and continues. It does not edit another lane's files,
and it does not work around the defect silently.

### Machine resource contract

Three agents share one machine, and this repository has singletons.

- **One Storybook instance**, foreground, on port 6006. Lane U holds it by
  default; lane R requests a handoff. Verify the port is free before starting
  and stop it when verification is complete.
- **One heavy build or typecheck at a time.** Use `rtk bun run types:safe` for
  routine verification, never bare `rtk bun test` as a repo-wide gate.
- **Both Storybook configurations must exclude worktree roots:** the existing
  `.storybook/main.ts` and lane U's `packages/solid-ui/.storybook/main.ts`.
  Vite otherwise watched nested checkouts and retained 3–5 GB RSS. Adding
  worktrees makes this load-bearing, not cosmetic.

### Escalation

Lane P resolves shared-configuration disputes. Anything lane P cannot resolve
goes to the Web Platform DRI. Ownership questions about paths not listed above
are resolved by adding them to the table, not by precedent.

### Still unfilled

Human names for the three lane DRIs remain pending. The interim assignment
above is the current coordination record and is not a substitute for the
production-exposure sign-offs.

## Provenance

Verified against `web` and `pirate-web-solid` at their current checkouts.
Counts confirmed by inspection: 50 route kinds, 47 primitives, 201 composition
implementations, 16 HNS tests, 10 current CSP tests. The 12-test figure in B5
is the planned `packages/web-platform` extraction target, not the current
`src/lib/security/csp.test.ts` count.
