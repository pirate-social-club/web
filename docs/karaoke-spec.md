# Karaoke Product Spec

Last updated: 2026-06-10

## Purpose

Pirate should support a karaoke mode for songs that have:

- an instrumental or karaoke-safe backing track,
- word-level aligned lyrics,
- enough metadata to open a full-screen practice surface.

Karaoke is not a platform speech-recognition offering. Communities should use the same community-scoped STT credential/settings substrate used by assistant voice features. If a community wants voice feedback/scoring, it configures its own speech provider/key/model; lyrics-only karaoke still works without STT.

## Current Implementation Audit

### Added

- `src/components/compositions/karaoke/karaoke-lyric-stage.tsx`
  - Renders classic karaoke: current/cue line plus next line.
  - Overlap rule: the earliest-started active line owns the overlap until it ends; the later overlapping line becomes active only after that.
  - Next preview skips lines whose `startMs` is not after the active line's `endMs`.
  - No scrolling lyric list, no scale transitions, no blur, no text stroke.
  - Cue and active line use the same type size.
  - Cue/current unsung text uses the same foreground color.
  - Only sung fill and completed words use the sung/warning color.
  - Holds the last line after the final lyric.

- `src/components/compositions/karaoke/karaoke-lyric-stage.styles.css`
  - Scoped stage styling.
  - Uses semantic CSS variables.
  - Still contains karaoke-specific `line-height: 1.12`; this should eventually move into a sanctioned `Type` variant or documented text style.

- `src/components/compositions/karaoke/lyric-transform.ts`
  - Converts messy alignment metadata into `KaraokeStageLine[]`.
  - Handles `start_ms`/`end_ms`, `start`/`end`, strings/numbers, line text fallback fields, word text fallback fields, empty text, partial word timing, inverted ranges, and unsorted lines.
  - Keeps no-space token sequences adjacent.

- `src/components/compositions/karaoke/lyric-transform.test.ts`
  - Covers invalid lines, seconds-to-ms coercion, valid-word filtering, whole-line fallback, no-space token spacing, zero-duration words, non-array `words`, duplicate IDs, `start_ms: "0"`, and contraction spacing.

- `src/components/compositions/karaoke/karaoke-lyric-stage.test.ts`
  - Covers mid-line display, gap cue, final-line hold, overlap precedence, single-line input, and empty input.

- `src/components/compositions/karaoke/karaoke-practice-surface.tsx`
  - Presentational full-screen karaoke surface.
  - Takes `currentTimeMs`, `isPlaying`, `lines`, duration, metadata, and callbacks.
  - Does not own audio, mic, ASR, grading, or routing.
  - Uses Pirate primitives: `Button`, `MediaControlButton`, `Scrubber`, `Type`.
  - Supports keyboard controls: Space, ArrowLeft, ArrowRight, Home, End.
  - Keeps the focusable section label stable and announces line changes through a separate `aria-live="polite"` region.
  - Ignores keyboard shortcuts when focus is already on a native control or `role="button"` control.

- `src/components/compositions/karaoke/karaoke-audio-surface.tsx`
  - Owns a hidden `<audio>` element.
  - Drives time from `audio.currentTime * 1000`.
  - Handles play, pause, seek, reset, loading, error, ended.
  - Cleans up on unmount by pausing, removing `src`, calling `load()`, and cancelling rAF.
  - Pauses on `visibilitychange`, and attempts resume when visible if it was previously playing.
  - Registers MediaSession play/pause/seek handlers.
  - Supports `timingOffsetMs` and a drift warning with `onTimingOffsetReset`.
  - Uses audio duration once loaded; lyric duration plus the 1.6s hold padding is only the fallback.

- `src/components/compositions/karaoke/karaoke-scoring.ts`
  - Adds the first pure deterministic scoring core.
  - Defines scorable lyric-line identity (`lineId`, `lineIndex`, `scoredLineIndex`), recognized word shape, line buckets, text score, timing score, line score, and session summary.
  - Buckets recognized words into lyric-line windows using song-relative timestamps and closest expected-word timing.
  - Ports the legacy say-it-back deterministic text scorer strategy: contraction/colloquial normalization, stop-word keyword coverage, approximate ARPABET/phonetic key matching, stem fallback, similar phoneme costs, phonetic availability, and lexical-only renormalization.
  - Adds timing trend (`early`, `late`, `mixed`, `on_time`), no-recognition accounting, and confidence-aware aggregation.

- `src/components/compositions/karaoke/karaoke-scoring.test.ts`
  - Covers colloquial normalization, realistic phonetic near misses, non-Latin renormalization, overlapping lyric windows, assignment locks, repeated chorus identity, early/late/mixed/on-time timing, multi-word STT chunks, score renormalization, no-recognition lines, and session aggregation for coach input.

- `src/components/compositions/karaoke/karaoke-session.ts`
  - Adds the first pure scored-session reducer.
  - Defines session status, scoring policy, session events, and typed effects.
  - Handles disabled policy, start, playback sync, pause, resume, seek, STT partial/final words, line boundary finalization, finish, abort, assignment locks, score emission, and summary emission without React, audio, WebSocket, or Durable Object dependencies.

- `src/components/compositions/karaoke/karaoke-session.test.ts`
  - Covers disabled policy, idle-to-recording, partial/final STT replacement, line-boundary finalization, authoritative playback pause sync, pause/resume without active-line finalization, seek transcript and lock release, late STT for locked lines, abort, final summary, and ignoring events after finalization.

- `src/components/compositions/karaoke/karaoke-transport.ts`
  - Defines versioned client, streaming-STT, and server event envelopes with session, attempt, and sequence identity.
  - Keeps timestamped PCM chunks and song-relative playback events at the transport boundary without implementing WebSocket or provider IO.
  - Requires full stable line identity on client line-boundary events.

