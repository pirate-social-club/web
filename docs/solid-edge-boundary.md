# React → Solid service boundary

> Historical boundary record. The tracked `web/solid` service was retired;
> the `SOLID` deployment details below are retained for audit history only.

The React Worker is the only public dispatcher. After it authenticates the HNS
forwarder envelope and removes identity/session credentials, it signs the
request sent through the `SOLID` service binding. The Solid Worker rejects
every unsigned or invalid request with `404 Not found` before host routing,
HNS middleware, SSR, API, KV, assets, or `/__version` work.

## Protocol v1

The request carries two internal headers:

- `x-pirate-solid-edge-timestamp`: decimal Unix timestamp in seconds;
- `x-pirate-solid-edge-signature`: `v1=` followed by an unpadded base64url
  HMAC-SHA-256 digest.

The HMAC key is the secret `SOLID_EDGE_HMAC_KEY`. It is a Wrangler secret in
each environment, never a request header, and never forwarded to Solid.

The signed canonical value is a JSON array containing, in order:

1. `pirate-solid-edge-auth-v1`;
2. the bounded timestamp;
3. the upper-case method;
4. the exact effective request URL;
5. the exact effective path and query;
6. the SHA-256 body digest in lowercase hex, or an empty string for GET/HEAD;
7. the authenticated HNS context: trusted marker, forwarded host, root,
   community ID, community route, subdomain, and wallet-interactive marker.

The default timestamp acceptance window is ±300 seconds and is capped at one
hour even when configured. This is a bounded replay window, not a global replay
cache: no request-state map or KV read is introduced before authentication.
Body signing/verifying is bounded to 2 MiB and uses a clone, leaving the
forwarded request body available to the service.

## Response boundary

Before the React Worker returns a Solid response to a client, it removes
`Set-Cookie`, hop-by-hop transport headers, and private `x-solid-*`,
`x-pirate-solid-*`, `x-seam-*`, and `x-internal-*` headers. Status, body, cache, content,
redirect, and normal security headers remain intact.

## Asset namespace

Solid assets use `/_solid/assets/*`. The Solid Worker maps that private route
to the ASSETS binding's build path `/assets/*`. React's public `/assets/*`
namespace remains owned by the React Worker and is never claimed by Solid.
