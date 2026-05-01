# Auth Origin Spec

> Product rule for where Privy authentication is attempted vs. deferred to a canonical origin.

## 1. Canonical interactive app origins

Authentication (Privy connect / wallet login / session refresh) is attempted **only** on these origins:

- `https://pirate.sc`
- `https://app.pirate` — if Privy supports it and it is whitelisted
- `https://staging.pirate.sc` and subdomains — for staging/testing
- `localhost`, `127.0.0.1`, `*.localhost` — for local development

## 2. Custom namespace origins (public / read-first)

The following origins are **public-readable by default**. The full app SPA may load, but authenticated/write/wallet actions are gated:

- **HNS roots** like `https://myroot/` — verified namespace communities served via Handshake DNS
- **Profile hosts** like `name.pirate`, `name.clawitzer` — handled by `worker-public.ts` as standalone public pages
- **Spaces-resolved URLs** — `freedom_url` or `web_url` returned by the Spaces resolver

### HNS root routing note

The namespace verification UI advertises `https://{routeSlug}/` as a Handshake URL, but the main SPA worker (`worker.tsx`) does **not** currently perform host-based community routing. Visiting an HNS root loads the SPA at `/` (home feed), not the community. Host-to-community routing or a redirect rule is required for HNS roots to land on the correct community page.

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
- [x] `use-community-interaction-gate.tsx` — unauthenticated vote/comment-style gated actions
- [ ] `community-route.tsx` — follow, join, create-post CTAs
- [ ] `post-route.tsx` — vote, comment CTAs
- [ ] `wallet` route — connect wallet CTA
- [ ] Home feed — vote CTA (when unauthenticated)

---

*Last updated: 2026-05-01*
