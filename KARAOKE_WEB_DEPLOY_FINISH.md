# Finish: karaoke web → staging.pirate.sc (release/karaoke-web)

DONE (committed): clean worktree off origin/main; karaoke files copied (packages/karaoke-runtime,
src/components/compositions/karaoke incl 5.3 scoring, karaoke-route + helpers, community/karaoke-policy,
use-community-karaoke-policy-state); package.json file: dep on @pirate/karaoke-runtime + bun install;
route-definitions.ts + authenticated-routes/index.ts (karaoke-only, wholesale).

REMAINING (all from the dirty web tree at /home/t42/Documents/pirate-workspace/web, vs origin/main):
1. src/app/router.ts (MIXED) — add 3 karaoke hunks ONLY (skip the derivative hunks):
   - AppRoute union: `| { kind: "post-karaoke"; path: string; postId: string }`
   - parse: `if (segments.length === 3 && segments[0] === "p" && segments[2] === "karaoke") { return { kind: "post-karaoke", path: normalized, postId: decode(segments[1]) } }`
   (copy exact decode/segment logic from the dirty tree's router.ts karaoke branch)
2. src/lib/api/client-api-types.ts (MIXED) — add karaoke types ONLY: `KaraokeSessionCreateApiResponse`,
   `SongKaraokePayload` (+ any karaoke-named types they reference). Grep dirty diff for "karaoke".
3. src/lib/api/client-groups-content.ts (MIXED) — add the 2 type imports + `createKaraokeSession` and
   `getPostKaraoke` methods (the karaoke + lines from the dirty diff).
4. (BUTTON, optional for URL testing) src/components/compositions/posts/post-card/post-card-song-content.tsx
   — extract the karaoke "sing" button hunk (24 karaoke lines among 48 non-karaoke; entangled with the
   derivative-video changes — extract carefully). Without it, test via direct URL /p/<postId>/karaoke.
5. `bun run build` (vite) — iterate; the karaoke route pulls karaoke-runtime + 5.3 scoring + worklet.
   Worklet: confirm `new URL('./karaoke-capture-processor.ts', import.meta.url)` bundles (audit F6).
6. Deploy: `wrangler deploy` (web worker) to the STAGING env -> staging.pirate.sc. Verify CORS origin
   = https://staging.pirate.sc already allowed (it is). Then the gateway websocket origin check passes
   (staging ENVIRONMENT allows staging.pirate.sc).
7. Content prereqs for the button to render on post_pst_48c56b44…: community com_cmt_73a670df… must have
   karaoke_enabled + the song must have timed lyrics (forced alignment ran on upload). Verify via authed
   GET /communities/<cid>/posts/<pid>/karaoke.

Backend is already deployed + live on staging (KaraokeSessionRuntimeDO bound; KARAOKE_GATEWAY_SIGNING_KEY set).
