# Karaoke Runtime — Transport & State Specification

Status: normative for `@pirate/karaoke-runtime`. Browser-specific microphone capture
is **non-normative** here — see `web/docs/karaoke-audio-capture.md`.

This document is the source of truth for the karaoke scoring protocol, the session
state machine, sequencing, and the **timestamp contract**. It governs both the
server runtime (the Durable Object host/reducer) and the client transport
(`KaraokeSessionClient`).

Protocol version: `KARAOKE_TRANSPORT_PROTOCOL_VERSION = 1`.

---

## 1. Transport envelope

Every client→server and server→client message carries:

```
{ protocolVersion: 1, sessionId: string, attemptId: string, sequence: number }
```

- `sessionId` / `attemptId` identify the session and the single scored attempt.
- `sequence` is monotonic per direction (see §3).

## 2. Message types

- **Client events** (`KaraokeClientEvent`, JSON): `start`, `playback_sync`,
  `pause`, `resume`, `seek`, `line_boundary`, `finish`, `abort`.
- **Client audio** (`KaraokeClientBinaryFrame`, binary): `audio_chunk` carrying
  PCM16 mono **16 kHz** (`sampleRate: 16000`), with `songStartMs`/`songEndMs`
  (see §4) and `chunkId`.
- **Server events** (`KaraokeServerEvent`, JSON): `stt_partial`, `stt_final`,
  `line_score`, `summary`, `session_error`.

Commit-correlation metadata (`commitId`, `streamGeneration`, `coverageMs`) is
**internal** to the server runtime (adapter↔host) and MUST NOT appear on
client-relayed transcripts.

## 3. Sequencing

- Client events and audio frames **share one** monotonic `sequence` counter.
- The counter **persists across reconnects** — it is never reset. After a
  reconnect the client continues from its last value, which is `>` the server's
  restored `lastClientSequence`, so monotonicity holds.
- The server rejects non-monotonic inbound messages with a `session_error`
  (`non_monotonic_sequence`).
- Server output (`KaraokeServerEvent.sequence`) is a separate counter, restored
  on rehydration.

## 4. Timestamp contract (capture time vs. song time) — NORMATIVE

The single most important rule: **binary frame `songStartMs`/`songEndMs` are
SONG-time bounds; the PCM samples are a continuous microphone capture on an
independent clock.** These two clocks are never conflated.

### 4.1 Anchor API (explicit; no implicit clock sampling)

The transport does NOT sample the playback clock inside `pushAudio`. The caller
owns the capture→song mapping via an explicit anchor:

```
setCaptureAnchor({ captureMs: number, songMs: number, playbackRate: number });
clearCaptureAnchor();
pushAudio(pcm16: ArrayBuffer, capturedAtMs: number);   // capturedAtMs REQUIRED
```

- `captureMs` — the capture clock (`AudioContext.currentTime`×1000) at the anchor.
- `songMs` — the song-time position that corresponds to `captureMs`.
- `playbackRate` — playback speed at the anchor (see §4.2).

### 4.2 Mapping (rate-aware)

```
durationMs  = (pcm16.byteLength / 2 / 16000) * 1000
songEndMs   = anchor.songMs + (capturedAtMs - anchor.captureMs) * anchor.playbackRate
songStartMs = max(0, songEndMs - durationMs * anchor.playbackRate)
```

The formula is only valid within a constant-rate, constant-offset span — hence a
**new anchor (new epoch) is required** whenever song time and capture time
decouple (pause, seek, resume, rate change).

Rate-aware anchors are kept (rather than rejecting non-1.0 playback). Pinned
invariants:

- `playbackRate` is finite and `> 0` (enforced by `setCaptureAnchor`, which also
  requires finite `captureMs` and finite non-negative `songMs`).
- `capturedAtMs` MUST be `>= anchor.captureMs` (no pre-anchor capture) and `>=` the
  previous accepted `capturedAtMs` within the epoch. Pre-anchor or regressing
  timestamps are **dropped**, never sent. A legitimate backward seek must
  `setCaptureAnchor` first — a new epoch resets this monotonic guard.
- Within an epoch, derived song bounds are finite, non-negative, and monotonic, and
  are emitted as **rounded integers** (the binary codec requires integer bounds).
- Every rate change creates a **new epoch + anchor** (§4.3/§4.4).
- **No chunk may span two rates** (a chunk is wholly within one epoch).

### 4.3 Anchor lifecycle (when to (re)anchor)

Capture begins **inactive** (no anchor); audio only flows after the first anchor:

```
capture.start()        // inactive; no chunks forwarded
client.start()         // sent on the live socket
socket live
client.setCaptureAnchor(...)
await capture.activate()
```

