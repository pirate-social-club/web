# Phase A — SolidStart v2 on Cloudflare viability

**Date:** 2026-08-13  
**Scope:** documentation and repository configuration only; no application code or deployment changes.  
**Decision status:** **Platform-level pass; bounded seam PoC passes for async SSR, with streaming as an M3/Solid 2 seam precondition.**

**Program note (2026-08-14):** The comparative migration gate was waived by `workspace_owner`; this
record now feeds the parallel Solid application, hard cutover, M3 video-feed Home, and Solid 2 seam
spike.

## Executive finding

There is a credible current production path for SolidStart v2 on Cloudflare. The current SolidStart v2 documentation describes the Vite Environment API integration and explicitly documents compatibility with the Cloudflare Vite plugin. Cloudflare's official Vite plugin provides the Worker runtime, SSR/full-stack build integration, assets, and access to Worker bindings. This is not a missing-adapter or “community adapter abandoned” blocker.

This does **not** mean the Pirate Web application is a 1:1 configuration migration. The existing application has two Worker deployments, Redwood's custom route/render pipeline, HNS forwarder authentication, sovereign multi-domain URL normalization, and CSP nonce propagation through the document renderer. Those behaviors have credible equivalents in SolidStart middleware/server routes, but their exact wiring and parity are implementation work and were not proven by this docs-only check.

The overall Phase A investigation is now a **conditional pass under the explicit test-fixture
scope** recorded in the Privy inventory. The bounded seam result is recorded in
[the Cloudflare seam PoC](solidstart-phase-a-cloudflare-seam-poc.md). Cloudflare does not add a
second terminal blocker; the Core fresh-wallet proof passes and the relay differential routes the
retryable 500 to the framework-neutral API lane before implementation funding.

## Sources checked

