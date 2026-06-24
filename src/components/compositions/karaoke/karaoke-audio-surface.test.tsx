import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import { navigate } from "@/app/router";
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
Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverStub,
});
Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverStub,
});

const lines: KaraokeStageLine[] = [
  {
    endMs: 1200,
    id: "line-1",
    startMs: 0,
    text: "Sing this",
    tokens: [
      {
        endMs: 1200,
        startMs: 0,
        text: "Sing this",
      },
    ],
  },
];

type MediaElementStubPrototype = HTMLElement & {
  load?: () => void;
  pause?: () => void;
  play?: () => Promise<void>;
};

const testOrigin = "https://pirate.test";
function setTestLocation(path: string = "/p/pst_song/karaoke"): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(path, testOrigin),
  });
}

setTestLocation();
const testHistory = {
  forward: () => undefined,
  pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocation(String(url));
    }
  },
  replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocation(String(url));
    }
  },
} as History;
Object.defineProperty(window, "history", {
  configurable: true,
  value: testHistory,
});

const mediaElementPrototype = window.HTMLElement.prototype as MediaElementStubPrototype;
const originalPlay = mediaElementPrototype.play;
const originalPause = mediaElementPrototype.pause;
const originalLoad = mediaElementPrototype.load;
const originalConfirm = window.confirm;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalEvent = globalThis.Event;
const originalHistoryForward = testHistory.forward;
const originalHistoryPushState = testHistory.pushState;
const originalHistoryReplaceState = testHistory.replaceState;
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  setTestLocation();
  mediaElementPrototype.load = () => undefined;
  mediaElementPrototype.play = () => Promise.resolve();
  mediaElementPrototype.pause = () => undefined;
  window.cancelAnimationFrame = () => undefined;
  window.requestAnimationFrame = () => 1;
  window.scrollTo = () => undefined;
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: window.Event,
  });
  testHistory.forward = () => undefined;
  testHistory.pushState = originalHistoryPushState;
  testHistory.replaceState = originalHistoryReplaceState;
});

afterEach(() => {
  cleanup();
  setTestLocation();
  mediaElementPrototype.load = originalLoad;
  mediaElementPrototype.play = originalPlay;
  mediaElementPrototype.pause = originalPause;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.requestAnimationFrame = originalRequestAnimationFrame;
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: originalEvent,
  });
  window.scrollTo = originalScrollTo;
  testHistory.forward = originalHistoryForward;
  testHistory.pushState = originalHistoryPushState;
  testHistory.replaceState = originalHistoryReplaceState;
  window.confirm = originalConfirm;
});