- `src/components/compositions/karaoke/karaoke-session-test-harness.ts`
  - Adds a test-only in-process transport runner that validates envelope identity, feeds client and fake STT events through the reducer, retains typed effects, and translates score/summary/error output into server events.

- `src/components/compositions/karaoke/karaoke-session-test-harness.test.ts`
  - Walks a full three-line take with a repeated chorus, partial-to-final STT replacement, pause/resume, seek and re-score, line-score output, and final summary.

- `src/components/compositions/karaoke/karaoke-session-host.ts`
  - Defines the portable async session host used by a future Durable Object, plus `KaraokeEffectRunner` and `KaraokeStreamingSttAdapter` boundaries.
  - Separates JSON client events from binary PCM frames, validates monotonic client/STT sequences, reports transport errors without throwing, and applies reducer effects in order.
  - Treats STT `deliveredAtAudioMs` as telemetry only; playback and line-boundary events remain authoritative for reducer song time.
  - Aborts with `stt_adapter_start_failed` when provider startup fails, relays accepted STT only after successful reduction, and publishes `close_stt_stream` before closing the adapter.
  - Includes fake effect-runner and STT-adapter implementations for deterministic tests; it does not add a Worker route, provider call, WebSocket, or Durable Object binding.

- Storybook coverage
  - `KaraokeLyricStage`: classic visual, real-ish fixture, bad metadata, mobile, compact line gap.
  - `KaraokePracticeSurface`: visual, loading, empty, bad metadata, long line, mobile.
  - `KaraokeAudioSurface`: generated WAV real-audio, ended, drift, loading, error.

- Song capability contract
  - `SongContentSpec.karaoke?: { canKaraoke: boolean; status: "unavailable" | "processing" | "ready" | "failed" }`
  - `deriveSongUI` computes `showKaraoke`.
  - Song offer rows render a Karaoke action only when capability is ready, an action callback exists, and the age gate does not require proof.
  - Song owners can see passive `processing`, `failed`, or `unavailable` karaoke status rows; normal viewers do not see disabled karaoke controls.

- `src/app/authenticated-routes/karaoke-route.tsx`
  - Adds a lyrics-only `/p/:postId/karaoke` route.
  - Loads the future dedicated karaoke payload endpoint first.
  - Falls back to rich `song_presentation` metadata when timed lyrics and an instrumental are already present.
  - Renders `KaraokeAudioSurface` and exits back to the source post.

### Verification So Far

- `rtk bun test src/components/compositions/karaoke/lyric-transform.test.ts` passes.
- `rtk bun test src/components/compositions/karaoke/karaoke-lyric-stage.test.ts` passes.
- `rtk bun test src/components/compositions/karaoke/karaoke-practice-surface.test.ts` passes.
- `rtk bun test src/components/compositions/karaoke/karaoke-scoring.test.ts` passes (12 tests).
- `rtk bun test src/components/compositions/karaoke/karaoke-session.test.ts src/components/compositions/karaoke/karaoke-scoring.test.ts` passes.
- `rtk bun test src/components/compositions/karaoke/karaoke-session.test.ts src/components/compositions/karaoke/karaoke-session-test-harness.test.ts src/components/compositions/karaoke/karaoke-scoring.test.ts` passes.
- `rtk bun test src/components/compositions/karaoke/karaoke-session-host.test.ts src/components/compositions/karaoke/karaoke-session.test.ts src/components/compositions/karaoke/karaoke-session-test-harness.test.ts src/components/compositions/karaoke/karaoke-scoring.test.ts` passes (33 tests).
- `rtk bun test src/components/compositions/karaoke/karaoke-scoring.test.ts src/components/compositions/karaoke/lyric-transform.test.ts src/components/compositions/karaoke/karaoke-lyric-stage.test.ts src/components/compositions/karaoke/karaoke-timing.test.ts` passes.
- `rtk bun test src/app/authenticated-routes/karaoke-route.test.ts src/app/authenticated-routes/karaoke-route-page.test.tsx src/app/authenticated-helpers/post-media-presentation.test.ts src/app/authenticated-helpers/post-presentation.test.ts src/components/compositions/posts/post-card/post-card-song-content.test.ts src/components/compositions/karaoke/karaoke-audio-surface.test.tsx src/components/compositions/karaoke/karaoke-timing.test.ts src/components/compositions/karaoke/lyric-transform.test.ts src/components/compositions/karaoke/karaoke-lyric-stage.test.ts src/components/compositions/karaoke/karaoke-practice-surface.test.ts` passes.
- `rtk bun test src/app/router.test.ts src/app/route-manifest.test.ts src/components/compositions/posts/post-card/post-card-song-content.test.ts ...` passes for the route/card slice.
- `rtk bun run ui:audit` passes.
- `rtk bun run types:safe` is currently blocked by unrelated existing errors in `src/app/authenticated-state/use-domains-tab.ts` where `paidQuote` is possibly `null`.
- Worker-proxied song artifact CORS is covered by `services/api/tests/routes/song-artifacts/song-artifact-routes.test.ts`: allowlisted full reads, allowlisted Range reads, OPTIONS preflight for future authorized media requests, exposed media headers, and disallowed origins are asserted. `services/api/tests/verification-endpoints-config.test.ts` pins staging and production web origins. Live curls are still useful for final deploy confidence and for any raw direct R2/Filebase URL class that appears in production data.
- Earlier lyric/surface visual verification was done while Storybook was already running. The current audio/story changes still need visual verification when Storybook is already running or explicitly started.

## Product Model

### Song Feed/Card Contract

Feed cards should carry only the capability flag:

```ts
type SongKaraokeStatus = "unavailable" | "processing" | "ready" | "failed";

interface SongKaraokeCapability {
  canKaraoke: boolean;
  status: SongKaraokeStatus;
}
```

This avoids shipping alignment JSON or instrumental URLs in the feed.

