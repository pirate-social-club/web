import {
  type KaraokeSessionEffect,
  type KaraokeSessionState,
  type KaraokeStreamingSttEvent,
  type KaraokeTransportError,
} from "./index";
import type {
  KaraokeEffectRunner,
  KaraokeSttAdapterMessage,
  KaraokeSttCommitAck,
  KaraokeStreamingSttAdapter,
} from "./session-host";
import type { KaraokeClientBinaryFrame } from "./transport";

export class FakeKaraokeEffectRunner implements KaraokeEffectRunner {
  readonly effects: KaraokeSessionEffect[] = [];
  readonly relayedSttEvents: KaraokeStreamingSttEvent[] = [];
  readonly relayedStates: KaraokeSessionState[] = [];
  readonly transportErrors: KaraokeTransportError[] = [];

  async runKaraokeEffect(effect: KaraokeSessionEffect, _state: KaraokeSessionState): Promise<void> {
    this.effects.push(effect);
  }

  async relaySttEvent(event: KaraokeStreamingSttEvent, state: KaraokeSessionState): Promise<void> {
    this.relayedSttEvents.push(event);
    this.relayedStates.push(state);
  }

  async reportTransportError(error: KaraokeTransportError, _state: KaraokeSessionState): Promise<void> {
    this.transportErrors.push(error);
  }
}

export class FakeKaraokeStreamingSttAdapter implements KaraokeStreamingSttAdapter {
  readonly frames: KaraokeClientBinaryFrame[] = [];
  startCount = 0;
  closeCount = 0;
  streamGeneration: string | null = null;
  private onMessage: ((message: KaraokeSttAdapterMessage) => Promise<void>) | null = null;

  async start(input: {
    attemptId: string;
    sessionId: string;
    onMessage: (message: KaraokeSttAdapterMessage) => Promise<void>;
  }): Promise<void> {
    this.startCount += 1;
    this.streamGeneration = `fake-gen-${this.startCount}`;
    this.onMessage = input.onMessage;
  }

  async sendPcm16(frame: KaraokeClientBinaryFrame): Promise<void> {
    this.frames.push(frame);
  }

  // Manual-injection fake: it does not model the provider commit lifecycle.
  async commit(): Promise<{ commitId: string; streamGeneration: string; frontierMs: number } | null> {
    return null;
  }

  async close(): Promise<void> {
    this.closeCount += 1;
    this.onMessage = null;
    this.streamGeneration = null;
  }

  async emit(event: KaraokeStreamingSttEvent, commit?: KaraokeSttCommitAck): Promise<void> {
    if (!this.onMessage) {
      throw new Error("Fake karaoke STT adapter is not started");
    }
    await this.onMessage({ commit, event });
  }
}
