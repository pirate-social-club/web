# Phase A — SolidStart v2 Cloudflare seam PoC

**Date:** 2026-08-14  
**Scope:** disposable proof only; no application or deployment changes.  
**Result:** **Pass for async SSR and the tested HNS/CSP seams; streaming remains a precondition for M3 video-feed Home and the Solid 2 seam spike.**

**Program note (2026-08-14):** The comparative migration gate was waived; this seam result is now
an execution input for the parallel Solid application and hard cutover.

## What was tested

The ignored fixture at `web/.tmp/solidstart-seam-poc/` uses the current toolchain shape:

- `@solidjs/start@2.0.0`
- `solid-js@1.9.14`
- `@cloudflare/vite-plugin@1.35.0`
- `vite@8.0.16`
- `wrangler@4.81.1`
- Cloudflare `nodejs_compat`, `ASSETS`, and an HNS-forwarded-host variable

The fixture includes one SolidStart SSR route, request middleware, effective-host derivation from
the forwarded HNS header, a per-response CSP nonce, and the Cloudflare Vite plugin. It was built with
the generated Worker entry and run locally through Wrangler/Miniflare (workerd).

Commands:

```text
bun install
bun run build
bunx wrangler dev --config dist/server/wrangler.json --local --port 8799
```

## Evidence

The production build passed. The local Worker probe passed for both a direct request and an HNS-style
forwarded request:

| Check | Direct request | Forwarded-host request |
| --- | --- | --- |
| HTTP response | 200 HTML | 200 HTML |
| SSR title rendered | yes | yes |
| Effective host propagated | yes | yes; derived from forwarded header |
| CSP nonce present | yes | yes |
| HTML script nonces match CSP nonce | yes | yes |
| General `unsafe-eval` present | no | no |

The existing production probes also remain green: the unsigned HNS request is accepted as the
unsigned branch, the malformed signature is rejected by the boundary probe, and the live document
contains matching CSP nonces without general `unsafe-eval`. The current public Worker remains a
separate Wrangler entry (`wrangler.public.jsonc` / `src/worker-public.ts`); the PoC did not attempt to
merge that topology.

## Important limitation

SolidStart's default streaming handler returned an object-shaped body (`[object Object]`) under this
local Wrangler/Miniflare run. Switching the proof route to SolidStart's documented async handler
produced correct HTML and passed every seam assertion above. This is not a platform-level blocker,
but streaming SSR is not yet proven for Pirate's target runtime. It is an explicit precondition for
M3 video-feed Home and the Solid 2 seam spike; those milestones must pass the streaming seam on
Workers or explicitly ship async SSR as their tested mode.

## Gate interpretation

This PoC removes the Cloudflare platform/seam question from the terminal-blocker list for a bounded
Solid experiment. It does not prove full route-table parity, HNS signature semantics across every
production branch, the two-Worker deployment, or performance. Those remain implementation work for
the parallel Solid application and hard-cutover plan.