`ready` means the song has a completed alignment, playable instrumental metadata, and either inline timed lyrics or a `timed_lyrics_ref` that the backend karaoke payload endpoint can resolve. The `Sing` entry point is additionally gated by the community preview field `karaoke_enabled`. Communities default to `false`; enabling karaoke for rollout is an operator-controlled local-community DB update until a moderation UI exists. The backend payload endpoint also checks the same flag so direct karaoke URLs remain closed for communities that have not opted in.

Owners may see passive `processing`, `failed`, or `unavailable` status on their own songs. Normal viewers should not see disabled karaoke buttons for unavailable songs.

Owner-facing unavailable copy should distinguish:

- `timed_lyrics_ref` present but not yet dereferenceable by the route: `Lyrics not loadable yet`.
- No usable timed lyrics payload or ref: `Lyrics not available`.

### On-Demand Karaoke Payload

The route/modal fetches the full payload only after the user opens karaoke:

```ts
interface SongKaraokePayload {
  id: string; // song artifact bundle id
  object: "song_karaoke_payload";
  song?: string | null;
  post?: string | null;
  community?: string | null;
  title?: string | null;
  artist_name?: string | null;
  artwork_src?: string | null;
  instrumental_audio_url?: string | null;
  karaoke_lines?: Array<{
    id: string;
    index: number;
    kind: "section" | "lyric";
    text: string;
    start_ms: number;
    end_ms: number;
    words: Array<{
      text: string;
      start_ms: number;
      end_ms: number;
      confidence?: number | null;
    }>;
  }> | null;
  raw_lines?: RawKaraokeLine[] | null;
}
```

`karaoke_lines` is the canonical render contract. The backend groups forced-alignment token streams into submitted lyric-line boundaries before returning the karaoke payload. Bracketed structure markers such as `[Intro]` and `[Verse 1]` are returned as `kind: "section"` so the UI can render them as dividers without treating them as sung/scored lines. `raw_lines` remains in the response for compatibility and diagnostics, but new frontend code should prefer `karaoke_lines`.

`durationMs` should be derived from either the audio element or the normalized lyric timeline. Avoid storing a separate declared karaoke duration unless the backend has a strong reason; separate declared duration can drift from the actual audio and alignment data.

Runtime rule: the audio element duration always wins once metadata is loaded. The lyric-derived duration is only a pre-load fallback and includes the final-line hold padding.

Audio URL rule: the frontend may play HTTP(S) URLs or API-relative paths. Decentralized refs such as `ipfs://` or `filebase://` must be converted to a browser-playable gateway URL before they reach `<audio>`. The karaoke audio element should use `crossorigin="anonymous"` so future Web Audio pitch/onset analysis can attach without changing the load contract.

Raw-line normalization rule: both the API endpoint and the frontend fallback unwrap `raw_lines`, `lines`, `lyrics`, and legacy karaoke containers, then reject wrapper-only arrays. Until this is moved into a shared contract helper, route tests on both sides must keep the same fixture shapes in parity.

Exit flow rule: while playback is active, in-surface exit and Pirate SPA navigation require confirmation through the router navigation guard. The surface also registers `beforeunload` and `popstate` handlers while active: tab close / hard navigation receives the browser unload warning, and browser back prompts then calls `history.forward()` when the user cancels. Browser behavior varies by platform, so browser-level interception is best-effort even though in-app router navigation is blocked before URL mutation.

Release rule: every instrumental source must return CORS headers for normal media requests and Range requests. If a future entitled-stream path adds non-simple request headers, the route must also answer OPTIONS preflight:

- `/public-communities/.../content` from the API,
- decentralized gateway URLs such as `https://dweb.link/ipfs/...`,
- direct R2 URLs if used.

If any source returns audio bytes without `Access-Control-Allow-Origin`, the browser can reject the anonymous media request and the route will show audio unavailable.

### Lyric Display Rules

The stage uses deterministic overlap handling:

- Active line selection is first-match-wins after normalized line sort.
- If two lines start at the same millisecond, input order is the tie-break.
- The next preview is the first line whose `startMs > activeLine.endMs`.
- Overlapping backing/harmony lines are not previewed early; they become active after the earlier active line ends.

This is acceptable for the current pop-lyric MVP. If we later need overlap-heavy arrangements, the rule can relax to preview the first non-active line whose `startMs > currentTimeMs`.

Accessibility note: the stage exposes line changes through an `aria-live="polite"` region, not per-token announcements. For dense lyrics under roughly 1.5 seconds per line, screen readers may queue/drop intermediate announcements. That is acceptable for MVP but should be revisited if karaoke accessibility becomes a first-class scoring target.

## STT / ASR Policy

### Principle

Karaoke voice feedback should reuse community-scoped STT provider/model/key settings. It should not introduce a separate Pirate-wide ASR service that communities get implicitly.

The storage unit should be decoupled from the assistant policy page:

```ts
interface CommunitySttSettings {
  provider: AssistantSttProvider;
  model: string;
  credentialId?: string;
}
```

The assistant policy and karaoke scoring both consume `CommunitySttSettings`. Karaoke scoring must not require the assistant itself to be enabled.

Recommended product split:

- Share the credential store across assistant voice and karaoke scoring.
- Keep assistant STT policy and karaoke STT policy separate.
- Do not add a karaoke moderation tab for the lyrics-only release; no STT config is needed yet.
- Add a dedicated karaoke moderation tab when scoring lands. That tab should own karaoke STT provider/model selection, scored-take defaults, consent copy, and retention policy.
- Do not put karaoke policy inside the assistant tab. It is the wrong conceptual home and will crowd the assistant page.

Current assistant policy shape:

```ts
type AssistantSttProvider = "elevenlabs" | "mistral" | "openai" | "none";

type CommunityAssistantPolicySettings = {
  voiceMode: AssistantVoiceMode;
  sttProvider: AssistantSttProvider;
  sttModel: string;
  ttsProvider: AssistantTtsProvider;
  ttsVoice: string;
}
```

Current default:

