import { reduceKaraokeSession, type KaraokeSessionEffect, type KaraokeSessionEvent, type KaraokeSessionState } from "./session";
import {
  type KaraokeClientBinaryFrame,
  type KaraokeClientEvent,
  type KaraokeStreamingSttEvent,
  type KaraokeTransportError,
  validateKaraokeTransportEnvelope,
} from "./transport";

export interface KaraokeEffectRunner {
  runKaraokeEffect(effect: KaraokeSessionEffect, state: KaraokeSessionState): Promise<void>;
  relaySttEvent(event: KaraokeStreamingSttEvent, state: KaraokeSessionState): Promise<void>;
  reportTransportError(error: KaraokeTransportError, state: KaraokeSessionState): Promise<void>;
}

/** Correlation metadata attached to a committed final (never relayed to clients). */
export interface KaraokeSttCommitAck {
  commitId: string;
  streamGeneration: string;
  coverageMs: number;
}

/**
 * Internal adapter → host message. `event` is the client-relayable transcript;
 * `commit` (present only on committed finals) carries the correlation metadata
 * the host uses for the watermark/second-gate. Keeping commit metadata off the
 * transport event guarantees it never leaks to clients.
 */
export interface KaraokeSttAdapterMessage {
  event: KaraokeStreamingSttEvent;
  commit?: KaraokeSttCommitAck;
}

export interface KaraokeStreamingSttAdapter {
  /** Opaque id for the current provider stream; null before start()/after close(). */
  readonly streamGeneration: string | null;
  start(input: {
    attemptId: string;
    sessionId: string;
    onMessage: (message: KaraokeSttAdapterMessage) => Promise<void>;
  }): Promise<void>;
  sendPcm16(frame: KaraokeClientBinaryFrame): Promise<void>;
  /**
   * Request an explicit commit of audio submitted so far. Returns the commit's
   * correlation handle, or null when refused (below the provider audio floor or a
   * commit is already in flight). Refusal must NOT tear down the stream.
   */
  commit(): Promise<{ commitId: string; streamGeneration: string; frontierMs: number } | null>;
  close(): Promise<void>;
}

export interface KaraokeSessionHostSnapshot {
  state: KaraokeSessionState;
  lastClientSequence: number | null;
  lastSttSequence: number | null;
}

export interface KaraokeSessionHostRestoreOptions {
  lastClientSequence?: number | null;
  lastSttSequence?: number | null;
}

export interface KaraokeSessionHostOptions {
  restore?: KaraokeSessionHostRestoreOptions;
  /** Epoch ms source (default Date.now). */
  now?: () => number;
  /** Timer hooks (default global setTimeout/clearTimeout) — injectable for tests. */
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Called after every pending-commit transition so the DO can persist. */
  persist?: () => Promise<void>;
  /** How long to wait for a commit's ack before declaring it timed out. */
  commitAckTimeoutMs?: number;
}

const DEFAULT_COMMIT_ACK_TIMEOUT_MS = 2_000;

function clientEventToSessionEvent(
  state: KaraokeSessionState,
  event: KaraokeClientEvent,
): KaraokeSessionEvent | KaraokeTransportError {
  switch (event.type) {
    case "start":
      return { audioTimeMs: event.startedAtAudioMs, type: "start" };
    case "playback_sync":
      return { audioTimeMs: event.audioTimeMs, playing: event.playing, type: "playback_sync" };
    case "pause":
    case "resume":
    case "seek":
    case "finish":
      return { audioTimeMs: event.audioTimeMs, type: event.type };
    case "abort":
      return { code: event.code, type: "abort" };
    case "line_boundary": {
      const line = state.lines.find((candidate) => candidate.lineId === event.lineId);
      if (!line || line.lineIndex !== event.lineIndex || line.scoredLineIndex !== event.scoredLineIndex) {
        return {
          code: "line_identity_mismatch",
          message: `Invalid karaoke line identity: ${event.lineId}`,
          sequence: event.sequence,
        };
      }
      return { audioTimeMs: event.audioTimeMs, lineId: event.lineId, type: "line_boundary" };
    }
  }
}

function isTransportError(
  value: KaraokeSessionEvent | KaraokeTransportError,
): value is KaraokeTransportError {
  return "message" in value;
}