- **start (initial activation owner)** — capture is inactive until `start` is sent
  on a live socket; only then set the first anchor and activate. No chunk is
  produced before an anchor. **The initial activation is owned by the web
  orchestration**, reacting to the phase becoming `live` (via `onPhaseChange`):
  it calls `setCaptureAnchor(...)` then `activate()`. Unlike reconnect this needs
  **no awaited hook** and is race-free: capture begins inactive (no chunk before
  `activate()`), `setCaptureAnchor` is synchronous, and there is **no prior epoch
  to tear down**. That absence of a teardown ordering hazard is precisely why the
  awaited `resumeCapture` hook (§6) is reconnect-only — on the initial path there
  is nothing to await before anchoring.
- **resume** — anchor on resume, immediately before reactivating capture.
  **Never anchor at pause:** paused capture-clock time would otherwise be folded
  into song time.
- **seek while playing** — re-anchor after the `seek` event is queued.
- **seek while paused** — store the target song position only; **defer** the
  capture anchor until resume.
- **rate change** — there is no dedicated rate transport event. The client queues
  the next authoritative `playback_sync` (the server's song-time bounds already
  encode rate via the anchor), then re-anchors locally with the new
  `playbackRate` via a transition (§4.4). A rate change is always a new epoch.
- **pause** — `clearCaptureAnchor()`; no audio is accepted while unanchored.

### 4.4 Transition protocol (asynchronous, flushed, epoch-guarded) — NORMATIVE

A control transition (pause/seek/resume/rate-change) MUST be ordered as an
**acknowledged** sequence so no pre-transition audio is mapped with the new
anchor and no post-transition audio with the old one:

```
await capture.deactivateAndFlush();   // stops emission AND drains the worklet (acknowledged)
client.<pause|seek|...>(songMs);       // control frame QUEUED before any new-epoch binary frame
client.setCaptureAnchor({ ... });      // new mapping (or clearCaptureAnchor on pause)
await capture.activate();              // resume emission (resume/seek-while-playing)
```

- **Ordering guarantee.** `client.pause()/seek()` only *queues* a frame on the
  socket; there is no server acknowledgement. The guarantee relied upon is
  WebSocket in-order delivery: **the control frame is queued before any
  new-epoch binary frame on the same socket.** (If actual server application must
  be confirmed, the protocol would need a new server ack event — out of scope.)
- **Epoch ownership = the capture engine.** `deactivateAndFlush()` is
  async/acknowledged; the worklet tags chunks with a monotonic epoch (bumped by
  `activate()`), and the **capture engine** drops stale-epoch chunks and only
  invokes `pushAudio` for the current epoch. The transport's `pushAudio` therefore
  takes **no** epoch — epoch validation lives entirely in the capture layer, not
  split across both.

### 4.5 Unanchored audio & legacy fallback

- Once an anchor exists, `pushAudio` **requires** `capturedAtMs` and uses the
  anchor mapping. Audio pushed while unanchored (no/cleared anchor) is **dropped**
  — anchored timing is mandatory for scored sessions, never silently skipped.
- A delivery-time fallback (`songEnd = playbackClock()` at push time) is biased
  late and is permitted **only** behind an explicit, separate legacy/compat path
  (not the default `pushAudio`).

## 5. Session state machine (server runtime) — summary

Authoritative behavior lives in `session.ts` (reducer) + `session-host.ts`
(host); this is a normative summary.

- **Two-gate finalization.** A lyric line finalizes only when the playback clock
  has passed `line.endMs` **and** the STT watermark has reached it, OR a
  `KARAOKE_FINALIZE_GRACE_MS` (600 ms, song time — frozen while paused) window
  elapses. Playback alone never finalizes.
- **STT watermark** advances only on a committed final that exactly matches the
  pending commit (`commitId` + `streamGeneration`); it advances to the
  adapter-captured `frontierMs`, never a self-reported coverage.
- **Commit scheduling** is serialized on a single host-owned promise chain
  (schedule / ack / timeout / finish-drain) so an ack and a timeout can never
  concurrently resolve the same pending commit. Commits are coalesced
  (one in flight).
- **uncertain.** A line whose commit fails for an infrastructure reason
  (`provider_failed`: auth/quota/rate-limit/dead-stream/restore-loss) is marked
  `uncertain` — excluded from the aggregate score but counted in `lineCount`. A
  genuine miss (grace `timeout`) is scored as sung (low), not uncertain.

## 6. Reconnect contract — NORMATIVE

On an unexpected disconnect or proactive token refresh:

1. Replay session creation with the **same idempotency key** → the capability
   token refreshes but the **attempt is unchanged**.
2. `start` is sent **only** on the first connection — never re-sent on reconnect.
3. **PCM is never replayed.** Retention is `not_stored`; the prior audio is gone.
   Capture resumes with a **fresh STT generation**; the server's restore path
   invalidates the old in-flight commit as `provider_failed` (→ that line is
   `uncertain`).