```ts
sttProvider: "elevenlabs";
sttModel: "scribe_v2";
```

This is too ElevenLabs-specific for karaoke. The assistant policy state currently coerces voice-enabled STT back to ElevenLabs/Scribe unless the model is a non-legacy ElevenLabs model. That needs to be generalized before karaoke voice scoring ships, and the generalized credential/settings object should be shared by assistant voice and karaoke.

Do not silently migrate existing communities. Existing assistant STT settings stay on the assistant. Karaoke scoring starts as off/unconfigured until a community admin opens the karaoke moderation tab and selects a karaoke provider/model.

### Proposed Provider Extension

Add DeepInfra as an assistant STT provider:

```ts
type AssistantSttProvider =
  | "deepinfra"
  | "elevenlabs"
  | "mistral"
  | "openai"
  | "none";
```

Add a DeepInfra credential type alongside existing assistant credentials:

```ts
type ApiCommunityAssistantCredentialProvider =
  | "deepinfra"
  | "elevenlabs"
  | "openrouter";
```

Recommended new STT default for communities that enable voice and provide a DeepInfra key:

```ts
sttProvider: "deepinfra";
sttModel: "nvidia/Nemotron-3.5-ASR-Streaming-Multilingual-0.6b";
```

Do not silently migrate existing communities from ElevenLabs to DeepInfra. Existing explicit settings should stay explicit.

Provider routing should be language-aware. If Nemotron wins the singing evaluation, use it for supported song languages and fall back to Scribe for languages outside Nemotron's supported set when the community has both credentials configured.

### Why Nemotron 3.5 Is Attractive

Based on the model card and the user-provided DeepInfra API docs:

- 0.6B-parameter model.
- Cache-aware FastConformer-RNNT.
- Built for low-latency streaming.
- Multilingual across roughly 40 language-locales.
- Native punctuation/capitalization.
- Word labels are available through the DeepInfra response shape when requested with `chunk_level=word`.
- The quoted DeepInfra price in the user-provided page is very low per minute.

The NVIDIA model card states this is a multilingual streaming ASR model, commercially usable under OpenMDW-1.1, with configurable chunk sizes including low-latency settings. It also notes that the English-only Nemotron ASR may still be preferable for English-only transcription use cases.

### Why Not Default Blindly

We should not treat this as settled until we test singing.

Most ASR benchmarks are speech benchmarks. Karaoke input has:

- pitched singing,
- elongated vowels,
- missing consonants,
- instrumental bleed,
- reverb/room noise,
- users singing over backing tracks,
- lyrics already known in advance.

Nemotron is likely a strong candidate for default STT, but the default should be gated on a small Pirate karaoke evaluation set. Do not build architecture that assumes Nemotron gives reliable sub-100ms sung-word boundaries until that is measured:

- 5-10 English songs,
- 2-3 non-English songs if multilingual karaoke matters,
- clean mic singing,
- laptop-speaker bleed,
- phone-speaker bleed,
- low and high vocal ranges,
- chorus repeats.

Compare:

- DeepInfra Nemotron 3.5 ASR,
- ElevenLabs Scribe v2,
- current assistant fallback providers if implemented.

Evaluation metric should not be raw WER only. For karaoke, measure:

- expected-word hit rate within the active line window,
- onset timing delta where words are returned,
- false positives during instrumental gaps,
- stability of interim/final results,
- latency to usable feedback.

## Streaming Scoring Model

### Recommendation

Use streaming transport with line-boundary finalization:

1. Browser captures mic audio continuously with `AudioWorklet`.
2. Browser sends timestamped PCM chunks over a scored karaoke WebSocket.
3. A Durable Object owns one scored karaoke session.
4. The Durable Object forwards audio to the configured streaming STT provider.
5. Streaming STT emits partial/final recognized words.
6. The session maps recognized words into song-relative lyric line windows.
7. Each line is finalized after `line.endMs + graceMs` once ASR has emitted enough final evidence, or after a timeout.
8. Deterministic line scores drive feedback events, session aggregate, final coach copy, and optional final TTS.

Streaming transport is the correct product architecture. Per-line finalization is not a fallback; it is how streaming ASR becomes stable enough for karaoke scoring.

### Why Not Score Every Partial

Streaming ASR partials revise as more audio arrives. If the product treats every interim transcript as authoritative, line scores will flicker. The UI may show lightweight live feedback from partials, but numeric grades should be emitted only after a line is finalized.

### Session Event Flow

Client to server:

```ts
type KaraokeClientEvent =
  KaraokeTransportEnvelope & (
  | {
      type: "start";
      postId: string;
      startedAtAudioMs: number;
    }
  | {
      type: "playback_sync";
      audioTimeMs: number;
      playing: boolean;
    }
  | { type: "pause"; audioTimeMs: number }
  | { type: "resume"; audioTimeMs: number }
  | { type: "seek"; audioTimeMs: number }
  | ({ type: "line_boundary"; audioTimeMs: number } & KaraokeLineIdentity)
  | { type: "finish"; audioTimeMs: number }
  | { type: "abort"; code: string }
);

type KaraokeClientBinaryFrame = KaraokeTransportEnvelope & {
  type: "audio_chunk";
  chunkId: number;
  pcm16: ArrayBuffer;
  sampleRate: 16000;
  songStartMs: number;
  songEndMs: number;
};

type KaraokeStreamingSttEvent = KaraokeTransportEnvelope & (
  | { type: "stt_partial"; deliveredAtAudioMs: number; text: string; words: RecognizedWord[] }
  | { type: "stt_final"; deliveredAtAudioMs: number; text: string; words: RecognizedWord[] }
);
```

Server to client:

```ts
type KaraokeServerEvent =
  KaraokeTransportEnvelope & (
  | { type: "stt_partial"; text: string; words: RecognizedWord[] }
  | { type: "stt_final"; text: string; words: RecognizedWord[] }
  | { type: "line_score"; result: KaraokeLineScore }
  | { type: "summary"; summary: KaraokeSessionSummary }
  | { type: "session_error"; code: string }
);
```