export class KaraokeSessionHost {
  private state: KaraokeSessionState;
  private lastClientSequence: number | null;
  private lastSttSequence: number | null;
  private sttStarted = false;

  // Single serialized chain for all commit lifecycle work (scheduling, acks,
  // timeouts, finish drain) so an ack and a timeout can never concurrently
  // reduce the same pending commit.
  private commitChain: Promise<void> = Promise.resolve();
  private commitTimer: unknown = null;
  private pendingFinish: { audioTimeMs: number } | null = null;

  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private readonly persist: () => Promise<void>;
  private readonly commitAckTimeoutMs: number;

  constructor(
    initialState: KaraokeSessionState,
    private readonly effectRunner: KaraokeEffectRunner,
    private readonly sttAdapter: KaraokeStreamingSttAdapter,
    options: KaraokeSessionHostOptions = {},
  ) {
    this.state = initialState;
    this.lastClientSequence = options.restore?.lastClientSequence ?? null;
    this.lastSttSequence = options.restore?.lastSttSequence ?? null;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
    this.persist = options.persist ?? (async () => undefined);
    this.commitAckTimeoutMs = options.commitAckTimeoutMs ?? DEFAULT_COMMIT_ACK_TIMEOUT_MS;
  }

  /** Awaits the serialized commit chain to settle — for deterministic tests. */
  async drainCommitChain(): Promise<void> {
    // Await repeatedly: a chain task may enqueue further tasks (commit → ack).
    for (let i = 0; i < 50; i += 1) {
      const settled = this.commitChain;
      await settled;
      if (settled === this.commitChain) return;
    }
  }

  private enqueueCommitTask(task: () => Promise<void>): void {
    this.commitChain = this.commitChain.then(task).catch(() => undefined);
  }

  snapshot(): KaraokeSessionHostSnapshot {
    return {
      lastClientSequence: this.lastClientSequence,
      lastSttSequence: this.lastSttSequence,
      state: this.state,
    };
  }

  async handleClientEvent(event: KaraokeClientEvent): Promise<KaraokeTransportError | null> {
    const envelopeError = validateKaraokeTransportEnvelope({
      attemptId: this.state.attemptId,
      event,
      lastSequence: this.lastClientSequence,
      sessionId: this.state.sessionId,
    });
    if (envelopeError) {
      await this.effectRunner.reportTransportError(envelopeError, this.state);
      return envelopeError;
    }

    const sessionEvent = clientEventToSessionEvent(this.state, event);
    if (isTransportError(sessionEvent)) {
      await this.effectRunner.reportTransportError(sessionEvent, this.state);
      return sessionEvent;
    }

    this.lastClientSequence = event.sequence;

    // Finish drains the in-flight commit (or attempts a terminal one) before the
    // session is summarized — run it on the serialized chain so it composes with
    // acks/timeouts. The summary is broadcast asynchronously when the drain ends.
    if (sessionEvent.type === "finish") {
      this.enqueueCommitTask(() => this.beginFinish(sessionEvent.audioTimeMs));
      return null;
    }

    await this.reduce(sessionEvent);

    // A seek abandons any in-flight commit (the reducer drops a now-incompatible
    // pending commit); cancel its timer so it cannot fire against a new commit.
    if (sessionEvent.type === "seek" && this.state.pendingCommit === null) {
      this.clearCommitTimer();
    }

    if (event.type === "start" && this.state.status === "recording") {
      const sttError = await this.startStt(event.sequence);
      if (sttError) return sttError;
    }

    return null;
  }

  /**
   * Restarts the STT adapter after a hibernation restore when the session is
   * already recording. Without this, a restored recording session has
   * sttStarted=false and subsequent audio frames reach an unstarted adapter and
   * are silently dropped.
   */
  async resumeSttIfRecording(): Promise<KaraokeTransportError | null> {
    if (this.state.status !== "recording" || this.sttStarted) return null;
    return await this.startStt(undefined);
  }