- [SolidStart v2 overview](https://docs.solidjs.com/solid-start/v2)
- [SolidStart v2 configuration reference](https://docs.solidjs.com/solid-start/v2/reference/config/solid-start)
- [SolidStart middleware](https://docs.solidjs.com/solid-start/advanced/middleware)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Cloudflare Vite plugin configuration](https://developers.cloudflare.com/workers/vite-plugin/reference/configuration/)
- [Cloudflare bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Cloudflare framework automatic configuration](https://developers.cloudflare.com/workers/framework-guides/automatic-configuration/)

## Repository evidence

### Current Worker and build shape

| Evidence | Finding | Portability implication |
| --- | --- | --- |
| `web/vite.config.ts:4-5,73-80` | The project already uses `@cloudflare/vite-plugin` plus `rwsdk/vite`; the Cloudflare environment is named `worker`. | Cloudflare's Vite integration is already exercised by this repository. Replacing Redwood's plugin is still required; the existing `viteEnvironment` name must be revalidated against SolidStart v2's server environment. |
| `web/package.json:99,105,132` and `web/bun.lock:185,2351,2601` | Current stack is `rwsdk@1.3.0-canary.4`, `@cloudflare/vite-plugin@1.35.0`, and Vite `8.0.16`; no `@solidjs/start` package is installed. | The Vite 8 baseline is compatible with the current SolidStart v2 documentation. SolidStart itself, its router, and its server runtime would be a new toolchain surface. |
| `web/wrangler.jsonc:3-6,24-29` | Main Worker is `src/worker.tsx`, with `nodejs_compat`, a `dist/client` assets binding, routes for `pirate.sc` and `www.pirate.sc`, and observability. | The target deployment model is supported by the Cloudflare Vite plugin. The asset binding and route declarations must be carried into the new build. |
| `web/wrangler.jsonc:31-46` | Staging is a separate Wrangler environment and route (`staging.pirate.sc`). | Staging is configuration work, not a platform blocker, but it must be retained in a migration PoC. |
| `web/wrangler.public.jsonc:3-27` and `web/src/worker-public.ts` | A second public-profile Worker is deployed separately, with its own staging environment and no route declarations in this file. | A SolidStart migration of the main Worker does not automatically migrate this Worker. Retain it as a separate Worker or explicitly prove an auxiliary-worker arrangement. |
| `web/worker-configuration.d.ts:7-20` | Generated bindings are only `ASSETS` and four string vars. | The web Worker currently has no D1, KV, R2, Durable Object, Queue, or service binding to port. |

### Runtime behavior that must survive

| Area | Current evidence | SolidStart/Cloudflare assessment |
| --- | --- | --- |
| HNS and sovereign host handling | `web/src/worker.tsx:468-555,652-679` computes an effective URL, authenticates forwarded requests before rendering, derives discovery/canonical origins, matches host-sensitive routes, and fails closed for mismatches. | **Credible but unproven.** SolidStart request middleware/server handlers can perform this normalization and return redirects/rejections. Route parity across HNS hosts, forwarded community paths, and `.well-known` responses needs a focused test matrix. |
| Route/render pipeline | `web/src/worker.tsx:457-650` uses a Redwood `defineApp` middleware/error/render pipeline and a large explicit route table. | **Application migration cost.** SolidStart's file-based routes and middleware can represent the behavior, but the route table and `ctx` contract do not transfer mechanically. |
| CSP and nonce | `web/src/worker.tsx:554-560` calls `applySecurityHeaders(..., rw.nonce, ...)`; `web/src/lib/security/csp.ts:12-23,120-137` requires a per-response nonce and does not grant general `unsafe-eval`; `web/src/app/document.tsx:138-165` applies the nonce to inline and module scripts. | **Credible but an important proof point.** Generate the nonce at the request boundary, make it available to the server document/head, and preserve every existing CSP origin. SolidStart's JSON serialization mode should be selected; its JavaScript serialization mode would require evaluating whether current CSP remains strict enough. |
| API/data placement | The current web Worker has no state bindings and calls the separate API origin from route/server code. | **Favorable.** The first migration does not need to move API state into SolidStart or introduce Durable Objects. Keep the API origin boundary while proving SSR fetch behavior on workerd. |
| Assets | `web/wrangler.jsonc:24-26` binds `dist/client` as `ASSETS`; the document references CSS and client module assets. | **Supported.** SolidStart's Cloudflare build must emit the equivalent client asset directory and preserve cache/route behavior. |
| Multi-worker deployment | `web/wrangler.jsonc` and `web/wrangler.public.jsonc` define distinct names, vars, routes, and staging settings. | **Unknown until PoC.** Cloudflare supports multiple Workers, but SolidStart's normal app scaffold will not infer this repository's second-worker topology. |

## Binding, Durable Object, and service-binding check

Cloudflare's current plugin and runtime documentation support the binding classes relevant to the audit: D1, KV, R2, Durable Objects, Queues, and service bindings. Bindings are declared in Wrangler and exposed to the Worker handler/runtime; they are not tied to React or Redwood.

The current Web Worker has none of these bindings. `ASSETS` is the only non-variable binding in the generated environment type. The API is a separate service, so this is not a missing capability that blocks a SolidStart migration. If a future design co-locates API work, booking coordination, or other stateful behavior in the Web Worker, add the binding in Wrangler and prove its access from a SolidStart server route before changing the architecture. Do not introduce Durable Objects merely to make the framework comparison symmetrical.

## Cloudflare environment naming

The current Vite config uses `viteEnvironment: { name: "worker" }` (`web/vite.config.ts:76-78`). Cloudflare's framework examples commonly use an `ssr` Vite environment, while the current Redwood integration uses `worker`. SolidStart v2's Vite Environment API support makes the combination plausible, but the exact environment name and plugin ordering must be confirmed by a minimal SolidStart v2 build. Treat this as an implementation unknown, not as evidence of incompatibility.

## Required proof if the Privy gate reopens

Run a small, disposable SolidStart v2 Cloudflare proof of concept before mapping the full application:

1. Build and run one SSR route through the official Cloudflare Vite plugin on workerd with the repository's Vite 8 baseline.
2. Declare `ASSETS` and one harmless test variable in Wrangler; read them from the server handler and verify the generated Worker types.
3. Add request middleware that reproduces effective-host URL normalization, a fail-closed forwarded-request branch, and a response header.
4. Generate a CSP nonce at the request boundary, pass it into the document/head, and verify inline bootstrap and module scripts are accepted without adding `unsafe-eval`.
5. Exercise the API-origin fetch path and one staging environment.
6. Keep `wrangler.public.jsonc` as a separate deployment in the first iteration; only consolidate it after host routing and cache behavior are measured.

The PoC should stop at the first parity failure. Durable Objects and service bindings are optional follow-up checks, because they are not present in the current Web Worker.

## Gate result

| Gate | Result | Meaning |
| --- | --- | --- |
| Current official SolidStart/Cloudflare path exists | **Pass** | SolidStart v2 plus the official Cloudflare Vite plugin is a supported platform direction. |
| Current app's exact Worker topology transfers automatically | **Partially proven** | The disposable PoC proves one main Worker path and the HNS/CSP seams; public-Worker topology, staging, and full route parity remain. |
| CSP nonce and strict policy have a credible port | **Pass at design level; implementation unknown** | The required request/header/document seams exist in SolidStart, but nonce propagation must be tested. |
| Durable Object/service binding capability | **Pass, not currently needed** | Cloudflare supports them; this Web Worker has none to migrate. |
| Phase A overall | **Conditional pass by product scope** | Legacy test-wallet migration is excluded; Core fresh-wallet authorization passes and the relay differential routes the retryable 500 to the API lane. The bounded Cloudflare seam PoC passes async SSR; streaming is an M3/Solid 2 seam precondition and full two-Worker parity remains follow-up work. |

## Conclusion

Cloudflare should not be used as the reason to reject SolidStart. The honest classification is:
**credible platform path, bounded seam proof passed for async SSR, non-trivial application adaptation,
and no terminal Cloudflare blocker**. Under the explicit decision to exclude legacy test fixtures, the
next spend is clearing the correctly routed API relay failure—not a ten-module rewrite.

## Follow-up PoC results (2026-08-14): two-Worker topology, CSP nonce, HNS routing

A second bounded PoC ran at `/home/t42/Documents/pirate-workspace/solidstart-seam-poc/`
(its own git repo; not part of this repository) with `@solidjs/start@2.0.0`,
`@cloudflare/vite-plugin@1.52.1`, Vite 8.2.1, and Wrangler 4.123.0. It is a
disposable local fixture — no deployment was made, and nothing in this
repository's application code or Wrangler configs was changed.

### Working entry-point arrangement (previously an implementation unknown)

The expected first failure did not materialize as feared, and the resolved
arrangement is a deliverable finding:

- SolidStart v2 names its SSR Vite environment `ssr`
  (`VITE_ENVIRONMENTS.server = "ssr"` in `@solidjs/start`'s constants). The
  documented `cloudflare({ viteEnvironment: { name: "ssr" } })` pairing is
  therefore exact: the plugin merges the Workers runtime into SolidStart's own
  server environment; no Nitro adapter or plugin switch is required.
- The plugin owns entry resolution for that environment. It ignores the
  `main` value from the user `wrangler.jsonc` and emits
  `dist/server/wrangler.json` with `main` set to the built entry chunk
  (`index.js`), plus `no_bundle: true`, an ESModule rule, and an injected
  `assets` binding pointing at `../client`. Any `main` pointing at
  `src/entry-server.tsx` in the user config is dead configuration, not an
  error.
- `auxiliaryWorkers: [{ configPath: "./workers/public/wrangler.jsonc" }]`
  builds the second Worker alongside the SSR Worker
  (`dist/solidstart_seam_poc_public/`), and the `services` binding from the
  main `wrangler.jsonc` survives the merge. This closes the "public-Worker
  topology unknown" item for a local workerd proof.

**Carried forward into the dependency matrix (spec §4/§5):** this
entry-resolution semantics is an operational difference from RedwoodSDK, not a
framework portability item. Under RedwoodSDK the repository's Wrangler config
is the authority on `main`; under SolidStart v2 + `@cloudflare/vite-plugin`
the build owns it and rewrites the emitted `wrangler.json`. Web's release
pipeline currently reasons about the artifact assuming it knows where `main`
points; a migration must treat `dist/server/wrangler.json` (post-build) as the
source of truth for entry, assets, and binding merges, and should revalidate
its deploy tooling against that artifact rather than the source config.

### Seam results (vite preview, workerd-backed, port 4173)

| Seam | Result | Evidence |
| --- | --- | --- |
| 1 — CSP nonce propagation | **Pass** | Middleware nonce in the `Content-Security-Policy` header matched the nonce on all three SSR-emitted `<script>` tags (inline `_$HY` bootstrap, seroval JSON payload, module `entry-client`), under `script-src 'nonce-…' 'strict-dynamic'` with no general `unsafe-eval`. A headless-browser click on the SSR-rendered counter advanced it from 0 to 1 with an empty console — hydration works with the strict CSP enforced and no CSP violations. The per-request `createHandler(event => ({ nonce }))` options seam worked as scaffolded. |
| 2 — Two-Worker topology | **Pass** | `vite build` emitted both Worker bundles; `/seam/binding` (a server route using `import { env } from "cloudflare:workers"`) returned the auxiliary Worker's JSON through the `PUBLIC` service binding inside workerd. |
| 3 — HNS host routing | **Pass** | `Host: example.hns` on `/` → 307 with `Location: https://app.example.hns/`; `Host: app.example.hns` → 200 with `x-seam-host-surface: sovereign-app`; `/seam/host` reported `sovereign-app` for the app host and `canonical` for localhost. |

Seam 3 scoping: **mechanism proven; the full sovereign routing contract is
migration work, not a platform risk.** The toy classifier models host
classification and the apex redirect only. It does not model production's
forwarding metadata on imported roots (missing metadata currently sends
non-`app.` roots to router not-found), the sovereign-context negative probe, or
cache interactions with the Host-derived surface.

### v2 / plugin caveats (all configuration-only, all recorded in the PoC repo)

1. **`vite preview` needs SolidStart's Node preview middleware disabled.**
   SolidStart's built-in `solid-start-dev-server` plugin registers an
   unconditional `configurePreviewServer` hook that requires its native layout
   (`dist/server/entry-server.js`) and would serve every preview request from
   Node, shadowing the Cloudflare plugin's workerd-backed preview proxy and
   dropping Worker bindings. With the Cloudflare plugin owning the `ssr`
   environment, that file never exists. The PoC neutralizes the hook in
   `vite.config.ts` (mutate the plugin at `configResolved`); the alternative is
   to skip `vite preview` and run Wrangler directly against
   `dist/server/wrangler.json`. This is a SolidStart preview-hook limitation,
   not a platform blocker.
2. **Vite's preview host allowlist rejects non-local `Host` headers** before
   they reach the Worker (HTTP 403), which masks HNS-style host probing.
   `preview: { allowedHosts: [".hns"] }` in `vite.config.ts` restores
   passthrough. Production workerd has no equivalent Vite-side check; this is
   a local-probing accommodation only.
3. Serialization mode was the documented JSON mode
   (`import.meta.env.SEROVAL_MODE` = `json`); the payload is emitted as a
   nonced inline script and passes the strict CSP. Streaming SSR was not
   re-exercised and remains a follow-up per the earlier PoC's limitation note.

### SolidStart v2 + Cloudflare plugin integration maturity

| Concern | Finding | Blast radius |
| --- | --- | --- |
| Preview middleware | The PoC disables SolidStart's Node preview hook by reaching into the resolved plugin array and blanking `configurePreviewServer`. This is a private-API poke that breaks silently if SolidStart renames the `solid-start-dev-server` plugin or reorders hook registration in a future release. | **Preview-only.** The deploy path consumes `dist/server/wrangler.json` and never touches the hook. Any CI or e2e harness built on `vite preview` inherits the wart and must pin versions (the PoC now pins exact dependencies) or switch to `wrangler dev` against the emitted config. |
| Entry ownership | The plugin, not `wrangler.jsonc`, owns the SSR entry: user `main` is ignored and the built artifact's `main` points at the plugin-resolved chunk. | Changes how deploy tooling reasons about the artifact; see the dependency-matrix note below. |
| Platform status | Both accommodations are consequences of SolidStart v2 and the plugin integrating through Vite's Environment API rather than through a dedicated adapter; neither is a runtime or deploy blocker. | Treat as "newly documented integration territory" — per the audit spec's stability disclosure requirement, these conclusions rest on `@solidjs/start@2.0.0` + `@cloudflare/vite-plugin@1.52.1` exactly. |

### Net effect on this document's gate rows

The "Current app's exact Worker topology transfers automatically" gate can move
from *partially proven* to *proven for the local workerd build shape* (main
Worker + auxiliary Worker via service binding, under the plugin's
`auxiliaryWorkers` merge). Remaining unproven: staging environments, full route
parity, HNS signature semantics across every production branch, and production
deployment of the two-Worker arrangement — all implementation work for a
migration, not framework or platform blockers.