Every envelope carries `protocolVersion`, `sessionId`, `attemptId`, and a source-monotonic `sequence`. JSON control events and binary PCM frames use separate types. All audio chunks carry song-relative time. Server receive time must not be used for scoring because pause, resume, seek, network jitter, and provider buffering all make receive time unreliable. `deliveredAtAudioMs` on STT events is telemetry only; reducer time advances through playback events.

Binary PCM WebSocket messages use wire format v1. Session and attempt identity come from the authenticated, attempt-tagged WebSocket and are not repeated in every frame. The fixed header is 28 bytes:

| Offset | Bytes | Field | Encoding |
| --- | ---: | --- | --- |
| 0 | 4 | magic | ASCII `KARA` |
| 4 | 1 | binary protocol version | unsigned, must be `1` |
| 5 | 1 | flags | unsigned, must be `0` in v1 |
| 6 | 2 | header length | big-endian unsigned, must be `28` |
| 8 | 4 | sequence | big-endian uint32; shared with JSON client events |
| 12 | 4 | chunk ID | big-endian uint32; must be at least `1` |
| 16 | 4 | sample rate | big-endian uint32; must be `16000` |
| 20 | 4 | song start milliseconds | big-endian uint32 |
| 24 | 4 | song end milliseconds | big-endian uint32, at least start |
| 28 | remaining | PCM payload | little-endian signed 16-bit mono samples |

`KARAOKE_MAX_BINARY_FRAME_BYTES` is `200000`. The decoder rejects oversized frames before inspecting or copying the payload. Structural failures use typed `binary_*` transport errors. Frames are forwarded to STT only while the session status is `recording`; idle, paused, finalized, and aborted sessions return `session_not_recording` without consuming the client sequence.

### Line Identity

The karaoke payload already provides stable line identity:

```ts
type SongKaraokeLine = {
  id: string;
  index: number;
  kind: "section" | "lyric";
  text: string;
  start_ms: number;
  end_ms: number;
  words: Array<{
    text: string;
    start_ms: number;
    end_ms: number;
    confidence?: number | null;
  }>;
};
```

Scoring derives scorable lines from lyric lines only:

```ts
type ScorableKaraokeLine = {
  lineId: string;
  lineIndex: number;       // index from full karaoke_lines payload
  scoredLineIndex: number; // index among kind === "lyric" lines only
  text: string;
  startMs: number;
  endMs: number;
  words: Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>;
};
```

Every scored-session event that references a lyric line must include:

```ts
{
  sessionId: string;
  attemptId: string;
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
}
```

Do not identify lines by text. Repeated choruses may have identical text and different timing windows.

### Line Bucketizer

The line bucketizer is a required layer between streaming STT and the scorer:

```txt
recognized words with song-relative timestamps
→ line bucketizer
→ per-line transcript candidates
→ deterministic fuzzy scorer
→ finalized line scores
```

Input:

```ts
type RecognizedWord = {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  final: boolean;
  source?: "stt" | "reference" | "manual";
};
```

Output:

```ts
type KaraokeLineBucket = {
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
  expectedLine: ScorableKaraokeLine;
  windowStartMs: number;
  windowEndMs: number;
  recognizedWords: RecognizedWord[];
  transcript: string;
  confidenceMean: number | null;
  finalizedReason:
    | "line_end"
    | "asr_final"
    | "timeout"
    | "seek"
    | "session_end";
};
```

Initial bucket window:

```txt
windowStartMs = line.startMs - 300ms
windowEndMs = line.endMs + 800ms
```

Words inside overlapping windows should prefer the line whose expected word timing is closest, not merely the first window that contains the recognized word. This matters for late singing, ad-libs, and repeated chorus transitions.

### Playback Events

The scored session layer must intercept play, pause, resume, and seek events from the audio surface.

- On play/resume: start or resume mic chunking and emit playback sync.
- On pause: pause chunk sending or mark silence; do not permanently finalize the active line unless a timeout expires.
- On seek: abandon pending ASR regions that belong to the old time range, reset the active line window, and notify the session Durable Object.
- On finish: close the STT stream, finalize remaining line buckets, compute the session summary, and optionally generate coach/TTS output.

MVP does not include pitch scoring. Pitch becomes available only if the karaoke payload includes a target contour generated from a vocal stem:

```ts
type KaraokePitchPoint = {
  timeMs: number;
  frequencyHz: number;
  confidence?: number;
};
```

## Backend Architecture

### Frontend

- `KaraokeAudioSurface` controls instrumental playback.
- New route/modal fetches karaoke payload.
- New scored-session layer wraps the existing audio surface.
- New mic/session hook captures user audio with `AudioWorklet`.
- Mic audio remains local until user starts a scored session.
- `KaraokeLyricStage` remains a pure `(lines, currentTimeMs) -> JSX` renderer and does not know about mic, STT, scoring, or TTS.

### API

Add karaoke-specific endpoints:

```txt
GET  /communities/:communityId/posts/:postId/karaoke
POST /communities/:communityId/posts/:postId/karaoke/sessions
GET  /communities/:communityId/posts/:postId/karaoke/sessions/:sessionId/stream
POST /communities/:communityId/posts/:postId/karaoke/sessions/:sessionId/finish
```

Payload endpoint returns song metadata, signed/access-controlled instrumental URL, canonical `karaoke_lines`, and diagnostic `raw_lines`.

Session create endpoint returns a short-lived authenticated WebSocket URL or session token. The WebSocket upgrade must validate either the user's normal auth context or the short-lived session token before accepting the connection.

```ts
type KaraokeSessionCreateResponse = {
  object: "karaoke_session";
  sessionId: string;
  attemptId: string;
  streamUrl: string;
  expiresAt: string;
  scoringPolicy: {
    scoringEnabled: boolean;
    voiceCoachEnabled: boolean;
    rawAudioRetention: "not_stored";
    headphonesRecommended: true;
  };
}
```