  private async startStt(sequence: number | undefined): Promise<KaraokeTransportError | null> {
    if (this.sttStarted) return null;
    this.sttStarted = true;
    try {
      await this.sttAdapter.start({
        attemptId: this.state.attemptId,
        onMessage: async (message) => {
          // Serialize message handling (incl. commit acks) on the commit chain.
          this.enqueueCommitTask(() => this.processAdapterMessage(message));
        },
        sessionId: this.state.sessionId,
      });
      return null;
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? "stt_adapter_start_failed";
      const message = error instanceof Error ? error.message : String(error);
      this.sttStarted = false;
      await this.reduce({ code, type: "abort" });
      const transportError: KaraokeTransportError = {
        code: "session_aborted",
        message,
        sequence,
      };
      await this.effectRunner.reportTransportError(transportError, this.state);
      return transportError;
    }
  }

  async handleAudioFrame(frame: KaraokeClientBinaryFrame): Promise<KaraokeTransportError | null> {
    const envelopeError = validateKaraokeTransportEnvelope({
      attemptId: this.state.attemptId,
      event: frame,
      lastSequence: this.lastClientSequence,
      sessionId: this.state.sessionId,
    });
    if (envelopeError) {
      await this.effectRunner.reportTransportError(envelopeError, this.state);
      return envelopeError;
    }

    if (this.state.status !== "recording") {
      const statusError: KaraokeTransportError = {
        code: "session_not_recording",
        message: `Cannot accept karaoke audio while session status is ${this.state.status}`,
        sequence: frame.sequence,
      };
      await this.effectRunner.reportTransportError(statusError, this.state);
      return statusError;
    }

    this.lastClientSequence = frame.sequence;
    await this.sttAdapter.sendPcm16(frame);
    return null;
  }

  /**
   * Entry point for adapter messages. Relays/reduces the transcript via
   * handleSttEvent; the commit correlation metadata (message.commit) drives the
   * watermark/second-gate, wired in a later step. Kept separate from
   * handleSttEvent so direct STT-event injection (tests, /internal/stt) is intact.
   */
  async handleSttMessage(message: KaraokeSttAdapterMessage): Promise<KaraokeTransportError | null> {
    return await this.handleSttEvent(message.event, message.commit);
  }

  async handleSttEvent(
    event: KaraokeStreamingSttEvent,
    commit?: KaraokeSttCommitAck,
  ): Promise<KaraokeTransportError | null> {
    const envelopeError = validateKaraokeTransportEnvelope({
      attemptId: this.state.attemptId,
      event,
      lastSequence: this.lastSttSequence,
      sessionId: this.state.sessionId,
    });
    if (envelopeError) {
      await this.effectRunner.reportTransportError(envelopeError, this.state);
      return envelopeError;
    }

    // Carry the commit correlation metadata into the reducer only on finals so it
    // can advance the watermark; the relayed client transcript stays metadata-free.
    const reductionEvent: KaraokeSessionEvent = event.type === "stt_final" && commit
      ? {
          commitId: commit.commitId,
          coverageMs: commit.coverageMs,
          streamGeneration: commit.streamGeneration,
          type: "stt_final",
          words: event.words,
        }
      : { type: event.type, words: event.words };
    const reduction = reduceKaraokeSession(this.state, reductionEvent);
    this.state = reduction.state;
    this.lastSttSequence = event.sequence;
    await this.effectRunner.relaySttEvent(event, this.state);
    await this.runEffects(reduction.effects);
    return null;
  }

  private async reduce(event: KaraokeSessionEvent): Promise<void> {
    const reduction = reduceKaraokeSession(this.state, event);
    this.state = reduction.state;
    await this.runEffects(reduction.effects);
  }

  private async runEffects(effects: readonly KaraokeSessionEffect[]): Promise<void> {
    for (const effect of effects) {
      if (effect.type === "request_stt_commit") {
        // The reducer asks for a commit to advance the watermark; schedule it on
        // the serialized chain (coalesced — see scheduleCommit). The adapter
        // captures its own committed frontier, so only the affected lineIds matter.
        const lineIds = effect.lineIds;
        this.enqueueCommitTask(() => this.scheduleCommit(lineIds));
        continue;
      }
      if (effect.type === "close_stt_stream" && this.sttStarted) {
        await this.effectRunner.runKaraokeEffect(effect, this.state);
        await this.sttAdapter.close();
        this.sttStarted = false;
        continue;
      }
      await this.effectRunner.runKaraokeEffect(effect, this.state);
    }
  }

  // --- Commit scheduler (all methods run on the serialized commit chain) -------

