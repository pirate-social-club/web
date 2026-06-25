import { describe, expect, test } from "bun:test";

import {
  createKaraokeSessionState,
  KARAOKE_TRANSPORT_PROTOCOL_VERSION,
  type KaraokeClientEvent,
  type KaraokeRecognizedWord,
  type KaraokeStreamingSttEvent,
  type ScorableKaraokeLine,
} from "@pirate/karaoke-runtime";

import {
  runFakeKaraokeTransport,
  type FakeKaraokeTransportInput,
} from "./karaoke-session-test-harness";

const lines = [
  {
    endMs: 1000,
    lineId: "chorus-1",
    lineIndex: 0,
    scoredLineIndex: 0,
    startMs: 0,
    text: "hold on",
    words: [
      { endMs: 400, startMs: 0, text: "hold" },
      { endMs: 900, startMs: 500, text: "on" },
    ],
  },
  {
    endMs: 3000,
    lineId: "verse-1",
    lineIndex: 1,
    scoredLineIndex: 1,
    startMs: 1800,
    text: "catch fire",
    words: [
      { endMs: 2300, startMs: 1800, text: "catch" },
      { endMs: 2900, startMs: 2400, text: "fire" },
    ],
  },
  {
    endMs: 5000,
    lineId: "chorus-2",
    lineIndex: 2,
    scoredLineIndex: 2,
    startMs: 4000,
    text: "hold on",
    words: [
      { endMs: 4400, startMs: 4000, text: "hold" },
      { endMs: 4900, startMs: 4500, text: "on" },
    ],
  },
] satisfies ScorableKaraokeLine[];

function words(...values: Array<[string, number, number, number?]>): KaraokeRecognizedWord[] {
  return values.map(([text, startMs, endMs, confidence = 0.9]) => ({
    confidence,
    endMs,
    startMs,
    text,
  }));
}

function client(sequence: number, event: Omit<KaraokeClientEvent, "attemptId" | "protocolVersion" | "sequence" | "sessionId">): FakeKaraokeTransportInput {
  return {
    event: {
      ...event,
      attemptId: "attempt-1",
      protocolVersion: KARAOKE_TRANSPORT_PROTOCOL_VERSION,
      sequence,
      sessionId: "session-1",
    } as KaraokeClientEvent,
    source: "client",
  };
}

function stt(sequence: number, event: Omit<KaraokeStreamingSttEvent, "attemptId" | "protocolVersion" | "sequence" | "sessionId">): FakeKaraokeTransportInput {
  return {
    event: {
      ...event,
      attemptId: "attempt-1",
      protocolVersion: KARAOKE_TRANSPORT_PROTOCOL_VERSION,
      sequence,
      sessionId: "session-1",
    } as KaraokeStreamingSttEvent,
    source: "stt",
  };
}

