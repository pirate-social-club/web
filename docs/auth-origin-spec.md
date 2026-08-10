# Auth Origin Spec

> Product rule for where Privy authentication is attempted vs. deferred to a canonical origin.

## 1. Canonical interactive app origins

Authentication (Privy connect / wallet login / session refresh) is attempted **only** on these origins:

- `https://pirate.sc`
- `https://www.pirate.sc`
- `https://app.pirate` — if Privy supports it and it is whitelisted
- `https://staging.pirate.sc` and subdomains — for staging/testing
- `localhost`, `127.0.0.1`, `*.localhost` — for local development

The bounded direct-wallet pilot also permits individually activated
`https://app.<root>` origins after each exact origin is registered with Privy.
These unrelated origins share the production Privy app and user base, but not
browser storage or the `pirate.sc` passkey RP ID. They therefore offer wallet,
email, and social login while omitting passkey login. This exception is not the
scalable custom-origin wallet architecture.

## 2. Custom namespace origins (public / read-first)

The following origins are **public-readable by default**. The full app SPA may load, but authenticated/write/wallet actions are gated:

- **HNS roots** like `https://myroot/` — verified namespace communities served via Handshake DNS
- **Profile hosts** like `name.pirate`, `name.clawitzer` — handled by `worker-public.ts` as standalone public pages
- **Spaces-resolved URLs** — `freedom_url` or `web_url` returned by the Spaces resolver

### HNS root routing note

The namespace verification UI advertises `https://{routeSlug}/` as a Handshake URL. The worker can receive a forwarded HNS community route via `x-pirate-hns-community-route`; when that header is absent, a bare HNS root still loads the SPA at `/` and cannot infer the target community from the browser URL alone.

## 3. Auth-required actions on non-canonical origins

**Do not** call `authRuntime.connect()` or mount Privy modals on non-canonical origins.

Instead, show a deterministic CTA:

- Label: **"Open in Pirate to sign in"** (localized via `copy.publicProfile.openInPirate`)
- Destination: preserves intent
  - `https://pirate.sc{pathname}{search}` as the universal fallback
  - `https://app.pirate{pathname}{search}` only when Freedom Browser + HNS is confirmed

Implementation:

```ts
import { isCanonicalAuthOrigin, buildCanonicalAuthUrl } from "@/lib/auth-origin";

function requestAuth(fallbackMessage: string) {
  if (!isCanonicalAuthOrigin()) {
    const canonicalUrl = buildCanonicalAuthUrl();
    toast.error(fallbackMessage, {
      action: {
        label: copy.publicProfile.openInPirate,
        onClick: () => { window.location.href = canonicalUrl; },
      },
    });
    return;
  }
  // normal Privy connect path
}
```

## 4. No silent redirects for reading

Reading (community feed, post threads, profiles, public media) stays on the custom/root domain. Redirect **only** when the user explicitly initiates an auth-required action (follow, join, vote, comment, wallet connect, song purchase).

## 5. Spaces handles

Only **root-style** `@space` handles are supported today. `name@space` (subspace/path semantics) is rejected by the Freedom Browser parser and should not be spec'd unless explicitly built.

## 6. Runtime guard checklist

Routes/surfaces that should apply the guard:

- [x] `public-community-route.tsx` — follow, join CTAs
- [x] `post-route.tsx` — auth-required 18+ and live-room actions
- [x] `use-community-interaction-gate.tsx` — unauthenticated join, vote, comment, and home/community feed gated actions

Open items moved to [`TODO-auth-origin-guards.md`](./TODO-auth-origin-guards.md).

---

*Last reviewed: 2026-05-31*
