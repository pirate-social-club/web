import {
  reduceKaraokeSession,
  validateKaraokeTransportEnvelope,
  type KaraokeClientBinaryFrame,
  type KaraokeClientEvent,
  type KaraokeServerEvent,
  type KaraokeSessionEffect,
  type KaraokeSessionEvent,
  type KaraokeSessionState,
  type KaraokeStreamingSttEvent,
  type KaraokeTransportEnvelope,
  KARAOKE_TRANSPORT_PROTOCOL_VERSION,
} from "@pirate/karaoke-runtime";

export type FakeKaraokeTransportInput =
  | { source: "client"; event: KaraokeClientEvent }
  | { source: "audio"; event: KaraokeClientBinaryFrame }
  | { source: "stt"; event: KaraokeStreamingSttEvent };

export interface FakeKaraokeTransportResult {
  state: KaraokeSessionState;
  effects: KaraokeSessionEffect[];
  serverEvents: KaraokeServerEvent[];
  audioChunks: KaraokeClientBinaryFrame[];
}

function assertEnvelope(
  state: KaraokeSessionState,
  event: KaraokeTransportEnvelope,
  lastSequence: number | null,
): void {
  const error = validateKaraokeTransportEnvelope({
    attemptId: state.attemptId,
    event,
    lastSequence,
    sessionId: state.sessionId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

function toSessionEvent(state: KaraokeSessionState, event: KaraokeClientEvent): KaraokeSessionEvent | null {
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
    case "line_boundary": {
      const line = state.lines.find((candidate) => candidate.lineId === event.lineId);
      if (
        !line
        || line.lineIndex !== event.lineIndex
        || line.scoredLineIndex !== event.scoredLineIndex
      ) {
        throw new Error(`Invalid karaoke line identity: ${event.lineId}`);
      }
      return { audioTimeMs: event.audioTimeMs, lineId: event.lineId, type: "line_boundary" };
    }
    case "abort":
      return { code: event.code, type: "abort" };
  }
}

function serverEnvelope(state: KaraokeSessionState, sequence: number): KaraokeTransportEnvelope {
  return {
    attemptId: state.attemptId,
    protocolVersion: KARAOKE_TRANSPORT_PROTOCOL_VERSION,
    sequence,
    sessionId: state.sessionId,
  };
}

export function runFakeKaraokeTransport(input: {
  initialState: KaraokeSessionState;
  events: readonly FakeKaraokeTransportInput[];
}): FakeKaraokeTransportResult {
  let state = input.initialState;
  let serverSequence = 0;
  let clientSequence: number | null = null;
  let sttSequence: number | null = null;
  const effects: KaraokeSessionEffect[] = [];
  const serverEvents: KaraokeServerEvent[] = [];
  const audioChunks: KaraokeClientBinaryFrame[] = [];

  const emitEffect = (effect: KaraokeSessionEffect): void => {
    effects.push(effect);
    const envelope = serverEnvelope(state, serverSequence);

    if (effect.type === "emit_line_score") {
      serverEvents.push({ ...envelope, eventId: `evt-${serverSequence}`, result: effect.score, type: "line_score" });
      serverSequence += 1;
    } else if (effect.type === "emit_summary") {
      serverEvents.push({ ...envelope, eventId: `evt-${serverSequence}`, summary: effect.summary, type: "summary" });
      serverSequence += 1;
    }
  };

  for (const inputEvent of input.events) {
    const lastSequence = inputEvent.source === "stt" ? sttSequence : clientSequence;
    assertEnvelope(state, inputEvent.event, lastSequence);
    if (inputEvent.source === "stt") {
      sttSequence = inputEvent.event.sequence;
    } else {
      clientSequence = inputEvent.event.sequence;
    }

    if (inputEvent.source === "audio") {
      audioChunks.push(inputEvent.event);
      continue;
    }

    let sessionEvent: KaraokeSessionEvent;
    if (inputEvent.source === "stt") {
      const sttEvent = inputEvent.event;
      serverEvents.push({
        ...serverEnvelope(state, serverSequence),
        eventId: `evt-${serverSequence}`,
        text: sttEvent.text,
        type: sttEvent.type,
        words: sttEvent.words,
      });
      serverSequence += 1;
      // For stt_final, pass deliveredAtAudioMs as coverageMs so the reducer can
      // advance the watermark without a full commit/ack cycle (test-harness only).
      sessionEvent = sttEvent.type === "stt_final"
        ? { type: "stt_final", words: sttEvent.words, coverageMs: sttEvent.deliveredAtAudioMs }
        : { type: sttEvent.type, words: sttEvent.words };
    } else {
      const translated = toSessionEvent(state, inputEvent.event);
      if (!translated) {
        continue;
      }
      sessionEvent = translated;
    }

    const previousStatus = state.status;
    const reduction = reduceKaraokeSession(state, sessionEvent);
    state = reduction.state;
    for (const effect of reduction.effects) {
      emitEffect(effect);
    }

    if (previousStatus !== "aborted" && state.status === "aborted" && state.errorCode) {
      serverEvents.push({
        ...serverEnvelope(state, serverSequence),
        code: state.errorCode,
        eventId: `evt-${serverSequence}`,
        type: "session_error",
      });
      serverSequence += 1;
    }
  }

  return { audioChunks, effects, serverEvents, state };
}