  private async scheduleCommit(lineIds: readonly string[]): Promise<void> {
    // Coalesce: at most one commit in flight. Re-checked here (not at enqueue
    // time) so a burst of request_stt_commit effects produces a single adapter call.
    if (this.state.pendingCommit !== null) return;
    if (this.state.status !== "recording" && this.state.status !== "finalizing") return;
    const handle = await this.sttAdapter.commit();
    if (!handle) return; // refused (below floor / already in flight) — retry on the next request; no synthetic failure
    await this.applyCommitSent(handle, [...lineIds]);
  }

  private async applyCommitSent(
    handle: { commitId: string; streamGeneration: string; frontierMs: number },
    lineIds: string[],
  ): Promise<void> {
    await this.reduce({
      commitId: handle.commitId,
      frontierMs: handle.frontierMs,
      lineIds,
      requestedAtEpochMs: this.now(),
      streamGeneration: handle.streamGeneration,
      type: "commit_sent",
    });
    await this.persist();
    this.armCommitTimer(handle.commitId, handle.streamGeneration);
  }

  private armCommitTimer(commitId: string, streamGeneration: string): void {
    this.clearCommitTimer();
    this.commitTimer = this.setTimer(() => {
      this.enqueueCommitTask(() => this.handleCommitTimeout(commitId, streamGeneration));
    }, this.commitAckTimeoutMs);
  }

  private clearCommitTimer(): void {
    if (this.commitTimer !== null) {
      this.clearTimer(this.commitTimer);
      this.commitTimer = null;
    }
  }

  private async handleCommitTimeout(commitId: string, streamGeneration: string): Promise<void> {
    const pending = this.state.pendingCommit;
    // No-op if the ack already won the race (pending cleared or replaced).
    if (!pending || pending.commitId !== commitId || pending.streamGeneration !== streamGeneration) return;
    await this.reduce({ commitId, reason: "timeout", streamGeneration, type: "commit_failed" });
    await this.persist();
    await this.maybeFinishAfterResolve();
  }

  private async processAdapterMessage(message: KaraokeSttAdapterMessage): Promise<void> {
    await this.handleSttMessage(message);
    if (message.commit) {
      // A commit was acknowledged (or dropped as stale) — cancel its timer and
      // settle any finish that was waiting on it.
      this.clearCommitTimer();
      await this.persist();
      await this.maybeFinishAfterResolve();
    }
  }

  private async beginFinish(audioTimeMs: number): Promise<void> {
    if (this.state.status === "finalized" || this.state.status === "aborted") return;
    // Reuse an in-flight commit; otherwise attempt a terminal commit of the tail.
    // A refused (below-floor) terminal commit is fine — the reducer's terminal
    // sweep finalizes the rest; no synthetic provider_failed is invented.
    if (this.state.pendingCommit === null) {
      const handle = await this.sttAdapter.commit();
      if (handle) {
        await this.applyCommitSent(handle, []);
      }
    }
    await this.reduce({ audioTimeMs, type: "finish" });
    await this.persist();
    if (this.state.pendingCommit !== null) {
      // Drain: the ack or the commit timeout will complete the finish.
      this.pendingFinish = { audioTimeMs };
    }
  }

  /**
   * On restore, a pending commit persisted by an evicted stream can never be
   * acknowledged — its provider stream is gone. Finalize it as `provider_failed`
   * (recognition infrastructure was lost, NOT the singer missing the line) when
   * its generation differs from the freshly started stream. In-memory commit
   * timers do not survive eviction, so this is the durable resolution of that
   * pending commit rather than re-arming a timer.
   */
  async invalidateOrphanedPendingCommit(currentStreamGeneration: string | null): Promise<void> {
    const pending = this.state.pendingCommit;
    if (!pending) return;
    if (currentStreamGeneration !== null && pending.streamGeneration === currentStreamGeneration) return;
    await this.reduce({
      commitId: pending.commitId,
      reason: "provider_failed",
      streamGeneration: pending.streamGeneration,
      type: "commit_failed",
    });
    await this.persist();
  }

  private async maybeFinishAfterResolve(): Promise<void> {
    const finish = this.pendingFinish;
    if (!finish || this.state.pendingCommit !== null) return;
    this.pendingFinish = null;
    await this.reduce({ audioTimeMs: finish.audioTimeMs, type: "finish" });
    await this.persist();
  }
}
