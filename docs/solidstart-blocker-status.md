# SolidStart migration: actual blocker status

Status: **Current execution: parallel Solid app; hard cutover; M1 green; M2 API relay root cause open; Storybook pass-with-caveats**  
Date: 2026-08-14

## M0 charter amendment — 2026-08-14

On 2026-08-14, `workspace_owner` waived the comparative React-vs-Solid proof-of-concept gate after the evidence review. The program now executes a parallel Solid application with a hard cutover, and comparative benchmarking is not a migration gate. The surviving functional gates are the relay runtime diagnosis for M2 and the Storybook renderer verdict; streaming SSR is a precondition of M3 (video-feed Home) and is green in the seam spike. M1's Solid 2 hydration seam is closed.

This amendment supersedes the pre-pivot decision posture and action list below; those sections remain
as the historical Phase A record.

## Storybook component audit — 2026-08-14

The initial Solid Storybook renders on port 6007, but Batch 0 is not yet a passing
design-system gate. The live default Dialog story has a color-contrast violation;
its visible action labels do not match the accessible names produced by the current
Kobalte close-button alias; several public components destructure Solid 2 props and
therefore lose reactivity; and the confirmation pattern uses a generic Dialog and
owns a Toaster instead of using Alert Dialog semantics with app-owned feedback.

The [audited Storybook handoff](../../solid-storybook-poc/DESIGN-SYSTEM.md) now
defines the required hierarchy, story naming and no-junk policy, accessibility
contract, Solid 2 rules, and Kobalte/Corvu selection policy. The Storybook verdict
remains open until Gate 0 is repaired, its stories and tests are normalized, and
the Phase B findings document records a pass, pass-with-caveats, or fail result.

## Storybook component gate — resolved pass-with-caveats (2026-08-14)

Gate 0 is repaired and the Storybook renderer verdict is recorded as
**pass-with-caveats** in the
[Phase B findings](solidstart-phase-b-storybook-components.md). All audit blockers
are closed: reactive Solid 2 props throughout, corrected Dialog accessible names,
a new AlertDialog component, a ConfirmDialog pattern with no toaster coupling,
contrast fixes in both themes (0 axe violations on the open Dialog story), the
target hierarchy and story naming policy, autodocs and populated Controls, the
maintained `class-variance-authority` recipe, and 58 passing focused tests plus an
SSR smoke check. A follow-up review's two code defects (foreground/solid token
split, loading dominance) are fixed and its remaining items are recorded in the
findings file. Caveats: the `storybook test` CLI is absent from storybook 10.5.8
core for this renderer (play assertions run in Vitest instead), a small Kobalte
2.0.0-alpha.0 `bun patch` fixes a Solid 2 owned-scope write crash, several alpha
behavior mismatches are encoded in tests, and Corvu stays gated on a Solid
2-compatible release. The React repo's `--primary`/`--destructive` token values
fail WCAG AA with white text and are flagged for a web-side contrast audit.

## M2 differential closure — 2026-08-14

The React and Core JS controls now both reach `/api/privy-relay` in the same production-shaped
environment and both receive the same retryable HTTP 500 shape. Core's direct Privy Wallet API
request receives HTTP 200, so the 500 is classified as a framework-neutral Pirate API relay defect;
M2 remains blocked only on the API fix, not on Privy/Core parity or Solid feasibility. Full sanitized
request/response captures are in [the differential record](solidstart-phase-a-privy-relay-differential.md).

## M1 Solid 2 hydration closeout — 2026-08-14

The seam spike's platform checks remain green: Worker adapter, CSP nonce,
two-Worker binding, HNS routing, 16/16 probe checks, and streamed SSR. The
hydration click-through is now green after an app-root hydration scope fix.
The full streamed app's SSR button increments `0 → 1` in the browser, with
16/16 seam checks and streaming still green. `Document` now wraps the app in
`#app-root`; the client hydrates that subtree with `{ renderId: "2" }`, matching
the server's hydration scope after the Document consumes the preceding `0`/`1`
nodes. The Solid 2 fallback tripwire does not fire; M1 is green.

## M2 runtime-tail diagnostic — 2026-08-14

A foreground Wrangler tail connected to the existing staging Worker at SHA
`5cb523a395b392474ec0b6aa41a72dd8bd6da72f`, but a replay produced no
invocation. The sanitized captures cannot be replayed because bearer/signature
material is redacted and their expiries have elapsed. A fresh disposable
fixture with Privy test credentials and OTP is required for the next live-tail
attempt. The active staging hold prohibited deployment. No root cause was
proven and no speculative code change was made; M2 remains open at the relay
runtime boundary.

A fresh staging-oriented Core harness attempt also stopped at Privy
authentication with `Origin not allowed` from the local harness origin, before
session exchange or relay invocation. The tail captured no relay exception;
the next attempt needs a Privy-allowed browser origin or another authenticated
fixture path.

The follow-up retry used the known allowed `http://localhost:5173` origin and
completed Privy authentication plus Pirate session exchange. It then stopped
at the configured target profile with HTTP 404 (`Profile not found`), again
before follow preparation or `/api/privy-relay`; the staging tail showed no
relay exception. A valid disposable target profile is now the next required
fixture prerequisite. No deployment or shared staging mutation occurred.

## Historical Phase A record (pre-pivot)

## Decision posture

This register governs the cheap Phase A kill-checks; it does not amend the frozen migration-audit
specification. The working hypothesis is that Solid's fine-grained client runtime will materially
improve Pirate Web's script-dominated interactive shell. We do not need a Redwood/React-versus-Solid
benchmark to decide whether the remaining integration blockers are solvable this week. If those
blockers pass, the frozen React-refactor counterfactual remains a required gate for the full migration
decision.