The stream endpoint upgrades to a WebSocket and routes to a Durable Object identified by the session id.

```ts
type KaraokeSessionDurableObjectName =
  `karaoke:${string}:${string}:${string}:${string}`;
```

### Cloudflare

Use Cloudflare for app/session orchestration, not for subsidized ASR:

- R2: instrumental assets and alignment JSON.
- D1/API DB: karaoke capability/status and session metadata.
- Workers: payload fetch, session creation, policy/auth checks, WebSocket upgrade.
- Durable Objects: active realtime karaoke sessions, WebSocket coordination, streaming STT adapter state, line bucket state, rate/cost caps, session summary.
- AI Gateway only if audio request/response body capture is disabled for the STT route. Ephemeral audio and body-logged AI Gateway traffic are incompatible.

Provider API keys are community-scoped STT credentials shared by assistant voice and karaoke.

## Provider Adapter Interfaces

The current assistant transcription path is batch HTTP. Karaoke scored sessions need a streaming adapter. Keep batch and streaming interfaces separate, but normalize output to shared word/event types.

### Streaming STT

```ts
interface StreamingSttAdapter {
  start(input: StreamingSttSessionInput): Promise<StreamingSttSession>;
}

interface StreamingSttSessionInput {
  communityId: string;
  provider: string;
  model: string;
  language?: string;
  sampleRate: 16000;
  channels: 1;
  initialPrompt?: ""; // expected lyrics must not be sent as prompt
}

interface StreamingSttSession {
  sendAudio(chunk: PcmAudioChunk): Promise<void>;
  close(): Promise<void>;
  onEvent(callback: (event: StreamingSttEvent) => void): void;
}

type PcmAudioChunk = {
  chunkId: number;
  pcm16: ArrayBuffer;
  sampleRate: 16000;
  songStartMs: number;
  songEndMs: number;
};

type StreamingSttEvent =
  | { type: "partial"; text: string; words?: RecognizedWord[] }
  | { type: "final"; text: string; words: RecognizedWord[] }
  | { type: "error"; code: string; message: string };
```

Each provider has its own wire protocol. ElevenLabs streaming Scribe, Deepgram live, AssemblyAI, Soniox, and DeepInfra/Nemotron streaming-capable deployments should be adapter implementations, not scorer dependencies.

### Batch Fallback

Batch transcription remains useful for assistant voice and offline evaluation, but it is not the primary karaoke scoring transport.

```ts
interface BatchSttTranscriptionInput {
  audio: File | Blob;
  language?: string;
  initialPrompt?: "";
  chunkLevel?: "segment" | "word";
  chunkLengthS?: number;
}

interface BatchSttTranscriptionOutput {
  provider: string;
  model: string;
  text: string;
  language?: string;
  words?: Array<{ text: string; start: number; end: number; confidence?: number }>;
  segments?: Array<{ text: string; start: number; end: number; confidence?: number }>;
  raw?: unknown;
}
```

DeepInfra/Nemotron HTTP request shape discussed in product:

- multipart audio upload,
- `task=transcribe`,
- `language` when known,
- `chunk_level=word`,
- short `chunk_length_s` for line/phrase chunks.

That endpoint is request/response. It can be useful for fallback/evaluation, but it is not equivalent to a full-duplex browser-to-provider streaming session.

Hard rule for karaoke scoring: `initialPrompt` must be empty or domain-only. It must not contain expected lyric text. Whisper-family and prompt-conditioned ASR models can parrot the prompt and create fake perfect scores.

Do not store or document example bearer tokens.

## Deterministic Scoring Core

Do not use an LLM to grade numeric line scores. The LLM may write coaching copy only after deterministic scoring completes.

Port the legacy `say-it-back` scoring strategy into a pure karaoke scoring library:

```txt
expected line + bucketed recognized words
→ text normalization
→ lexical score
→ phonetic score when available
→ timing score when word timestamps are reliable
→ confidence score when provider confidence exists
→ line score
```

Required pure functions:

```ts
function bucketRecognizedWordsIntoLines(input: {
  lines: ScorableKaraokeLine[];
  words: RecognizedWord[];
  nowMs: number;
}): KaraokeLineBucket[];

function scoreKaraokeLineText(input: {
  expected: string;
  transcript: string;
  recognizedWords: RecognizedWord[];
}): KaraokeTextScore;

function scoreKaraokeLineTiming(input: {
  expectedLine: ScorableKaraokeLine;
  recognizedWords: RecognizedWord[];
}): KaraokeTimingScore | null;

function aggregateKaraokeSession(input: {
  lineScores: KaraokeLineScore[];
}): KaraokeSessionSummary;
```

Text score output:

```ts
type KaraokeTextScore = {
  score: number; // 0..1 continuous
  wer: number;
  keywordCoverage: number;
  phoneticQuality: number;
  phoneticCoverage: number;
  phoneticAvailable: boolean;
  confidenceMean: number | null;
};
```

Line score output:

```ts
type KaraokeLineScore = {
  lineId: string;
  lineIndex: number;
  scoredLineIndex: number;
  transcript: string;
  recognizedWords: RecognizedWord[];
  textScore: KaraokeTextScore;
  timingScore: number | null;
  confidenceScore: number | null;
  score: number; // 0..1 continuous
  finalizedReason: KaraokeLineBucket["finalizedReason"];
};
```

Initial line score formula:

```txt
availableScores = [
  textScore.score * 0.75,
  timingScore * 0.20 if available,
  confidenceScore * 0.05 if available
]

score = sum(availableScores) / sum(availableWeights)
```

Renormalize when timing or confidence is unavailable. Do not punish non-Latin or provider-limited cases by leaving unavailable dimensions as zero.

### Legacy Say-It-Back Rules To Preserve

The old `say-it-back` scorer was deterministic and should be ported as the first text-scoring implementation. Preserve:

- Contraction and colloquial normalization: `I'm`, `I'll`, `we're`, `ima`, `imma`, `tryna`, `cuz/coz`, `ya`, `y'all`, `gonna`, `wanna`, `gotta`, `kinda`, and related variants.
- Dropped final-g repair: `drinkin'` -> `drinking`.
- Stop-word filtering for keyword coverage.
- Stem-based CMU/ARPABET fallback.
- Approximate ARPABET generation.
- Similar phoneme substitution costs such as `P/B`, `T/D`, `K/G`, `F/V`, `S/Z`, `L/R`.
- Hybrid per-word similarity blend: phoneme similarity, phonetic-key similarity, and raw string similarity.
- Raw-similarity floor so pure phonetic matches do not over-credit short sound-alikes.
- `phoneticAvailable` flag and lexical-only renormalization. Legacy score used denominator `1.0` with phonetics and `0.65` without phonetics; preserve the behavior conceptually so non-Latin lines are not capped at 0.65.

Do not use the legacy pass/fail threshold as the primary karaoke result. Legacy used `expectedTokens.length <= 3 ? 0.75 : 0.8`. Karaoke should return continuous line/session scores and use thresholds only for display intensity or grade bands.

### Non-Latin Lines

Phonetic scoring is line-level:

```ts
phoneticAvailable: false
```

for lines where the Latin/ARPABET path cannot operate. Lexical scoring and confidence/timing scoring may still apply. Future language-specific phonetic modules can be added without changing the line score contract.

### Confidence

Provider word confidence is first-class in karaoke even though the legacy scorer ignored it. Background music, breath noise, and reference-vocal bleed make confidence useful.

- Compute `confidenceMean` per line bucket.
- Downweight weak recognized words softly; do not hard-drop them unless confidence is extremely low.
- Include `confidenceMean` and low-confidence line counts in the final coach input so the LLM can hedge.

### Final Coach And TTS

The final numeric score is deterministic. The LLM receives structured metrics and writes short coaching copy:

```ts
type KaraokeCoachInput = {
  finalScore: number;
  lyricsScore: number;
  timingScore: number | null;
  confidenceMean: number | null;
  phoneticUnavailableLineCount: number;
  lowConfidenceLineCount: number;
  noRecognitionLineCount: number;
  timingTrend: "early" | "late" | "mixed" | "on_time";
  strongestLines: KaraokeLineScore[];
  weakestLines: KaraokeLineScore[];
  missedWords: string[];
};
```

TTS may read the final coach after the song. Do not play TTS during the song.

## UX Spec

### Entry Point

Song card/player shows Karaoke only if:

```ts
content.karaoke?.canKaraoke === true
&& content.karaoke.status === "ready"
&& !ageGateRequiresProof
```

Do not render a disabled Karaoke button for normal users when unavailable. Admin/owner tooling can show processing/failed state elsewhere.

Owners should see a passive processing/failed notice on their own songs so a queued alignment job does not look like a silent product failure.

### Karaoke Surface

Default flow:

1. Open karaoke route/modal.
2. Fetch payload.
3. Load instrumental.
4. Show first lyric cue immediately.
5. User presses Play.
6. Instrumental starts; lyric clock follows audio.
7. If scoring is enabled, user explicitly starts a scored take.
8. Request mic permission from that user gesture.
9. Open the scored-session WebSocket and start streaming timestamped mic chunks.
10. Finalize deterministic line scores at lyric line boundaries.
11. End screen appears after audio ends, final line has been held, remaining buckets are finalized, and the session summary is returned.

### Lyrics Display

- Pre-start cue line: active size and active color, no fill.
- Active line: same base color; sung fill overlays current token.
- Completed words: sung color.
- Next line: smaller and muted.
- During gaps: show upcoming cue in current slot.
- Last line: hold complete line after end.

### Feedback

Immediate:

- input level,
- early/late local onset indicator.

Post-line:

- lyric accuracy,
- missed/substituted words,
- timing deltas if word timestamps are reliable.
- lightweight positive/negative visual feedback, such as bottom-up emoji/reaction bursts, driven by deterministic `line_score` or `feedback` events.

Final:

- line-by-line score,
- overall score,
- strongest/weakest lines,
- AI-written coach summary from deterministic metrics,
- optional TTS reading of the final coach,
- optional retry.

### Mic Capture

Use `AudioWorklet` from the first scoring milestone. Do not build scored karaoke on `MediaRecorder`: recorder start/stop boundaries can drop audio, encoder warm-up adds latency, and it does not map cleanly to streaming STT.

For v1 scored takes, require or strongly recommend headphones. The hardest scoring problem is not line matching; it is mic bleed from the instrumental. Browser echo cancellation is not a reliable substitute for headphones.

Recommended scored-take constraints when the user is using headphones:

```ts
audio: {
  echoCancellation: false,
  autoGainControl: false,
  noiseSuppression: false,
}
```

These settings preserve sustained vocals better than browser speech defaults.

If a later speaker-mode experiment is allowed, it should be an explicit fallback with different constraints:

```ts
audio: {
  echoCancellation: true,
  autoGainControl: false,
  noiseSuppression: true,
}
```

Speaker mode should be treated as lower-confidence scoring unless we add server-side echo/reference suppression using the instrumental as a reference track.

### Consent And Retention

Required before line scoring ships:

- Show explicit mic/audio processing consent before a scored take.
- Explain that vocal audio is streamed through Pirate's scored-session Worker/Durable Object to the community-selected STT provider.
- Explain that the user should use headphones for reliable scoring.
- Discard streamed audio chunks as soon as the STT/scoring window no longer needs them.
- Store scores and matched-token metadata only by default.
- Store recordings only if the user explicitly chooses to save/share a take.
- Do not route STT audio through systems that capture request bodies unless body capture is disabled.

## Open Decisions