describe("KaraokeAudioSurface", () => {
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

  function renderWithScoring(
    props: Omit<React.ComponentProps<typeof KaraokeAudioSurface>, "scoring">,
    onStart?: () => void,
  ): { view: ReturnType<typeof render>; setStatus: (status: KaraokeScoringStatus) => void } {
    const setStatusRef: { current: ((status: KaraokeScoringStatus) => void) | null } = { current: null };

    function Harness() {
      const [scoringState, setScoringState] = React.useState<KaraokeScoringState>(() => makeScoringState("idle"));
      const controls = React.useMemo<KaraokeScoringControls>(
        () => ({
          abort: () => undefined,
          noteFinish: () => undefined,
          notePause: () => undefined,
          notePlay: () => undefined,
          noteSeek: () => undefined,
          noteTime: () => undefined,
          start: () => onStart?.(),
          stop: () => undefined,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
      );
      const scoring = React.useMemo<UseKaraokeScoringResult>(
        () => ({ controls, enabled: true, state: scoringState }),
        [controls, scoringState],
      );

      React.useEffect(() => {
        setStatusRef.current = (status) => setScoringState(makeScoringState(status));
        return () => { setStatusRef.current = null; };
      }, []);

      return <KaraokeAudioSurface {...props} scoring={scoring} />;
    }

    const view = render(<Harness />);
    return { setStatus: (status) => setStatusRef.current?.(status), view };
  }

  async function startPlayback(
    view: ReturnType<typeof render>,
    setStatus: (status: KaraokeScoringStatus) => void,
  ): Promise<HTMLAudioElement> {
    const audio = view.container.querySelector("audio");
    expect(audio).toBeTruthy();
    let played = false;
    (audio as HTMLAudioElement).play = () => {
      played = true;
      return Promise.resolve();
    };
    fireEvent.canPlay(audio as HTMLAudioElement);

    const startButton = await view.findByText("Start");
    act(() => fireEvent.click(startButton));
    act(() => setStatus("connecting"));
    await waitFor(() => expect(view.getByText("Connecting…")).toBeTruthy());

    act(() => setStatus("active"));
    await waitFor(() => expect(played).toBe(true));

    return audio as HTMLAudioElement;
  }

  function pausePlayback(): void {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    const visEvent = document.createEvent("Event");
    visEvent.initEvent("visibilitychange", false, false);
    fireEvent(document, visEvent);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  }

  test("exits without confirming while playback is idle", () => {
    const exits: string[] = [];
    const confirmCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };

    const view = render(
      <KaraokeAudioSurface
        instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
        lines={lines}
        onExit={() => exits.push("exit")}
        title="Idle Exit"
      />,
    );

    fireEvent.click(view.getByLabelText("Exit karaoke"));
    expect(confirmCalls).toEqual([]);
    expect(exits).toEqual(["exit"]);
  });

  test("confirms before exiting while playback is active", async () => {
    const exits: string[] = [];
    const confirmCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };

    const { view, setStatus } = renderWithScoring(
      {
        instrumentalAudioUrl: "https://cdn.example.test/instrumental.mp3",
        lines: lines,
        onExit: () => exits.push("exit"),
        title: "Confirm Exit",
      },
    );

    await startPlayback(view, setStatus);

    fireEvent.click(view.getByLabelText("Exit karaoke"));
    expect(confirmCalls).toEqual(["Stop karaoke and leave this song?"]);
    expect(exits).toEqual([]);

    window.confirm = () => true;
    fireEvent.click(view.getByLabelText("Exit karaoke"));
    expect(exits).toEqual(["exit"]);
  });

  test("warns on page unload and browser back while playback is active", async () => {
    const confirmCalls: string[] = [];
    const forwardCalls: string[] = [];
    const pauseCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };
    testHistory.forward = () => {
      forwardCalls.push("forward");
    };

    const { view, setStatus } = renderWithScoring(
      {
        instrumentalAudioUrl: "https://cdn.example.test/instrumental.mp3",
        lines: lines,
        title: "Browser Back",
      },
    );

    const audio = await startPlayback(view, setStatus);
    audio.pause = () => {
      pauseCalls.push("pause");
    };

    const beforeUnloadEvent = document.createEvent("Event");
    beforeUnloadEvent.initEvent("beforeunload", false, true);
    fireEvent(window, beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect((beforeUnloadEvent as BeforeUnloadEvent).returnValue).toBe("");

    const popStateEvent = document.createEvent("Event");
    popStateEvent.initEvent("popstate", false, false);
    fireEvent(window, popStateEvent);
    expect(confirmCalls).toEqual(["Stop karaoke and leave this song?"]);
    expect(forwardCalls).toEqual(["forward"]);

    confirmCalls.length = 0;
    forwardCalls.length = 0;
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return true;
    };
    fireEvent(window, popStateEvent);
    expect(confirmCalls).toEqual(["Stop karaoke and leave this song?"]);
    expect(forwardCalls).toEqual([]);
    expect(pauseCalls).toEqual(["pause"]);
  });

  test("removes navigation listeners when playback is paused", async () => {
    const confirmCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };

    const { view, setStatus } = renderWithScoring(
      {
        instrumentalAudioUrl: "https://cdn.example.test/instrumental.mp3",
        lines: lines,
        title: "Paused Guard",
      },
    );

    const audio = await startPlayback(view, setStatus);
    pausePlayback();

    const beforeUnloadEvent = document.createEvent("Event");
    beforeUnloadEvent.initEvent("beforeunload", false, true);
    fireEvent(window, beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);

    const popStateEvent = document.createEvent("Event");
    popStateEvent.initEvent("popstate", false, false);
    fireEvent(window, popStateEvent);
    expect(confirmCalls).toEqual([]);

    act(() => {
      navigate("/popular");
    });
    expect(window.location.pathname).toBe("/popular");
    expect(confirmCalls).toEqual([]);
  });

  test("removes navigation listeners on unmount", async () => {
    const confirmCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };

    const { view, setStatus } = renderWithScoring(
      {
        instrumentalAudioUrl: "https://cdn.example.test/instrumental.mp3",
        lines: lines,
        title: "Unmount Guard",
      },
    );

    await startPlayback(view, setStatus);
    view.unmount();

    const beforeUnloadEvent = document.createEvent("Event");
    beforeUnloadEvent.initEvent("beforeunload", false, true);
    fireEvent(window, beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);

    const popStateEvent = document.createEvent("Event");
    popStateEvent.initEvent("popstate", false, false);
    fireEvent(window, popStateEvent);
    expect(confirmCalls).toEqual([]);

    act(() => {
      navigate("/popular");
    });
    expect(window.location.pathname).toBe("/popular");
    expect(confirmCalls).toEqual([]);
  });

  test("blocks in-app navigation while playback is active when the user cancels", async () => {
    const confirmCalls: string[] = [];
    const pauseCalls: string[] = [];
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return false;
    };

    const { view, setStatus } = renderWithScoring(
      {
        instrumentalAudioUrl: "https://cdn.example.test/instrumental.mp3",
        lines: lines,
        title: "SPA Guard",
      },
    );

    const audio = await startPlayback(view, setStatus);
    audio.pause = () => {
      pauseCalls.push("pause");
    };

    act(() => {
      navigate("/popular");
    });
    expect(confirmCalls).toEqual(["Stop karaoke and leave this song?"]);
    expect(window.location.pathname).toBe("/p/pst_song/karaoke");
    expect(pauseCalls).toEqual([]);

    confirmCalls.length = 0;
    window.confirm = (message?: string) => {
      confirmCalls.push(message ?? "");
      return true;
    };

    act(() => {
      navigate("/popular");
    });
    expect(confirmCalls).toEqual(["Stop karaoke and leave this song?"]);
    expect(window.location.pathname).toBe("/popular");
    expect(pauseCalls).toEqual(["pause"]);
  });

  test("retries a load-time failure before showing the unavailable state", () => {
    let loadCalls = 0;
    mediaElementPrototype.load = () => {
      loadCalls += 1;
    };
    const originalSetTimeout = globalThis.setTimeout;
    // Run the backoff timers synchronously so retries are driven deterministically.
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout;

    try {
      const view = render(
        <KaraokeAudioSurface
          instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
          lines={lines}
          title="Retry"
        />,
      );
      const audio = view.container.querySelector("audio") as HTMLAudioElement;
      expect(audio).toBeTruthy();
      const loadsAfterMount = loadCalls;

      // First load-time failure → retried, not yet surfaced as unavailable.
      act(() => fireEvent.error(audio));
      expect(view.queryByText("Audio unavailable")).toBeNull();
      expect(loadCalls).toBe(loadsAfterMount + 1);

      // Second failure → final retry, still not unavailable.
      act(() => fireEvent.error(audio));
      expect(view.queryByText("Audio unavailable")).toBeNull();
      expect(loadCalls).toBe(loadsAfterMount + 2);

      // Third failure → attempts exhausted, surface the permanent error and stop.
      act(() => fireEvent.error(audio));
      expect(view.getByText("Audio unavailable")).toBeTruthy();
      expect(loadCalls).toBe(loadsAfterMount + 2);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("stops retrying once the instrumental has loaded", () => {
    let loadCalls = 0;
    mediaElementPrototype.load = () => {
      loadCalls += 1;
    };
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout;

    try {
      const view = render(
        <KaraokeAudioSurface
          instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
          lines={lines}
          title="Loaded"
        />,
      );
      const audio = view.container.querySelector("audio") as HTMLAudioElement;
      act(() => fireEvent.canPlay(audio));
      const loadsAfterReady = loadCalls;

      // A post-load error is a mid-playback failure: surface it without retrying.
      act(() => fireEvent.error(audio));
      expect(view.getByText("Audio unavailable")).toBeTruthy();
      expect(loadCalls).toBe(loadsAfterReady);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  test("renders a Sing CTA that triggers sign-in when logged out (no scoring)", () => {
    const signInCalls: string[] = [];

    const view = render(
      <KaraokeAudioSurface
        instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
        lines={lines}
        onRequestSignIn={() => signInCalls.push("sign-in")}
        showSignInCta
        title="Logged Out"
      />,
    );

    fireEvent.click(view.getByText("Sing"));
    expect(signInCalls).toEqual(["sign-in"]);
  });

  test("shows an unavailable message instead of the Sing CTA when auth cannot load", () => {
    const view = render(
      <KaraokeAudioSurface
        instrumentalAudioUrl="https://cdn.example.test/instrumental.mp3"
        lines={lines}
        showSignInCta
        signInUnavailable
        title="Auth Unavailable"
      />,
    );

    expect(view.queryByText("Sing")).toBeNull();
    expect(view.getByText("Sign-in is unavailable right now.")).toBeTruthy();
  });
});
