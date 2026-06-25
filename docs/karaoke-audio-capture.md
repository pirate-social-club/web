# Karaoke Browser Audio Capture — Design (Phase 5.2)

Status: design, pre-implementation. Browser-specific; **non-normative**. The
normative transport/state/timestamp contract is
`web/packages/karaoke-runtime/SPEC.md` — this document must conform to it.

Scope: turn the microphone into the continuous PCM16 mono 16 kHz stream that
`KaraokeSessionClient.pushAudio(pcm16, capturedAtMs)` expects, with correct
pause/seek behavior, teardown, and permission handling.

Sequencing note: **5.1 web glue lands before 5.2.** The audio engine needs a real
creation/socket boundary (authed `createSession` + real `WebSocket` factory) to
integrate against.

---

## 1. Two decoupled audio domains

- **Playback domain** — the instrumental track. Owns **song time**
  (`playbackClock()`). Pre-existing (`karaoke-audio-surface`,
  `use-synthetic-karaoke-clock`).
- **Capture domain** — the microphone. Produces a **continuous** PCM16 mono
  16 kHz stream on its own clock (`AudioContext.currentTime`).

These never share a clock. The transport's anchor model (SPEC §4) maps capture
time → song time.

## 2. Capture engine — `KaraokeMicCapture`

```
start(): Promise<void>                       // getUserMedia → AudioContext → AudioWorkletNode; begins INACTIVE
onChunk: (pcm16, capturedAtMs) => void        // fires ONLY for current-epoch chunks (engine pre-filters)
deactivateAndFlush(): Promise<void>          // stop emission + drain worklet, ACKNOWLEDGED (see §5)
activate(): Promise<void>                     // bump epoch, resume emission
captureClockMs(): number                      // AudioContext.currentTime * 1000 (for anchoring)
stop(): Promise<void>                         // full teardown
onError: (e: { code: KaraokeMicErrorCode; message: string }) => void
```

Pipeline: `getUserMedia({ audio: { channelCount: 1, echoCancellation: true,
noiseSuppression: true, autoGainControl: true } })` → `AudioContext` →
`MediaStreamAudioSourceNode` → `AudioWorkletNode("karaoke-capture")` →
main-thread `onChunk(pcm16, capturedAtMs)`.

- **Starts inactive.** `start()` wires up the graph but produces no `onChunk`
  until `activate()`. Capture is activated only after `client.start()` is sent and
  the first anchor is set (SPEC §4.3) — never before an anchor exists.
- **Epoch ownership = this engine.** The worklet tags every chunk with a monotonic
  **epoch** (bumped by `activate()`); the engine compares against its current epoch
  and **only invokes `onChunk` (→ `pushAudio`) for the current epoch**. The
  transport's `pushAudio` takes no epoch — epoch validation is not split across
  layers (SPEC §4.4).
- `deactivateAndFlush()` is **async/acknowledged**: worklet→main messages already
  in flight can arrive after a control event, so it round-trips a barrier message
  to the worklet and awaits its ack before resolving (and clears the partial
  chunk buffer). Combined with the epoch bump on the next `activate()`, no queued
  pre-transition chunk can ever be forwarded under a new anchor.

## 3. Resampling to 16 kHz (decision B)

- **Native first:** construct `new AudioContext({ sampleRate: 16000 })`.
- **Never assume the hint worked:** read `ctx.sampleRate` after construction.
  - `=== 16000` → no resampling; the worklet only downmixes + converts.
  - `!== 16000` → run the **fractional/rational resampler** below.

`44100 → 16000` is **not** integer decimation (ratio 441/160). The fallback MUST
be a fractional/rational resampler (polyphase, or upsample-L/low-pass/decimate-M)
with an anti-alias low-pass below 8 kHz **and persistent phase + filter state
carried across render quanta** — a per-quantum reset would click and drift the
sample count. "Low-pass then decimate" alone is insufficient and wrong for
non-integer ratios. (48000 → 16000 is integer ×3 but still needs the anti-alias
filter and persistent state.)

## 4. Worklet processor — `karaoke-capture-processor`

Per render quantum: downmix to mono → (resample with persistent state) →
Float32→Int16 (clamp `[-1,1]`, ×32767, round) → accumulate toward ~100 ms chunks
(1600 samples / 3200 bytes) → `postMessage({ pcm16, capturedAtMs, epoch })`.

