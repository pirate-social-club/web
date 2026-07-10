# Web security, performance, and maintainability audit — 2026-07-10

Baseline: `origin/main` at `e8a6cbe7`, audited from the clean `audit/web-security-performance-2026-07-10` worktree. The original `web/` checkout and its 29 dirty paths were not modified.

## Verified baseline after fixes

- At the original audit baseline, `bun run types:safe` passed against API contracts
  from then-current API main (`f3592eba`), rather than the stale `api/` salvage
  checkout.
- `bun run ui:audit`: passes.
- Focused security, public Worker, karaoke, bookings-timezone, and cache tests pass.
- Knip covers the root app plus `packages/bookings-domain` and `packages/karaoke-runtime`.
- Knip: 0 unused files, 0 unused dependencies, 0 unlisted dependencies, 0 duplicate exports.
- Remaining Knip findings: 209 unused value exports and 217 unused exported types.
- No Neon or Turso identifiers remain. The remaining `libsql_busy` worklist text describes generic local SQLite behavior, and the bookings-domain `@libsql` regex is an intentional forbidden-import guard.

The local file dependency `@pirate/api-contracts: file:../api/services/contracts` is a reproducibility hazard: a clean Web worktree can typecheck against whichever branch happens to be checked out in the separate `api/` directory. The first run failed against the stale salvage branch and passed after installing the current-main contract file. CI should install contracts from a pinned commit/artifact or a coordinated workspace checkout.

Rebase verification on Web main `fa63ed20` passed 71 focused tests across the
eight touched unit-test files, `bun run ui:audit`, and the Knip audit. The current
`bun run types:safe` invocation reports four inherited cross-repository contract
errors in `use-song-submit.ts` and `community-sidebar-helpers.ts`; #196 has no diff
in either file. This is the same local `file:` dependency hazard described above,
not a regression introduced by this pass.

## Fixed in this pass

### Security and Worker correctness

- Removed an HTML-injection path in `worker-public-html.ts`. A user-controlled `cover_ref` was interpolated into a double-quoted inline `style` attribute without HTML escaping. Covers now render as an escaped `<img src>` and a DOM-level regression test verifies that a hostile URL cannot create an `onerror` attribute.
- Added a restrictive CSP, `nosniff`, referrer policy, and frame denial to every dedicated public-profile HTML response.
- Added a five-second upstream timeout and a safe 502 error boundary to the public-profile Worker.
- Replaced the Telegram session proxy's unconditional `request.clone().arrayBuffer()` with request-body streaming.
- Replaced direct HNS forwarder-token comparison with fixed-length SHA-256 comparison and Workers `timingSafeEqual` (with a fixed-loop Bun test fallback).
- Rejected non-HTTP(S) schemes in the shared external-link launcher and routed Self verification redirects through it.
- Removed support for `VITE_COINGECKO_API_KEY`; `VITE_*` values are browser-visible and must not be presented as a safe place for API credentials.
- Removed duplicate Agora entries from the main CSP.

### Performance

- Public anonymous GETs no longer receive `x-pirate-anonymous-id` or `x-pirate-session-id`. Those non-safelisted headers forced CORS preflights from `pirate.sc` to `api.pirate.sc`; the session header remains on mutations where the API uses it for submit tracing and a preflight already exists.
- CoinGecko prices are now cached per asset. The old single response cache returned incomplete data when a later caller requested a different set of IDs.
- Public Worker lookups are time-bounded, and the Telegram proxy no longer buffers arbitrary bodies.
- Knip no longer executes Redwood/Vite `dev:init` six times per run. Disabling the Vite plugin's config execution and treating the configs as static entries cut the local audit from roughly 7.6 seconds to 2.4–2.9 seconds.

### Dead, deprecated, and stale code

- Deleted two genuinely unused karaoke fixture/clock files (279 lines).
- Registered the audio-worklet processor as a real build entry instead of falsely deleting it.
- Removed the deprecated `pushAudioAtPlaybackClock`/`playbackClock` compatibility path; only test harnesses still supplied it and no production caller used it.
- Removed stale Turso environment variables and wording from Web E2E scripts.
- Made five internally used package/rating declarations private and corrected the karaoke spec's stale 600 ms value to the implemented 2,000 ms.
- Extracted the duplicated public-identity handle resolver shared by the two public Worker modules.
- Removed redundant moderation facade exports.
- Added the three previously unlisted direct dependencies and updated Privy/Self packages.

## Remaining security decisions

### High: bearer access token persists in `localStorage`

`src/lib/api/session-store.ts` stores the complete `StoredSession`, including `accessToken`, under `pirate_session`. Any same-origin XSS can exfiltrate it, and the token persists across browser restarts until expiry or explicit clearing.

Recommended direction: keep the short-lived access token in memory and use a Secure, HttpOnly, SameSite refresh/session cookie on the API origin. This is an auth architecture change, not a mechanical cleanup. Until then, CSP enforcement and removal of HTML/script injection sinks remain critical compensating controls.

### Medium: client redirects are not centralized

The shared external launcher now rejects executable schemes, and the gate helper uses it. Several other direct `window.location.href`/`assign` sites remain. Most consume locally constructed canonical URLs, but future external redirects should go through the validated helper so a server-provided URL cannot silently reintroduce `javascript:` or another executable scheme.

### Low: public Worker bindings are hand-written

`src/worker-public.types.ts` manually defines the secondary Worker's `Env`, while the checked-in generated `worker-configuration.d.ts` covers the primary config. Add a separate generated-types output for `wrangler.public.jsonc` so binding additions cannot drift silently.

## Dependency advisories

`bun audit --prod` reports two advisory families:

