# Privy custom-origin pilot runbook

Status: preflight complete; identity testing waits for dashboard confirmation and the
passkey hydration fix to reach production.

This pilot answers one question: does the same Privy account produce the same Pirate
user and embedded EVM wallet on the canonical Pirate origin and an activated HNS app
origin?

It does not authorize the Global Wallet connector migration, SIWE sessions, refresh
tokens, or wallet-custody changes.

## Origin aliases

To keep operational records free of personal identifiers, use these aliases and resolve
the exact hostnames from the activation registry:

- Pilot A: the root that previously returned on-chain `NXDOMAIN`.
- Pilot B: the established fully-activated root.

If a root fails any mandatory preflight assertion, mark it `DESCOPE` and continue with
the other root. A failed root must not block the pilot.

## 1. HNS and deployment preflight

Run these checks for each exact app hostname from an HNS-resolving environment:

```text
rtk dig +https @dns.pirate.sc <pilot-host> A +noall +answer +comments
rtk dig +https @dns.pirate.sc _443._tcp.<pilot-host> TLSA +noall +answer +comments
```

Mandatory assertions:

- The A query has `status: NOERROR` and at least one A answer.
- The TLSA query has `status: NOERROR` and at least one TLSA answer.
- An HNS-capable browser opens `https://<pilot-host>/__version` without a trust warning.
- The response has `environment: production`, `git_ref: main`, and the same `git_sha`
  as `https://pirate.sc/__version`.

Ordinary system DNS and ordinary Web PKI are not authoritative for this check. A forced
IP probe with certificate verification disabled can confirm which web build is served,
but it does not prove HNS resolution or DANE trust.

Preflight observed on 2026-08-10:

| Origin | HNS A | TLSA | Served web SHA | HNS-browser trust |
| --- | --- | --- | --- | --- |
| Pilot A | PASS | PASS | `e450c93` / PASS | PENDING |
| Pilot B | PASS | PASS | `e450c93` / PASS | PENDING |

Both roots currently resolve to the production edge. This supersedes the earlier
`NXDOMAIN` observation for Pilot A, but Pilot A remains conditional until the browser
trust and Privy checks pass.

## 2. Dashboard prerequisites

The operator confirms these once. Do not repeatedly retry them from automation:

- Each participating exact HTTPS origin is present in the app-level Domains allowlist.
- If the production web app client has its own allowed-origin override, each origin is
  present there too.
- Pilot A may remain excluded if its prior routing incident makes it unsuitable.
- Global Wallet provider access has been requested under `Global Wallet > My app`.

Record only `confirmed`, `missing`, or `not applicable`; do not copy secrets, app IDs,
access tokens, or dashboard exports into the runbook.

## 3. Login-method assertion

Use a logged-out browser profile for every origin.

1. Open the origin and select `Connect`.
2. Wait until the Privy dialog is interactive.
3. On `pirate.sc`, assert that `passkey` is offered.
4. On Pilot A and Pilot B, assert that `passkey` is absent.
5. On every custom origin, assert that email, configured social methods, and wallet
   login remain available.

Failure rule: if a custom origin displays passkey, stop identity testing on that origin.
The RP-ID constraint makes the option invalid there.

Outside-in observation on 2026-08-10 found that production failed this assertion on
Pilot B because the server-rendered empty hostname reached Privy as a default method
configuration. The provider must now wait for the client hostname before mounting.

## 4. Identity and wallet continuity

Use one existing test account with an embedded Privy EVM wallet. Use the same linked
email or social method on each origin. Do not use passkey on an HNS app origin.

For the canonical origin, then for each participating pilot origin:

1. Clear that origin's Pirate and Privy session state, then sign in.
2. In DevTools Network, locate the successful `POST /auth/session/exchange` request.
3. Decode the JWT payload of `proof.privy_access_token` locally and record only its
   `sub` claim as the Privy DID. Never record the raw token.
4. From the exchange response, record:
   - `user.id` as the Pirate user ID;
   - `user.primary_wallet_attachment`;
   - the matching `wallet_attachments[]` entry;
   - that entry's `chain_namespace`, `wallet_address`, and `is_primary`.
5. Normalize an EVM address only by lowercasing it for comparison. Preserve the
   original value in the evidence capture.

Required equality assertions against the canonical-origin baseline:

- Privy DID: exact string equality.
- Pirate user ID: exact string equality.
- Primary wallet attachment ID: exact string equality.
- Primary embedded wallet address: case-insensitive hexadecimal equality.
- Chain namespace: exact equality.
- No additional Pirate user or embedded wallet is created during the custom-origin
  login.

Any DID mismatch means the account was not authenticated with the same linked method.
Any wallet mismatch with the same DID is a pilot-stopping defect.

## 5. Pirate session behavior

After each successful exchange:

1. Decode the Pirate `access_token` payload locally.
2. Assert `exp - iat` is 3,600 seconds.
3. Reload the origin and assert the session returns from the origin-local
   `pirate_session` local-storage record.
