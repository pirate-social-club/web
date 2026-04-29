# Attachment Flow Prototype API Mapping

This Storybook flow is a design/prototype target. It is not production submit wiring yet.

Shared prototype-safe helpers now live outside the story:

- `post-composer-utils.ts`: URL validation, compose-step validity, price normalization, royalty normalization.
- `use-keyboard-bottom-offset.ts`: mobile keyboard offset tracking for the attachment bar.
- `post-composer-attachment-card.tsx`: shared attachment preview/removal card for link, image, video, song, and live.
- `post-composer-attachment-bar.tsx`: shared mobile attachment bar and desktop attachment toolbar.
- `post-composer-config.tsx`: shared attachment action order, labels, and icons.
- `post-composer-song-details-section.tsx`: shared song metadata/artifact section.
- `post-composer-video-details-section.tsx`: shared video poster frame/custom thumbnail section.
- `post-composer-settings-sections.tsx`: shared identity, visibility, paid unlock, license, and royalty sections.
- `post-composer-upload-row.tsx`: shared upload row for song/video detail artifacts.
- `post-composer-upload-utils.ts`: object URL cleanup helpers for UX-facing upload preview values.
- `post-composer-preview.ts`: shared preview-content builder used by the review step.
- `stories/mobile-attachment-flow/use-attachment-flow-state.ts`: shared prototype flow state/navigation for mobile and desktop stories.

## Direct Mappings

- `attachment.kind` maps to `post_type`: `text`, `image`, `video`, `link`, `song`, or later `live`.
- `title` maps to the post title.
- `identity` maps to `identity_mode`: public profile or anonymous.
- `visibility` maps to public vs community/member visibility.
- `access` maps to public vs locked access for video/song.
- `license` maps to the existing asset license preset ids.
- `royaltyPercent` maps to commercial remix revenue share after numeric conversion.
- `link.url` maps to `link_url` and is now locally validated as `http` or `https`.
- `videoDetails.posterFrameSeconds` maps to poster frame extraction timing.
- `videoDetails.thumbnail` maps to a custom poster/thumbnail upload if supported.
- Review price labels use the current `price` state.
- `songDetails.genre`, `songDetails.language`, and `songDetails.lyrics` map to song metadata.
- `songDetails.coverArt`, `songDetails.instrumentalStem`, `songDetails.vocalStem`, and `songDetails.canvasVideo` map to song bundle artifacts.
- `SongDetailsState` and `VideoDetailsState` are UX-facing Storybook/prototype state shapes. Production submit wiring should convert these into the existing submit-facing `SongComposerState` / `VideoComposerState` shapes at the controller or route-state boundary, not inside the presentational sections.

## Intentional UI Simplifications

- Text, link, image, and video all expose one visible body/commentary field.
- Submit wiring should map that field internally:
  - text/link -> `body`
  - image/video -> `caption`
- Free access is implicit. Only paid unlock is shown as an opt-in control for video/song.

## Missing Production Wiring

- Real file upload/media ref creation for image/video/song artifacts.
- Real video frame extraction and poster dimension payloads.
- Real song bundle upload/payload construction from the prototype `songDetails` state.
- Source/remix track selection.
- Anonymous scope selection: community, thread, or post.
- Disclosed qualifier ids.
- Charity selection and revenue share.
- Live event payload shape and scheduling.
- Production validation for URL, price, royalty, required song fields, and required video details.

## Legacy Removal Gate

Do not delete legacy tab composer stories until:

- mobile production composer uses the attachment-first flow,
- desktop production composer uses the same shared step components,
- create-post payload tests cover all supported attachment kinds,
- Storybook has reviewed states for text, link, image, video, song, and live,
- the old tab flow is no longer used by any route or test fixture.