4. The client keeps its sequence counter (§3).
5. **Capture is suspended across the reconnect with an acknowledged transition** —
   clearing the anchor alone is insufficient because the worklet keeps producing
   chunks (a partial chunk from the disconnect window could cross into the new
   epoch). Required lifecycle:

   ```
   socket leaves live
     → await suspendCapture()          // web: deactivateAndFlush() + clearCaptureAnchor()
     → reconnect (re-create, new socket)
     → socket becomes live
     → await resumeCapture(descriptor) // web: setCaptureAnchor(...) + activate()
   ```

   `onPhaseChange` is **synchronous and observational only** — it cannot enforce
   this ordering. The transport therefore exposes **async capture hooks**
   (`suspendCapture?(): Promise<void>`, `resumeCapture?(descriptor): Promise<void>`)
   that it `await`s around reconnect/token-refresh; the web layer implements them
   over the capture engine. (Equivalently, the web orchestration may own reconnect
   capture suspension outright — but the timing MUST be acknowledged, not driven
   off the synchronous phase callback.)

6. **Suspension begins on EVERY live-socket loss** — unexpected close, session
   expiry, AND proactive token refresh — *before* deciding expired vs. reconnect,
   so an expired session never leaves the mic engine active.
7. **A failed `suspendCapture` blocks resume.** If the previous epoch may not have
   flushed/deactivated, the transport does NOT call `resumeCapture`; it fails the
   capture transition (→ `capture_failed`, §7) rather than resume over unflushed
   audio.
8. **A failed `resumeCapture` never leaves the client silently live.** The phase
   becomes `capture_failed` with the socket closed and anchor cleared — not `live`
   with audio silently dropped.
9. Only the **currently-active socket** may run `resumeCapture`; a superseded
   reconnect (or a close/abort during the awaited hook) must not reactivate, and an
   anchor set during a supersession is dropped.
10. **One suspension per gap.** A second socket loss while a suspend is still
    pending is coalesced — `suspendCapture` is invoked once per gap, not concurrently.
11. **Capture transitions are serialized.** Suspend and resume run on a single
    ordered chain — they NEVER overlap. A resume runs strictly after its gap's
    suspend; if a newer suspension begins while a resume is activating, the resume
    detects the bumped **generation**, drops its anchor, and the trailing serialized
    suspend deactivates whatever it activated — so capture can never end active under
    a newer suspension. Only the current, non-superseded socket resumes.

## 7. Session lifecycle phases (client)

`idle → creating → connecting → live → (reconnecting ⇄ live) → {expired | closed | aborted | capture_failed}`.

- `expired` — a disconnect at/after `sessionExpiresAt`; no reconnect. **Terminal.**
- `closed` — client-initiated. **Terminal.**
- `aborted` — `abort(code)`. **Terminal: an aborted attempt cannot resume.**
- `capture_failed` — a capture transition (suspend or resume) failed; the socket is
  closed and the anchor cleared. **Recoverable** (the orchestrator may start a NEW
  attempt) but the client is never left silently `live`.

All four are terminal for reconnect purposes (the reconnect guards treat
`expired | closed | aborted | capture_failed` alike — none auto-reconnects).

**Capture teardown.** On EVERY terminal transition — `close`, `abort`, `expired`,
and `capture_failed` — the transport invokes the optional `teardownCapture()` hook
(full stop: tracks + AudioContext) so the microphone never outlives the session
even if the UI forgets to clean up. The terminal transition **bumps the capture
generation** (so an in-flight resume, on completion, sees it's superseded and drops
its anchor rather than staying active) and **enqueues the stop on the serialized
chain** so it runs strictly AFTER any in-flight resume — an explicit terminal
shutdown can't be stop-then-reactivated by a resume that was mid-activation.
Teardown is invoked **at most once** (cached promise) across competing terminal
paths, reports failure once, and is awaitable so future orchestration can block a
replacement attempt on full mic release. As a forced fallback, if the chain is hung
(a never-resolving suspend/resume) the stop fires after `captureTeardownTimeoutMs`
(default 2000) anyway — a **hung transition can never block the full stop**. The
capture engine's own `stop()` MUST permanently no-op/reject `activate()` so a
late-completing resume cannot reactivate the mic; the `teardownCapture` hook MUST
be idempotent.

**Binary-bounds safety.** Before sending, the transport validates the rounded song
bounds against the codec's ordered-`uint32` constraint; out-of-range frames (from a
huge `songMs`/`playbackRate`/capture delta) are dropped and reported
(`karaoke_audio_bounds_invalid`), never allowed to throw out of `encode`.

A microphone failure mid-session aborts the attempt (see capture doc §6).
**Retrying after such a failure creates a NEW scored attempt** — a fresh session
creation with a new `attempt` — not a resume of the aborted one.