1. Provider credential support.
   - Need to add `deepinfra` to assistant credentials if Nemotron becomes default.

2. Default STT provider.
   - Recommendation: make DeepInfra/Nemotron the preferred new default only after singing evaluation passes.
   - Keep ElevenLabs Scribe as supported fallback.

3. Streaming provider for first scored implementation.
   - Recommendation: implement one streaming provider first, behind the provider-neutral adapter.
   - Batch HTTP STT can remain for assistant voice and offline evaluation, but it should not define the scored karaoke architecture.

4. Is word-level ASR required for scored karaoke?
   - Recommendation: yes for lyric/timing scoring.
   - If a provider returns only segment-level text, show text-only/low-confidence feedback and omit timing score.

5. Target pitch source.
   - Recommendation: drop pitch scoring from MVP unless the payload includes a generated target pitch contour.

6. Speaker-mode scoring.
   - Recommendation: headphones required/recommended for v1.
   - Speaker mode needs explicit lower-confidence UI or future echo/reference suppression.

## Remaining Implementation Plan

### Milestone 1: Finish Frontend Kernel

- Resolve `types:safe` external blocker or run a targeted TypeScript check once available.
- Visual-check `KaraokeAudioSurface` stories when Storybook is already running or explicitly started.
- Move karaoke `line-height` into an approved Type style or document it in UI conventions.

### Milestone 2: Route and Payload

- Add karaoke payload API type and endpoint. Done: the frontend route prefers the endpoint, the API resolves inline timed lyrics and HTTP(S) `timed_lyrics_ref`, and the payload returns a browser-playable instrumental URL plus canonical `karaoke_lines` and compatibility `raw_lines`.
- Add route `/p/:postId/karaoke` or equivalent. Done.
- Fetch payload on demand. Done with fallback to current post metadata.
- Render `KaraokeAudioSurface`. Done.
- Add exit flow. Done with confirmation before in-surface exit, router-level guard for in-app navigation, browser unload warning, and best-effort browser-back guard during active playback.

### Milestone 3: Song Entry Point

- Add Karaoke `SongOfferRow` or action button. Done.
- Only render for ready karaoke capability. Done.
- Gate the entry point behind community `karaoke_enabled`. Done.
- Add song-card stories for karaoke-ready and karaoke-unavailable states. Done for ready, processing, failed, and unavailable.

### Milestone 4: Community STT Generalization

- Split community STT settings/credentials from assistant enablement.
- Add karaoke scoring policy fields:
  - `karaoke_scoring_enabled`, default `false`.
  - `karaoke_stt_provider`, default `"assistant"` or unset.
  - `karaoke_stt_model`, provider-specific.
  - `karaoke_voice_coach_enabled`, default `false`.
  - raw audio retention policy, default `"not_stored"`.
- Add `deepinfra` to assistant STT provider types.
- Add DeepInfra credential storage/revoke flow.
- Stop coercing voice-enabled STT to ElevenLabs.
- Add provider adapter boundary shared by assistant transcription and karaoke scoring.
- Update assistant settings UI to expose DeepInfra/Nemotron.

### Milestone 5: Deterministic Scoring Core

- Port the legacy say-it-back scorer into a pure karaoke scoring library.
- Preserve contraction/colloquial normalization, phonetic fallback, stop-word keyword coverage, stem fallback, and phonetic renormalization.
- Add confidence-aware scoring.
- Add `bucketRecognizedWordsIntoLines`.
- Add unit tests for:
  - perfect match,
  - missing word,
  - substituted word,
  - colloquial variant,
  - phonetic near miss,
  - repeated chorus text with different line ids,
  - non-Latin line with `phoneticAvailable: false`,
  - early/late timing,
  - low-confidence words,
  - seek/pause bucket finalization.
- Keep scores continuous. Do not make the legacy pass/fail threshold the product result.

### Milestone 6: Streaming Scored Session

- Add consent and retention copy before requesting mic permission.
- Add scored-session hook.
- Capture mic audio with `AudioWorklet`.
- Open authenticated scored-session WebSocket.
- Add Karaoke Session Durable Object.
- Stream timestamped PCM chunks to the DO.
- DO forwards audio to the community streaming STT provider adapter.
- DO bucketizes recognized words into lyric-line windows.
- DO finalizes lines at line boundaries plus grace/timeout.
- DO keeps finalized-line assignment locks so late/repeated words do not get re-assigned to already-finalized lines.
- Enforce abuse/cost guardrails:
  - max song/session duration,
  - max active session count per user/community,
  - max audio minutes per community/day,
  - max chunk size and accepted sample rate,
  - idempotent attempt/session ids,
  - `karaoke_scoring_enabled` policy gate.
- Send empty/domain-only `initialPrompt`; never send expected lyrics as a prompt.
- Render post-line feedback from `line_score` events.

### Milestone 7: Final Coach, TTS, And Reactions

- Add local onset/input-level feedback.
- Add provisional visual feedback from streaming partials, without changing finalized numeric grades.
- Add bottom-up emoji/reaction events driven by deterministic feedback thresholds.
- Add final session summary UI.
- Generate AI coach copy from deterministic `KaraokeCoachInput`.
- Generate optional final TTS coach audio.
- Do not play TTS during the song.

### Milestone 8: Evaluation

- Build a small singing ASR benchmark.
- Compare Nemotron vs Scribe.
- Decide default STT provider from measured karaoke performance, not speech benchmarks alone.
- Add pitch feedback only if target pitch contours are generated and shipped in the karaoke payload.

## References

- Existing Pirate assistant policy: `src/components/compositions/community/assistant-policy/community-assistant-policy.types.ts`
- Existing assistant transcription client: `src/lib/api/client-groups-community-settings.ts`
- NVIDIA Nemotron 3.5 ASR model card: `https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b`
- DeepInfra model page discussed by product: `https://deepinfra.com/nvidia/Nemotron-3.5-ASR-Streaming-Multilingual-0.6b`
