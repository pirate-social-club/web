# Phase A — production performance baseline

**Date:** 2026-08-13  
**Target:** `https://pirate.sc/`  
**Status:** **Measured mobile deficit; performance remains a legitimate migration driver.**

## Lab conditions and scope

Three Lighthouse 12.x mobile-emulation runs were captured against the live apex route with
`chrome-headless-shell` and 4× CPU throttling. One was a cold run and two were warm runs. The reports
are session-scoped under `scratchpad/lh-mobile.json`, `scratchpad/lh-mobile-2.json`, and
`scratchpad/lh-mobile-3.json`; this document is the durable record of the results.

The earlier Chrome DevTools MCP attempt was unavailable because its configured executable was missing,
and the PageSpeed Insights API fallback returned HTTP 429. Those tooling failures do not invalidate
these independent Lighthouse measurements.

This is lab data only. There is no CrUX/field-user dataset, and this is one route. The cold-run Speed
Index is a cold-cache artifact; the warm runs are the more representative comparison for an already
edge-cached deployment.

## Core results

| Metric | Cold run | Warm run 1 | Warm run 2 | Verdict |
| --- | ---: | ---: | ---: | --- |
| Lighthouse performance score | 57 | 65 | 67 | Needs improvement |
| LCP | 5.15 s | 5.17 s | 5.17 s | Poor (2.5 s good threshold) |
| TBT | 470 ms | 364 ms | 337 ms | Needs improvement |
| TTI | 8.1 s | 8.0 s | 8.0 s | Poor |
| CLS | 0.002 | 0.002 | 0.002 | Excellent |
| TTFB | 509 ms | 44 ms | 37 ms | Warm edge cache is healthy |

The LCP is effectively stable at approximately 5.17 seconds across all three runs. The LCP element
is a feed-chrome overlay `div`, not video or another media element: the browser is waiting for
client-rendered UI rather than media transfer.

## Production HTTP snapshot

Collected from the live deployment at approximately 2026-08-13 19:14 UTC:

| Check | Observation |
| --- | --- |
| `GET /` | HTTP 200; `text/html; charset=utf-8`; served by Cloudflare. |
| HTML response body | 118,976 bytes from `curl` (uncompressed response body). |
| Security headers | CSP with a per-response nonce, `X-Content-Type-Options: nosniff`, strict referrer policy, and permissions policy were present. |
| Critical asset cache | Named JS/CSS assets returned `cf-cache-status: HIT` and `cache-control: public, max-age=31536000, immutable`. |
| Module assets in document | `/assets/client-BSQuHsAR.js` and `/assets/app-DDL-oKK8.js` are module-preloaded; three CSS assets are linked in the document head. |
| API/bootstrap work | The HTML contains the home-feed bootstrap request to `api.pirate.sc` and preconnects to the API and media origin. |

The five named assets measured from the live responses total 616,736 bytes before any transfer encoding:

| Asset | Bytes |
| --- | ---: |
| `client-BSQuHsAR.js` | 309,425 |
| `app-DDL-oKK8.js` | 85,001 |
| `video-player-D0Fmmkw-.css` | 59,762 |
| `karaoke-route-BSja4Ml5.css` | 2,998 |
| `tokens-BwlU7g_G.css` | 159,550 |
| **Total** | **616,736** |

These asset-size observations remain useful context, but the Lighthouse run now supplies the missing
execution evidence. The page has approximately 1.6 seconds of JavaScript bootup, 4.4 seconds of
main-thread work, and the single main client bundle (`client-BSQuHsAR.js`) accounts for approximately
2.3 seconds total / 1.4 seconds scripting under throttle. Lighthouse identified only about 92 KiB of
unused-JavaScript savings, so this is not primarily dead-code/tree-shaking waste: the roughly 617 KiB
named asset set is substantially used.

## Decision use

The baseline establishes a real, stable, script-dominated mobile deficit. Warm TTFB is approximately
40 ms and CLS is 0.002, so server latency and layout instability are not the primary causes. The
client-rendered-shell architecture is the leading measured explanation for the 5.2-second LCP.

This validates performance as a reason to investigate. The working product hypothesis is that Solid's
fine-grained client runtime will materially improve this script-dominated shell. The program now
executes a parallel Solid application with hard cutover; this baseline informs M3 video-feed Home and
the Solid 2 seam spike rather than serving a React-vs-Solid gate.

Streaming SSR on Workers remains a precondition for M3 and the Solid 2 seam spike. If the target
runtime cannot pass that seam, those milestones must explicitly record async SSR as the tested mode.

## Required follow-up

The next baseline expansion should capture:

1. The same three-run mobile protocol for an authenticated-route shell and one content route, if we
   want route coverage before the PoC.
2. INP (or an explicitly documented interaction proxy if Lighthouse cannot produce it), plus FCP,
   LCP, TBT, CLS, TTI, and TTFB.
3. Network request and transfer sizes for the named assets and lazy-loaded route chunks.
4. M3/Solid 2 seam measurements using the same production route, data flow, and lower-end mobile
   protocol; no migration gate is implied.

Performance is no longer unknown: it is a measured reason to investigate. The baseline now feeds the
parallel Solid execution plan and M3 acceptance work.