4. Keep the origin open through the five-minute refresh window.
5. Assert exactly one new successful session exchange occurs before expiry.
6. Assert the replacement token has a later `iat` and `exp`, while `user.id` and the
   primary wallet remain unchanged.

Expected: sessions are isolated by browser origin even though the Privy identity and
wallet are shared. Signing in on one origin does not copy Pirate local storage to
another origin.

## 6. Sponsored EFP follow on Base

Use a target for which the test account's follow state can safely be changed and restored.

1. Capture the prepare response from
   `POST /profiles/<target-user-id>/follow` or `/unfollow`.
2. Assert `sponsorship.eligible` is `true`, `intent_id` is present, and every sponsored
   transaction has Base chain ID `8453`.
3. Complete the follow action with the embedded Privy wallet.
4. Assert the Pirate relay succeeds and returns one transaction hash for each prepared
   transaction.
5. Assert the confirmation request succeeds and the UI reaches either current state or
   the documented accepted-but-not-yet-reflected state.
6. Verify each transaction receipt succeeds on Base.
7. Restore the original follow state and record those restoration transaction hashes.

Record whether any unexpected wallet confirmation, origin error, or relay authorization
failure appears. Never paste authorization signatures or bearer tokens into results.

## 7. XMTP initialization

Run only where Chat is enabled. Prefer a test account that has not initialized XMTP; an
existing inbox tests loading, not first-time signing.

1. Open Chat and begin encrypted-chat setup.
2. Record the number and purpose of wallet signature prompts.
3. Assert registration completes without an origin or wallet mismatch.
4. Assert the inbox publication request to `POST /profiles/me/xmtp-inbox` succeeds.
5. Reload and assert the same inbox is restored without creating a second identity.

If Chat is disabled, mark `N/A`. If initialization needs a fresh account that is not
available, mark `BLOCKED: test identity`, not `FAIL`.

## 8. Results

Use `PASS`, `FAIL`, `BLOCKED`, `DESCOPE`, or `N/A`.

| Assertion | Canonical | Pilot A | Pilot B | Evidence / notes |
| --- | --- | --- | --- | --- |
| HNS A and TLSA resolve | N/A | PASS | PASS | 2026-08-10 resolver preflight |
| Current production SHA | PASS | PASS | PASS | Expected `e450c93` at preflight time |
| HNS-browser TLS trust | N/A | PENDING | PENDING | Requires HNS-capable browser |
| Dashboard origin enabled | N/A | BLOCKED | BLOCKED | Operator confirmation |
| Passkey visibility correct | PASS | BLOCKED | FAIL | Fix awaiting release and retest |
| Privy DID equals baseline | BASELINE | BLOCKED | BLOCKED | |
| Pirate user ID equals baseline | BASELINE | BLOCKED | BLOCKED | |
| Primary wallet equals baseline | BASELINE | BLOCKED | BLOCKED | |
| One-hour session refresh | BASELINE | BLOCKED | BLOCKED | |
| Sponsored EFP follow succeeds | BASELINE | BLOCKED | BLOCKED | |
| XMTP initialization/load succeeds | BASELINE | BLOCKED | BLOCKED | |

## Exit criteria

The direct-origin pilot passes when at least one activated custom origin passes every
applicable assertion above with the same Privy DID, Pirate user ID, and primary wallet
as the canonical origin. Pilot A is optional if it regresses to `NXDOMAIN` or fails HNS
browser trust.

Passing this runbook does not start the connector migration. The next decision gate is
the Global Wallet commercial/scale response plus the sponsorship and XMTP popup
prototypes.

## Privy Global Wallet request draft

Subject: Global Wallet provider access and production terms

Hello Privy team,

We operate a production Privy application on `pirate.sc` and want to make its existing
embedded EVM wallets available to an open-ended set of community-owned requester apps
through `@privy-io/cross-app-connect`.

Please enable or approve Global Wallet provider access for our production application
and clarify the following in writing:

1. What pricing applies to the provider role, requester connections, wallet consent,
   signatures, and transactions? Are these included in MAU pricing or metered separately?
2. What production limits, rate limits, requester-count limits, or scale restrictions
   apply?
3. For the connector path, can arbitrary requester origins integrate using only our
   provider app ID, without each requester using Privy or being registered in our
   dashboard? Does this remain true for an unbounded number of unrelated TLDs?
4. Can we restrict or revoke requester apps? Are there policy, review, ecosystem-listing,
   or allowlist requirements governing which apps may connect?
5. Your provider prerequisites require a production app, logo, and a verified HttpOnly
   cookie domain. For `pirate.sc`, please confirm exactly which DNS records and dashboard
   settings are required, whether enabling the cookie domain constrains the production
   app ID to that exact domain and its subdomains, and how this interacts with our current
   web app client and native app clients.
6. Can provider wallets remain transaction-enabled rather than read-only, and are
   Blockaid scanning or a customer-supplied Blockaid key required at our expected scale?

Our requester apps are served by our platform but may use unrelated Handshake TLDs. We
intend to keep authentication and wallet approval on the canonical provider origin and
use connector mode for wallet access only.

Thank you.
