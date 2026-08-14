# M2 — Privy relay differential capture

**Date:** 2026-08-14  
**Environment:** production-shaped Pirate API (`api.pirate.sc`) and Privy Wallet API on Base
mainnet (`chain_id: 8453`)  
**Fixtures:** disposable Privy test-account slots 1 (React) and 2 (Core JS), unfunded

The two controls were run after the fixture reset. Request bearer tokens and raw authorization
signatures are redacted; the signature SHA-256 and length preserve comparison evidence without
leaving reusable credentials in the repository.

## React arm — fixture slot 1

Request: `POST https://api.pirate.sc/api/privy-relay`

```json
{
  "chainId": 8453,
  "intentId": "efw_e7580df86815491aa8ad8fd7ccfab56f",
  "transactionIndex": 1,
  "intent": { "type": "pirate.follow.mint-primary-list", "slot": "server-prepared" },
  "transaction": {
    "data": "0xf3250cbd000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000560101000000000000000000000000000000000000000000000000000000000000210541aa48ef3c0446b46a5b1cc6337ff3d3716e2a33448cb4551764c3eea83fe1a24c477f24c1e8ed0c7ebe4f95cec7ce2aed2f79bf00000000000000000000",
    "to": "0xdb17bfc64abf7b7f080a49f0bbbf799ddbb48ce5"
  },
  "walletAddress": "0x2fe8f181db0404787635065287c0583738b0cf7a",
  "privyWalletId": "mlsrhtbt9hm5a7wjcl238h8o",
  "authorizationSignature": "<sha256:7248de3ea00ca7895bde0f2cfe034db45c1f2559353f019d6f60d2773c459866;length:96>",
  "requestExpiry": "1786657644983"
}
```

Headers included `content-type: application/json` and a redacted `Authorization: Bearer ...`.

Response:

```json
{
  "status": 500,
  "body": {
    "code": "internal_error",
    "message": "Internal server error",
    "retryable": true,
    "request_id": "a2aabf1b0aeb2dc9"
  }
}
```

## Core JS arm — fixture slot 2

Request: `POST http://localhost:5173/pirate-api/api/privy-relay` forwarded to
`https://api.pirate.sc/api/privy-relay`

```json
{
  "chainId": 8453,
  "intentId": "efw_9944097cebc5488bb04d98ca899c611e",
  "transactionIndex": 1,
  "intent": { "type": "pirate.follow.mint-primary-list", "slot": "server-prepared" },
  "transaction": {
    "data": "0xf3250cbd000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000560101000000000000000000000000000000000000000000000000000000000000210541aa48ef3c0446b46a5b1cc6337ff3d3716e2a33065c8864982484a4d512fedeef46bdf8c1678a113bfe16a0b942c6aa5e6f82c400000000000000000000",
    "to": "0xdb17bfc64abf7b7f080a49f0bbbf799ddbb48ce5"
  },
  "privyWalletId": "brt7je20oc4xou67cp2v07fv",
  "walletAddress": "0x655FCC58895BCaf379E234651530bb9A3477Bd18",
  "authorizationSignature": "<sha256:0ffacfba386aae7d9cfc5668bca57a70ffb8d4f57d43d958b7cb406f4f6a691f;length:96>",
  "requestExpiry": "1786657675507"
}
```

Headers included `content-type: application/json` and a redacted `Authorization: Bearer ...`.

Response:

```json
{
  "status": 500,
  "body": {
    "code": "internal_error",
    "message": "Internal server error",
    "retryable": true,
    "request_id": "a2aabfd9987b3107"
  }
}
```

The Core arm then submitted its signed request directly to `https://api.privy.io/v1/wallets/{id}/rpc`
and received HTTP 200 with both a transaction ID and hash.

## Classification

The request schemas are identical; only fixture-specific intent, wallet, transaction, expiry, and
signature values differ. Both callers fail at the Pirate wrapper while Core's direct Wallet API
request succeeds. This classifies the wrapper failure as a framework-neutral API defect and clears
the React/Core parity question for Solid; M2 remains blocked only until the API defect is fixed.

## Runtime-tail diagnostic — 2026-08-14

A bounded replay attempt was made against the existing staging Worker while a
foreground Wrangler tail was connected. The tail connected to staging SHA
`5cb523a395b392474ec0b6aa41a72dd8bd6da72f` but captured no invocation. The
captured request bodies above cannot be replayed: bearer tokens and raw
authorization signatures are intentionally redacted, and their recorded
expiries have elapsed. A fresh disposable fixture plus Privy test credentials
and OTP is required for the next live-tail differential. The shared staging
hold prohibited deployment, so no Worker state was changed.

Result: no new exception or failing stage was observed; the 500 remains
attributed to the wrapper by the existing two-arm differential, but its internal
failure site is still uninstrumented. No speculative fix was made.

## Fresh staging attempt — 2026-08-14

The held staging Worker was tailed again while the Core JS harness was pointed
at `https://api-staging.pirate.sc`. Privy's fresh-account authentication stopped
at `send-code` with `Origin not allowed` from the local harness origin, before
the API session exchange or relay route. The tail therefore recorded no
`/api/privy-relay` invocation and no server exception. No deployment or shared
staging mutation occurred. The next live-tail attempt needs a browser origin
accepted by the Privy app (or an equivalent authenticated fixture path) before
it can exercise the relay.