`capturedAtMs` is **derived from the processed source-sample count**, not the
`currentTime` at the moment the 100 ms chunk happens to be emitted: a chunk spans
many quanta, so its trailing edge is
`anchorContextTime + (processedSourceSamples / sourceSampleRate)` (carried as the
chunk's end-of-audio time). Attaching the emit-time `currentTime` would over- or
under-count the accumulation latency.

**Testability:** the DSP core (downmix + resample + Int16 + chunking +
sample-count timestamping) is a pure function unit-tested off the AudioWorklet.

## 5. Pause / seek / resume / rate — acknowledged transitions (SPEC §4.3–§4.4)

Transitions are **asynchronous and acknowledged** (`deactivateAndFlush()`), and
the anchor is set at the right moment per SPEC §4.3 — crucially **anchored on
resume, never at pause** (paused capture-clock time must not enter song time):

```
// pause
await capture.deactivateAndFlush();   // stop emission + drain worklet (acknowledged) + clear partial buffer
client.pause(songMs);
client.clearCaptureAnchor();          // no audio accepted while paused; keep mic track open

// resume
client.resume(songMs);
client.setCaptureAnchor({ captureMs: capture.captureClockMs(), playbackRate, songMs });
await capture.activate();             // bumps epoch; only post-resume audio flows

// seek while playing
await capture.deactivateAndFlush();
client.seek(songMs);
client.setCaptureAnchor({ captureMs: capture.captureClockMs(), playbackRate, songMs });
await capture.activate();

// seek while paused → store target song position only; defer setCaptureAnchor + activate to resume
// rate change → same shape as resume: deactivateAndFlush → control update → re-anchor(new rate) → activate
```

- The flush + epoch (§2) guarantee no stale pre-transition buffer is mapped with
  the new anchor.
- **Seek:** the server's `seek` rewinds the watermark and drops the incompatible
  pending commit.
- **Pause:** keep the mic track open (avoid a re-permission prompt); emission is
  off and the anchor is cleared, so the server never receives paused audio.

## 6. Permission / device failures (decision C)

`getUserMedia` rejections map to typed `KaraokeMicErrorCode`:
`permission_denied` (NotAllowedError), `no_device` (NotFoundError),
`device_unavailable` (NotReadableError), `unknown`.

- A **scored** session **hard-aborts** on mic failure (`client.abort(...)`); there
  is no implicit degraded scoring. Surface the error as **recoverable** (allow
  retry).
- **Retry creates a NEW scored attempt** — a fresh session creation with a new
  `attempt` (SPEC §7). The aborted attempt is terminal and cannot resume; retry is
  not a reconnect.
- "Playback-only / unscored karaoke" is a **separate explicit mode**, never an
  implicit fallback from a scored session.
- A mid-session track end (unplug, OS revocation) is treated the same as a
  failure → abort + recoverable surface.

## 7. Echo / instrumental bleed (decision D)

The mic also captures the instrumental → STT may transcribe the backing track.
Mitigation is **best-effort, not prevention**:

- `echoCancellation: true` (+ noiseSuppression/autoGainControl) in the capture
  constraints.
- Recommend headphones in the UI (do not require them — impractical).
- Because bleed cannot be guaranteed away, **do not claim prevention**. We have no
  bleed detector, and low per-word STT confidence does NOT establish bleed
  (it conflates mishearing, noise, accent, etc.). So surface it honestly as
  **"low recognition certainty"** (the existing confidence-as-certainty signal),
  **not** "bleed-suspect". A real bleed detector (e.g. correlating the mic with
  the known instrumental) would be required before labeling bleed specifically.

## 8. Teardown

On finish / abort / close / component unmount: `await deactivateAndFlush()`
(stop + drain + clear partial buffer), stop all `MediaStreamTrack`s,
`disconnect()` the worklet node and source, `AudioContext.close()`, null
callbacks. No live mic or open `AudioContext` may outlive the session.

## 9. Test plan (fakes; no real mic)

- **DSP core (pure):** Float32 frames → mono Int16 16 kHz output, chunk sizes,
  clamping.
- **Fractional resampler (pure):** continuity across chunk boundaries (no clicks /
  state reset); long-run output-sample-count accuracy (e.g. 10 s @44.1k → ~160000
  samples within tolerance); impulse response; rejection of content above 8 kHz
  (anti-alias); persistent phase across quanta.
- **Trailing-edge timestamp:** chunks accumulated across many quanta carry a
  `capturedAtMs` derived from processed source-sample counts, not emit time.
- **Engine lifecycle:** fake `getUserMedia` + fake `AudioContext`/worklet →
  chunks reach `onChunk` with monotonic `capturedAtMs` + epoch;
  `deactivateAndFlush()` resolves only after the worklet ack and **drops queued
  stale-epoch chunks**; `stop()` stops tracks + closes the context.
- **Permission failures:** fake `getUserMedia` rejecting each error type → typed
  error, no chunks; retry yields a new attempt.
- **Engine ↔ transport:** fake engine drives `pushAudio`; assert song-time bounds
  under the anchor model (incl. `playbackRate`), the deactivate→flush→event→
  re-anchor→activate ordering, anchor-on-resume (not pause), and no emission while
  unanchored.

## 10. Conformance checklist (audit)

1. capture clock ≠ playback clock; song-time via the explicit anchor API (SPEC §4).
2. anchor on **resume**, never at pause; seek-while-paused defers anchoring; rate
   stored in the anchor (SPEC §4.3).
3. transitions are async/acknowledged (`deactivateAndFlush`), flush the partial
   buffer, and use epoch to drop stale queued chunks (SPEC §4.4).
4. anchored timing is mandatory once anchored; no audio accepted while unanchored.
5. `AudioContext.sampleRate` is read, never assumed; fallback is a fractional
   resampler with persistent phase/filter state, tested for continuity, long-run
   sample count, and >8 kHz rejection.
6. `capturedAtMs` derived from processed source-sample counts (trailing edge), not
   emit time.
7. mic failure hard-aborts; retry is a NEW attempt (not a resume); playback-only is
   a separate mode.
8. echo mitigated; surfaced as "low recognition certainty", not "bleed-suspect"
   (no bleed detector).
9. teardown leaves no live mic / open context.