The selected product scope is a clean-slate test environment: legacy test-wallet compatibility is
explicitly dropped. Existing test fixtures are not a supported production-user migration promise.

## Blockers and gates

### 1. Privy/Core fresh-wallet proof — passed; relay attribution pending

The Core JS surface covers the primitives Pirate needs for the new path: auth/session state, access
tokens, logout, embedded-wallet creation and EIP-1193 provider access, and authorization-signature
construction. The React-only `useMigrateWallets().migrate()` path is absent from the installed Core
surface and the latest checked Core package. That is acceptable only because legacy test-wallet
compatibility is outside the selected product contract.

The clean-room Core proof ran against a walletless disposable test account:

1. authenticate through Core's email OTP path;
2. create and inspect the embedded wallet (`connector_type: embedded`, `recovery_method: privy-v2`);
3. obtain the Core JS embedded provider/signer;
4. generate the exact sponsored-relay authorization signature Pirate currently sends; and
5. submit the signed request directly to Privy, which returned HTTP 200 with a transaction ID/hash.

Privy/Core is therefore no longer a terminal migration blocker. The same payload through Pirate's
`/api/privy-relay` wrapper returned a retryable HTTP 500. A React control was attempted, but the
disposable test-account OTP flow hit a rate limit / stalled at confirmation and produced no wrapper
response. Attribution is consequently still open: the wrapper may fail for both callers, or it may
reject a Core-JS-shaped request that differs from React Auth's request shape.

The status is **wrapper 500 — attribution pending differential test**, not “API-side defect.” The
differential must be completed before this residual is routed to an API lane or treated as cleared
for a Solid implementation.

Evidence and implementation details are in [the Privy inventory](solidstart-phase-a-privy-inventory.md)
and [the fresh-wallet relay proof](solidstart-phase-a-privy-relay-proof.md).

### 2. Privy external-wallet scope — product decision/open implementation item

Core JS does not supply the React SDK's external-wallet discovery and modal. Pirate must either:

- make the first Solid milestone embedded-wallet-only; or
- choose and own a separate EIP-6963/WalletConnect connector and linking layer, including chain
  switching, disconnects, readiness, and the normalized wallet contract.

This is not a custody blocker if embedded-wallet-only is an accepted first scope. It becomes a
blocking scope item only if external connect/link must be present on day one.

### 3. Cloudflare application seams — async SSR proof passed; streaming remains a comparative precondition

SolidStart's Cloudflare platform path is credible. The remaining uncertainty is Pirate-specific:

- HNS sovereign-host routing and fail-closed forwarder authentication;
- effective-host propagation through server middleware and route handling;
- CSP nonce propagation into the rendered document; and
- retaining the separate public Worker and staging/production deployment shape.

The bounded SolidStart route proof passed these seams on workerd with the existing Wrangler shape:
HNS forwarded-host handling, effective-host propagation, CSP nonce matching, and the tested two-Worker
arrangement. A platform-level documentation review alone would not have been sufficient evidence.
SolidStart's default streaming handler still needs resolution on the target runtime; it is carried as
an explicit precondition of the final matched performance PoC rather than treated as a cleared
streaming capability.

Evidence and the required PoC are in [the Cloudflare viability note](solidstart-phase-a-cloudflare-viability.md).

## Cleared items

- **XMTP:** no React dependency in the XMTP integration; signer and lifecycle binding are framework-
  neutral. Focused tests passed 40/40.
- **Ordinary Privy auth:** Core JS has documented paths for session state, access tokens, logout,
  email/OAuth/passkey/SIWE flows, and embedded-wallet provider access. These require an adapter and
  Solid-owned UI, not a new custody primitive.
- **Performance as a reason to investigate:** production-shaped mobile lab runs show approximately
  5.17 s LCP, 337–364 ms warm TBT, 8.0 s TTI, and 4.4 s main-thread work under 4× CPU throttle. This
  is a real script/client-shell deficit, not an unresolved measurement question. It justifies the
  bounded PoC, but does not attribute the deficit to Solid; the frozen comparative gate remains open.

## Not blockers

- The absence of a React-shaped Privy modal API. Solid will intentionally use app-owned UI.
- Legacy migration support for disposable test fixtures, once the clean-slate scope is recorded.
- Redwood/React ecosystem comparisons or a full benchmark matrix.
- Durable Objects, service bindings, D1, KV, or R2 parity when the current Web Worker has no such
  bindings; add them only if the target port actually needs them.

## Next actions, in order

1. Complete the React-vs-Core differential through `/api/privy-relay` after the disposable-account
   cooldown (or with a fresh fixture), then route the 500 to the API or adapter lane based on evidence.
2. Decide embedded-only versus external-wallet parity for the first Solid milestone.
3. Carry the streaming-SSR seam into the final comparative PoC; no additional Cloudflare platform
   kill-check is required for the bounded async-SSR path.
4. If those pass, run the frozen matched refactored-React-versus-Solid comparative PoC against the
   pre-registered thresholds before approving a full migration. Only then fund the deeper architecture
   map and port plan. At that point Privy is an adapter/UI implementation problem rather than a
   framework-selection blocker.

## Current answer

We are not blocked by Solid itself, XMTP, Cloudflare's basic runtime model, or Core JS's fresh embedded
wallet path. The remaining Privy-adjacent item is a retryable 500 in Pirate's relay wrapper after the
Core-generated signature has already been accepted directly by Privy; its attribution is pending the
React differential. External-wallet parity remains a product-scope choice. The bounded Cloudflare
seams PoC passes for async SSR; streaming is an explicit precondition of the final comparative PoC.
The frozen React-refactor comparison still decides whether the measured deficit is materially better
addressed by Solid than by a serious React refactor.