describe("fake karaoke transport", () => {
  test("runs a full scored take with pause, seek, STT revisions, and repeated chorus lines", () => {
    const result = runFakeKaraokeTransport({
      events: [
        client(0, { postId: "post-1", startedAtAudioMs: 0, type: "start" }),
        stt(0, { deliveredAtAudioMs: 800, text: "hold", type: "stt_partial", words: words(["hold", 0, 400, 0.4]) }),
        stt(1, { deliveredAtAudioMs: 1100, text: "hold on", type: "stt_final", words: words(["hold", 0, 400, 0.95], ["on", 500, 900]) }),
        client(1, { audioTimeMs: 1100, lineId: "chorus-1", lineIndex: 0, scoredLineIndex: 0, type: "line_boundary" }),
        client(2, { audioTimeMs: 2000, type: "pause" }),
        client(3, { audioTimeMs: 2000, type: "resume" }),
        stt(2, { deliveredAtAudioMs: 3100, text: "catch fire", type: "stt_final", words: words(["catch", 1800, 2300], ["fire", 2400, 2900]) }),
        client(4, { audioTimeMs: 3100, lineId: "verse-1", lineIndex: 1, scoredLineIndex: 1, type: "line_boundary" }),
        client(5, { audioTimeMs: 1500, type: "seek" }),
        stt(3, { deliveredAtAudioMs: 3100, text: "catch fire", type: "stt_final", words: words(["catch", 1800, 2300, 0.96], ["fire", 2400, 2900, 0.96]) }),
        client(6, { audioTimeMs: 3100, lineId: "verse-1", lineIndex: 1, scoredLineIndex: 1, type: "line_boundary" }),
        stt(4, { deliveredAtAudioMs: 5100, text: "hold on", type: "stt_final", words: words(["hold", 4000, 4400], ["on", 4500, 4900]) }),
        client(7, { audioTimeMs: 5100, lineId: "chorus-2", lineIndex: 2, scoredLineIndex: 2, type: "line_boundary" }),
        client(8, { audioTimeMs: 5200, type: "finish" }),
      ],
      initialState: createKaraokeSessionState({
        attemptId: "attempt-1",
        lines,
        scoringPolicy: {
          kind: "enabled",
          model: "fake-streaming-model",
          provider: "fake",
          retention: "not_stored",
        },
        sessionId: "session-1",
      }),
    });

    expect(result.state.status).toBe("finalized");
    expect(result.state.summary?.lineCount).toBe(3);
    expect(result.state.summary?.scoredLineCount).toBe(3);
    expect(result.state.summary?.noRecognitionLineCount).toBe(0);
    expect(result.state.recognizedWords.filter((word) => word.text === "hold")).toHaveLength(2);
    expect(result.serverEvents.filter((event) => event.type === "line_score").map((event) => event.result.lineId)).toEqual([
      "chorus-1",
      "verse-1",
      "verse-1",
      "chorus-2",
    ]);
    expect(result.serverEvents.at(-1)?.type).toBe("summary");
    expect(result.effects.map((effect) => effect.type)).toContain("pause_audio_stream");
    expect(result.effects.map((effect) => effect.type)).toContain("resume_audio_stream");
    expect(result.effects.map((effect) => effect.type)).toContain("release_line_assignments");
  });

  test("rejects events for another session attempt", () => {
    const initialState = createKaraokeSessionState({
      attemptId: "attempt-1",
      lines,
      scoringPolicy: { kind: "disabled" },
      sessionId: "session-1",
    });

    expect(() => runFakeKaraokeTransport({
      events: [{
        event: {
          attemptId: "attempt-other",
          postId: "post-1",
          protocolVersion: KARAOKE_TRANSPORT_PROTOCOL_VERSION,
          sequence: 0,
          sessionId: "session-1",
          startedAtAudioMs: 0,
          type: "start",
        },
        source: "client",
      }],
      initialState,
    })).toThrow("does not belong to this session attempt");
  });

  test("replays the same event script deterministically", () => {
    const initialState = createKaraokeSessionState({
      attemptId: "attempt-1",
      lines,
      scoringPolicy: {
        kind: "enabled",
        model: "fake-streaming-model",
        provider: "fake",
        retention: "not_stored",
      },
      sessionId: "session-1",
    });
    const events = [
      client(0, { postId: "post-1", startedAtAudioMs: 0, type: "start" }),
      stt(0, { deliveredAtAudioMs: 1100, text: "hold on", type: "stt_final", words: words(["hold", 0, 400], ["on", 500, 900]) }),
      client(1, { audioTimeMs: 1100, lineId: "chorus-1", lineIndex: 0, scoredLineIndex: 0, type: "line_boundary" }),
      client(2, { audioTimeMs: 5200, type: "finish" }),
    ] satisfies FakeKaraokeTransportInput[];

    const first = runFakeKaraokeTransport({ events, initialState });
    const second = runFakeKaraokeTransport({ events, initialState });

    expect(second.state).toEqual(first.state);
    expect(second.effects).toEqual(first.effects);
    expect(second.serverEvents).toEqual(first.serverEvents);
  });
});