1. **Critical, build-tool scope:** `rwsdk -> decompress@4.2.1` can write outside an extraction directory. Repository search shows `decompress` is imported only by `rwsdk/dist/scripts/addon.mjs`, not by the deployed Worker/client graph. Do not run `rw-scripts addon` with untrusted archives. The latest checked `rwsdk@1.5.5` still depends on `decompress~4.2.1`, so upgrading alone does not remove this advisory; upstream needs to replace or harden the extractor.
2. **Moderate, transitive:** the actual vulnerable UUID instance left in the lock is `@metamask/sdk/uuid@8.3.2` through Privy's `x402/wagmi` connector graph. The Self packages now resolve `uuid@11.1.1` and `uuid@13.0.2`, which are outside the vulnerable range even though Bun's path summary still names those parents. Avoid a global UUID major override because MetaMask declares the older API range; resolve through an upstream connector update.

The `brace-expansion` advisory is fixed by the `5.0.6+` override (resolved to `5.0.7`).

## Remaining performance findings

### Blocking entity SEO fetches

`src/worker.tsx` performs API metadata lookup for every community/post/profile/agent request, not only crawlers, and permits up to nine seconds. Post metadata may then perform a second sequential community request. This protects first-response social metadata, but it adds API latency to normal navigation and duplicates data the hydrated client fetches again.

Decide explicitly between:

- crawler/share-only blocking metadata, with generic metadata for ordinary navigation;
- a short edge cache for resolved metadata;
- or embedding the resolved API payload into hydration so the client reuses the server request.

Do not simply remove the lookup: cached generic HTML could regress link unfurls.

### Home-feed request fan-out

`home-routes.tsx` loads the public feed, then profile enrichment, then two commerce requests per distinct community, one access request per live room, and another profile pass for participants. `Promise.all` bounds none of that fan-out. A diverse feed can create dozens of API requests and contention on mobile networks.

Recommended API boundary: return the required author, listing/purchase, and live-room summaries in a batched feed-enrichment response, or add batch endpoints with a small client concurrency cap as an interim step.

### No bundle budget

The route renderer already uses dynamic imports for major authenticated routes, verification modals, video, XMTP, Agora, Story CDR, and wallet sheets. That is good. However, there is no committed bundle-size budget or CI regression check, so heavy SDK movement is invisible. Add a CI-produced Vite manifest/chunk report and enforce budgets on the initial client chunk and the largest lazy chunks. A production build was intentionally not run locally under repository rules.

## Oversized production files

Generated locales and vendored crypto/ABI code are excluded as required by `AGENTS.md`.

| Lines | File | Suggested boundary |
| ---: | --- | --- |
| 1,355 | `src/app/telegram-mini-app/telegram-mini-app-route.tsx` | Split session exchange, verification controller, and route views. |
| 1,300 | `src/app/authenticated-state/create-post-state.tsx` | Split draft persistence, upload orchestration, and submit state. |
| 1,297 | `packages/karaoke-runtime/src/scoring.ts` | Split normalization, scoring math, and state transitions. |
| 1,243 | `src/app/authenticated-routes/moderation-route.tsx` | Split section routing and section-specific controllers. |
| 1,195 | `src/app/authenticated-routes/post-route.tsx` | Split live-room, commerce, media, and thread orchestration. |
| 1,110 | `src/app/authenticated-routes/wallet-settings-route.tsx` | Split balance/price loading, domains, royalties, and send/receive flows. |
| 1,003 | `src/app/authenticated-routes/community-route.tsx` | Split feed enrichment, commerce, and community actions. |
| 962 | `src/app/authenticated-state/post-state.tsx` | Split legacy normalization, comment state, and fetch orchestration. |
| 924 | `src/app/chat/use-chat-controller.tsx` | Split transport lifecycle, conversation state, and UI actions. |
| 907 | `src/app/authenticated-routes/create-post-route.tsx` | Split route shell from draft/upload controllers. |

Large tests/stories also deserve fixture extraction: `post-composer.test.tsx` is 2,227 lines, `live-staging.live.spec.ts` 2,090, `client.test.ts` 1,682, and `post-card.stories.tsx` 1,615.

## Remaining dead-export inventory

After fixes, exact Knip symbol counts are 209 values and 217 types. Compact reporter counts are affected files, not symbols.

| Classification | Values | Types | Action |
| --- | ---: | ---: | --- |
| Safe to unexport | 95 | 153 | Remove `export`; retain internally used declarations. |
| Safe delete candidate | 42 | 6 | Delete after the focused owning-area test. |
| Redundant barrel export | 49 | 11 | Remove facade entry; retain canonical declaration. |
| Test/story surface | 23 | 5 | Clean fixtures deliberately; do not infer production deletion. |
| API facade review | 0 | 42 | Remove Web-local aliases only after current contract consumers typecheck. |
| **Total** | **209** | **217** | |

The 42 API-facade types are concentrated in `src/lib/api/client-api-types.ts` (37) and `src/lib/api/client-groups-community-moderation.ts` (5). Canonical contracts live in `@pirate/api-contracts`; this cleanup should be a dedicated PR because local aliases can conceal contract drift.

Highest-confidence declaration deletes are concentrated in unused post-composer subcomponents/config arrays, wallet-hub helpers, old chat helpers, notification local-state helpers, `useSongPurchase`, and `isPrivyConfigured`. Barrel cleanup is concentrated in `authenticated-routes/index.ts`, `agent-discovery.ts`, `post-presentation.tsx`, page-shell indexes, and the Telegram route facade.

Recommended sequence:

1. Land the security/performance/tooling fixes from this pass.
2. Remove redundant barrels.
3. Apply safe unexports by domain.
4. Delete dead declarations with focused tests.
5. Clean the 42 API facade aliases against pinned current contracts.
6. Split oversized files only along a meaningful ownership boundary, not by arbitrary line count.
