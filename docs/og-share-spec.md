# Open Graph / share-preview spec

Canonical contract for the meta tags every public pirate.sc surface serves to link
unfurlers (X, Telegram, WhatsApp, iMessage, Slack, Facebook, Discord…). Implemented in
`src/lib/share-metadata.ts` (metadata construction), `src/worker.tsx` (resolution +
timeout), and `src/app/document.tsx` (tag rendering). Pinned by `src/worker-seo.test.tsx`.

## Resolution model

- Entity routes (`post`, `crosspost`, `live-room`, `community`, `public-profile`,
  `public-agent`, `telegram-post`, `telegram-community`) resolve metadata from the public
  API on **every** request. Post subroutes (`/live`, `/replay`, `/karaoke`, `/study`,
  `/streaks`) resolve only for crawler user agents and inherit the parent post's metadata.
- The API lookup has a 9s budget (`SEO_METADATA_TIMEOUT_MS`). On miss/timeout, entity
  pages render **no** social tags and are marked `cache-control: no-store` so the tag-less
  document is never cached. Non-entity routes (home, popular, settings…) always render the
  branded default card (`/og/pirate-share-card.jpg`, 1200×630 JPEG).

## Tag set

Every surface with resolved metadata emits: `og:type`, `og:locale`, `og:title`,
`og:description`, `og:url`, `og:site_name=Pirate`, `og:image` (+ `:url`, `:secure_url`,
`:type`, `:width`, `:height`, `:alt`), `twitter:card`, `twitter:title`,
`twitter:description`, `twitter:image` (+ `:src`, `:alt`), `link rel=canonical`,
`link rel=image_src`. `twitter:card` is `summary_large_image` whenever an image exists.

## Per-surface matrix

| Surface | og:type | og:title | og:description | og:image source (priority) |
|---|---|---|---|---|
| Post — all types | article | post title → link OG title → community context | body/caption → "{media label} · {community context}" → community context → "Post on Pirate" | see per-type below, then: link OG image → community banner → community avatar → default card |
| — text | article | as above | as above | community banner/avatar → default card |
| — image | article | as above | as above | first image media ref |
| — video (incl. livestream anchor `/live`, `/replay`) | article | as above | as above | media `poster_ref` |
| — song (incl. `/karaoke`, `/study`, `/streaks`) | article | as above | as above | image media ref → `song_presentation.cover_art_ref` |
| — link | article | post title → link OG title | as above | `link_og_image_url` (raw, external host) |
| — crosspost | article | as above | as above | own media → community fallback |
| Community `/c/…` | website | `{name} • Pirate` | description → "A community on Pirate" | banner → avatar → default card |
| Profile `/u/…` | profile | `{display name} • Pirate` | bio → created-communities copy | cover → avatar → default card |
| Agent `/a/…` | profile | `{display name} • Pirate Agent` | owner copy | default card |
| Home, popular, non-entity | website | Pirate | brand copy | default card |

"Community context" = `"{community}, a community on Pirate"` (`routes.post.titleInCommunity`).
Untitled posts use it as the title; titled posts carry it in the description instead.

## Image transform allowlist (the 403 trap)

`og:image` sources are rewritten through Cloudflare Image Transformations
(`/cdn-cgi/image/width=1200,height=630,fit=cover,format=jpeg,…/<source>`) **only when the
source host is allowed to be transformed**. The zone config (Cloudflare dashboard →
Images → Transformations → pirate.sc → allowed origins) rejects any other origin with
`ERROR 9401` — a 403 that silently kills the share thumbnail.

`TRANSFORMABLE_IMAGE_SOURCE_HOSTS` in `src/lib/share-metadata.ts` must mirror the zone
config; same-zone (pirate.sc) sources are always transformable. Any source not in the
set is emitted as its **raw URL** — always correct, just not resized/recompressed.

Currently allowlisted: `psc.myfilebase.com` (IPFS media, posters, avatars).
Deliberately not transformed: `api.pirate.sc` (community banners, song cover art — add to
the dashboard allowlist *and* the code constant to enable), external `link_og_image_url`
hosts (arbitrary; can never be allowlisted).

Non-http(s) refs (e.g. `data:` SVG banners) are rejected and fall through to the next
candidate.

## Invariants

1. An `og:image` URL must return `200 image/*` to an anonymous fetch — never emit a
   transform URL for a host outside the allowlist.
2. Entity pages must never serve cacheable tag-less HTML (`no-store` on metadata miss).
3. `robots.txt` must not disallow preview crawlers (Twitterbot, facebookexternalhit,
   TelegramBot, WhatsApp, Slackbot) for `/`, `/p/`, `/c/`, `/u/`, or `/cdn-cgi/image/`.
4. The default card `/og/pirate-share-card.jpg` must exist (1200×630 JPEG).

## Deferred (not in spec yet)

- `og:video` / `og:audio` tags for video/song posts (inline players in some unfurlers).
- `music.song` / `video.other` og:types.
- Dedicated 1200×630 OG renderer for text-only posts (title typeset on brand background).
