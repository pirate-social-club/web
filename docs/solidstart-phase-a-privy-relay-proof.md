# Phase A — Core JS fresh-wallet and sponsored-relay proof

**Date:** 2026-08-14  
**Scope:** disposable Privy test fixtures only; no production-user or funds migration promise.  
**Result:** **Core JS/Privy parity passes; the relay differential classifies the 500 as a framework-neutral API defect blocking M2 only.**

## Environment and product scope

The proof used the production-shaped API endpoints `api.privy.io` and `api.pirate.sc` on Base
mainnet (`chain_id: 8453`). The account was a disposable Privy test fixture under the recorded
clean-slate scope. The request was sponsored and used no user funds; no production-user money path
was exercised. This is an integration proof, not a production rollout authorization.

## M2 differential fixtures — provisioned 2026-08-14

Test-account slots 1 and 2 from the Node `getTestCredentials` response were reset for the
differential run. The prior disposable users
were deleted through Privy's user-delete endpoint (HTTP 204), then both test credentials were
authenticated again (HTTP 200). Each new user has an email link and zero wallet links; the app's
`create_on_login: off` setting keeps both fixtures walletless until the Core arm explicitly creates
its wallet. They are disposable, unfunded controls; no production user or balance is in scope.

The M2 run exercised both controls in the same production-shaped environment and captured sanitized
request/response pairs below. A single arm, a rate-limited login, or a missing response would remain
**uncertain** and could not classify the wrapper 500.

## Fixture and wallet state

The Privy app exposes three disposable test accounts through the Node API. The account used for the
clean-room Core run had no embedded wallet before the run. The Core harness created one through
`embeddedWallet.create({})`; the resulting account reported:

```text
connector_type: embedded
recovery_method: privy-v2
wallet_client: privy
wallet_client_type: privy
imported: false
delegated: false
```

The app configuration currently reports `create_on_login: off` and
`mode: user-controlled-server-wallets-only`, so this proof intentionally exercises explicit Core
wallet creation rather than relying on React Auth's login-time provisioning option.

## Core JS path exercised

The disposable browser harness used `@privy-io/js-sdk-core@0.68.0` from an allowed Privy origin
(`http://localhost:5173`) and ran this sequence:

1. Create one `Privy` client, initialize it, mount the secure Privy iframe, and wire message passing.
2. Authenticate the test account with Core email OTP APIs.
3. Create/read the embedded Ethereum wallet and obtain its EIP-1193 provider.
4. Obtain the Core access token and exchange it at Pirate's `/auth/session/exchange` endpoint.
5. Build Pirate's prepared sponsored follow transaction.
6. Call Core `embeddedWallet.signWithUserSigner()` through Core's
   `generateAuthorizationSignature()` with the same canonical Wallet API payload used by the React
   bridge.
7. Submit that signed request directly to Privy's Wallet API.

The direct Privy request returned HTTP 200 and included both a transaction ID and transaction hash.
This verifies that a newly created embedded wallet can produce the authorization signature and that
Privy accepts the sponsored `eth_sendTransaction` request through the Core JS signer path.

## Pirate relay result

The same request was then sent through Pirate's `/api/privy-relay` endpoint with the Core-generated
signature, wallet ID, request expiry, prepared intent, transaction index, and Pirate session token.
The wrapper returned HTTP 500 (`internal_error`, retryable) with request ID
`a2aa744e1f90e90c` in the clean run. A direct Privy submission using the same signature and payload
returned HTTP 200 immediately afterward.

The differential now resolves the wrapper's ownership of the failure:

- **Privy/Core signer:** passed.
- **Fresh embedded-wallet creation/provider:** passed.
- **Pirate session exchange:** passed.
- **Pirate relay wrapper/backend finalization:** returned HTTP 500 in both the React and Core runs.

Both arms used the same request schema (`chainId`, `intentId`, `transactionIndex`, `intent`,
`transaction`, `walletAddress`, `privyWalletId`, `authorizationSignature`, and `requestExpiry`) and
the same `mint-primary-list` transaction shape. Fixture-specific intent IDs, wallet IDs, addresses,
transaction calldata, expiry, and signatures necessarily differed; signatures are recorded as
SHA-256/length redactions rather than reusable credentials. The React response was HTTP 500 with
request ID `a2aabf1b0aeb2dc9`; the Core response was HTTP 500 with request ID `a2aabfd9987b3107`.
The Core arm's direct Privy diagnostic immediately afterward remained HTTP 200 with a transaction
ID and hash.

This is World A: the wrapper fails independently of whether the caller is React Auth or Core JS. The
result is therefore **classified API-side/framework-neutral relay defect**. It remains an M2 shipping
blocker until the API path is fixed, but it is no longer a Privy/Core or Solid framework gate.

## Sanitized differential captures

| Arm | Request endpoint | Relay response | Direct Privy diagnostic |
| --- | --- | --- | --- |
| React, fixture slot 1 | `https://api.pirate.sc/api/privy-relay` | HTTP 500, `internal_error`, retryable, request `a2aabf1b0aeb2dc9` | Not run; wrapper response is the arm's result |
| Core JS, fixture slot 2 | `http://localhost:5173/pirate-api/api/privy-relay` → `https://api.pirate.sc/api/privy-relay` | HTTP 500, `internal_error`, retryable, request `a2aabfd9987b3107` | HTTP 200; transaction ID and hash present |

Both request bodies had the exact same field set and `transactionIndex: 1` with
`intent.type: pirate.follow.mint-primary-list` and `intent.slot: server-prepared`. The React
authorization signature was SHA-256 `7248de3ea00ca7895bde0f2cfe034db45c1f2559353f019d6f60d2773c459866`
(length 96); the Core signature was SHA-256
`0ffacfba386aae7d9cfc5668bca57a70ffb8d4f57d43d958b7cb406f4f6a691f` (length 96). Bearer tokens and
raw signatures are intentionally redacted; the complete sanitized request bodies are preserved in
the [sanitized differential capture](solidstart-phase-a-privy-relay-differential.md), while response
bodies are recorded above.

## Reproduction fixture

The ignored fixture is `web/.tmp/privy-core-harness/`; it is not application code and is excluded from
the repository change set. It uses a Vite dev server only to provide an allowed browser origin and a
local proxy for the API calls. Secrets were injected transiently through the existing secret manager;
no token, OTP, or secret is written to the repository or this document.

The official Core recipe describes the same required primitives—one client, initialization, secure
iframe/message wiring, email authentication, embedded-wallet creation/provider access, and access
tokens—in [Privy's vanilla JavaScript SDK recipe](https://docs.privy.io/recipes/core-js).

The fixture reset used Privy's documented [delete-user API](https://docs.privy.io/api-reference/users/delete)
only for the disposable test users described above.
