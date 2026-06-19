import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

import { KaraokeAudioSurface } from "./karaoke-audio-surface";
import type { KaraokeStageLine } from "./karaoke-lyric-stage";
import type { KaraokeScoringState, KaraokeScoringStatus } from "./scoring/karaoke-scoring-controller";
import type { KaraokeScoringControls, UseKaraokeScoringResult } from "./scoring/use-karaoke-scoring-session";

installDomGlobals();
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ResizeObserverStub });
Object.defineProperty(window, "ResizeObserver", { configurable: true, value: ResizeObserverStub });

const lines: KaraokeStageLine[] = [
  {
    endMs: 1200,
    id: "line-1",
    startMs: 0,
    text: "Sing this",
    tokens: [{ endMs: 1200, startMs: 0, text: "Sing this" }],
  },
];

type MediaElementStubPrototype = HTMLElement & {
  load?: () => void;
  pause?: () => void;
  play?: () => Promise<void>;
};

const mediaElementPrototype = window.HTMLElement.prototype as MediaElementStubPrototype;
const originalPlay = mediaElementPrototype.play;
const originalPause = mediaElementPrototype.pause;
const originalLoad = mediaElementPrototype.load;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

function makeScoringState(status: KaraokeScoringStatus): KaraokeScoringState {
  return {
    error: null,
    latestLineId: null,
    lineScores: [],
    micError: null,
    partialTranscript: "",
    phase: status === "active" ? "live" : "idle",
    status,
    summary: null,
  };
}

interface HarnessProps {
  initialStatus: KaraokeScoringStatus;
  onStart: () => void;
  setStatusRef: React.MutableRefObject<((status: KaraokeScoringStatus) => void) | null>;
}

function ScoringHarness({ initialStatus, onStart, setStatusRef }: HarnessProps) {
  const [scoringState, setScoringState] = React.useState<KaraokeScoringState>(() => makeScoringState(initialStatus));
  const controls = React.useMemo<KaraokeScoringControls>(
    () => ({
      abort: () => undefined,
      noteFinish: () => undefined,
      notePause: () => undefined,
      notePlay: () => undefined,
      noteSeek: () => undefined,
      noteTime: () => undefined,
      start: () => onStart(),
      stop: () => undefined,
    }),
    [onStart],
  );
  const scoring = React.useMemo<UseKaraokeScoringResult>(
    () => ({ controls, enabled: true, state: scoringState }),
    [controls, scoringState],
  );

  React.useEffect(() => {
    setStatusRef.current = (status) => setScoringState(makeScoringState(status));
    return () => {
      setStatusRef.current = null;
    };
  }, [setStatusRef]);

  return (
    <KaraokeAudioSurface
      instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
      lines={lines}
      scoring={scoring}
      title="Gated Playback"
    />
  );
}

describe("KaraokeAudioSurface scoring playback gating", () => {
  const playCalls: number[] = [];

  beforeEach(() => {
    mediaElementPrototype.load = () => undefined;
    mediaElementPrototype.pause = () => undefined;
    mediaElementPrototype.play = () => {
      playCalls.push(playCalls.length + 1);
      return Promise.resolve();
    };
    window.cancelAnimationFrame = () => undefined;
    window.requestAnimationFrame = () => 1;
    playCalls.length = 0;
  });

  afterEach(() => {
    cleanup();
    mediaElementPrototype.load = originalLoad;
    mediaElementPrototype.play = originalPlay;
    mediaElementPrototype.pause = originalPause;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });

  test("does not start the instrumental while the mic is connecting; plays once listening", async () => {
    const startCalls: string[] = [];
    const setScoringStatus: { current: ((status: KaraokeScoringStatus) => void) | null } = { current: null };

    function onStart() {
      startCalls.push("start");
      setScoringStatus.current?.("connecting");
    }

    const view = render(<ScoringHarness initialStatus="idle" onStart={onStart} setStatusRef={setScoringStatus} />);
    const audio = view.container.querySelector("audio") as HTMLAudioElement;
    expect(audio).toBeTruthy();
    audio.play = () => {
      playCalls.push(playCalls.length + 1);
      return Promise.resolve();
    };

    fireEvent.canPlay(audio);
    const startButton = await view.findByText("Score my singing");
    expect(startButton.closest("button")?.disabled).toBe(false);

    fireEvent.click(startButton);
    expect(startCalls).toEqual(["start"]);

    await waitFor(() => expect(view.getByText("Connecting…")).toBeTruthy());
    // Mic is still connecting — the instrumental must NOT have started.
    expect(playCalls).toEqual([]);
    expect(view.queryByLabelText("Pause")).toBeNull();

    // Mic goes live (Listening) — now the instrumental starts.
    act(() => setScoringStatus.current?.("active"));
    await waitFor(() => expect(view.getByLabelText("Pause")).toBeTruthy());
    expect(playCalls.length).toBe(1);
  });

  test("does not play if the mic fails before going live", async () => {
    const setScoringStatus: { current: ((status: KaraokeScoringStatus) => void) | null } = { current: null };

    function onStart() {
      setScoringStatus.current?.("requesting-mic");
    }

    const view = render(<ScoringHarness initialStatus="idle" onStart={onStart} setStatusRef={setScoringStatus} />);
    const audio = view.container.querySelector("audio") as HTMLAudioElement;
    audio.play = () => {
      playCalls.push(playCalls.length + 1);
      return Promise.resolve();
    };

    fireEvent.canPlay(audio);
    const startButton = await view.findByText("Score my singing");
    fireEvent.click(startButton);

    act(() => setScoringStatus.current?.("error"));
    await waitFor(() => expect(view.getByText(/Try again/)).toBeTruthy());
    expect(playCalls).toEqual([]);
  });
});
