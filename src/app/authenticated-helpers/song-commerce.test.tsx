import "@/test/setup-runtime";

import * as React from "react";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, render, renderHook } from "@testing-library/react";

let audio: FakeAudio;
let fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
const originalAudio = globalThis.Audio;
const originalFetch = globalThis.fetch;
const originalCreateObjectUrl = URL.createObjectURL;
const originalResizeObserver = globalThis.ResizeObserver;

class FakeAudio extends EventTarget {
  currentTime = 0;
  duration = 120;
  readyState = 4;
  src = "";

  pause() {}

  async play() {
    this.dispatchEvent(new Event("play"));
  }
}

mock.module("@/lib/api", () => ({
  useApi: () => ({ communities: {} }),
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({ connect: undefined }),
  usePiratePrivyWallets: () => ({ connectedWallets: [] }),
}));

import { useSongPlayback } from "./song-commerce";
import { SongPostContent } from "@/components/compositions/posts/post-card/post-card-song-content";

beforeEach(() => {
  audio = new FakeAudio();
  fetchCalls = [];
  globalThis.Audio = class {
    constructor() {
      return audio;
    }
  } as typeof Audio;
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ input, init });
    return new Response(new Blob(["audio"]), { status: 200 });
  }) as typeof fetch;
  URL.createObjectURL = mock(() => "blob:track_1");
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;
});

afterEach(() => {
  globalThis.Audio = originalAudio;
  globalThis.fetch = originalFetch;
  URL.createObjectURL = originalCreateObjectUrl;
  globalThis.ResizeObserver = originalResizeObserver;
  mock.restore();
});

describe("useSongPlayback", () => {
  test("keeps command callbacks stable while reading refreshed auth state", async () => {
    const hook = renderHook(({ accessToken }: { accessToken: string | null }) => useSongPlayback(accessToken), {
      initialProps: { accessToken: "old-token" },
    });
    const initialController = hook.result.current;
    const descriptor = {
      key: "track_auth_refresh",
      kind: "source" as const,
      requiresAuth: true,
      sourcePath: "/audio/track_auth_refresh",
      title: "Track",
    };

    await act(async () => {
      hook.rerender({ accessToken: "new-token" });
    });
    expect(hook.result.current).toBe(initialController);

    await act(async () => {
      await initialController.playTrack(descriptor);
    });

    expect(fetchCalls[0]?.init).toMatchObject({
      headers: { Authorization: "Bearer new-token" },
    });
  });

  test("publishes progress without changing the controller identity", async () => {
    let projectionCount = 0;
    const hook = renderHook(() => {
      const controller = useSongPlayback(null);
      return React.useMemo(() => {
        projectionCount += 1;
        return controller;
      }, [controller]);
    });
    await act(async () => {
      await hook.result.current.playTrack({
        key: "track_1",
        kind: "source",
        requiresAuth: false,
        sourcePath: "/audio/track_1",
        title: "Track",
      });
    });

    const activeController = hook.result.current;
    const projectionsBeforeProgress = projectionCount;
    const progressStore = activeController.getPlaybackProgressStore("track_1");
    let progressNotifications = 0;
    const unsubscribe = activeController.subscribePlaybackProgress("track_1", () => {
      progressNotifications += 1;
    });

    act(() => {
      audio.currentTime = 2.5;
      audio.dispatchEvent(new Event("timeupdate"));
    });

    expect(hook.result.current).toBe(activeController);
    expect(projectionCount).toBe(projectionsBeforeProgress);
    expect(activeController.getPlaybackProgressStore("track_1")).toBe(progressStore);
    expect(activeController.getPlaybackProgress("track_1")).toEqual({
      durationMs: 120_000,
      progressMs: 2_500,
    });
    expect(progressNotifications).toBe(1);

    unsubscribe();
  });

  test("updates a subscribed song without a parent projection render", () => {
    let progress = { durationMs: 120_000, progressMs: 0 };
    const listeners = new Set<() => void>();
    const view = render(
      <SongPostContent
        content={{
          accessMode: "public",
          durationMs: 120_000,
          onSeek: () => undefined,
          playbackState: "playing",
          progressStore: {
            getSnapshot: () => progress,
            subscribe: (listener) => {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
          },
          title: "Track",
          type: "song",
        }}
      />,
    );

    expect(view.getAllByText("0:00").length).toBeGreaterThan(0);
    act(() => {
      progress = { durationMs: 120_000, progressMs: 2_500 };
      for (const listener of listeners) listener();
    });
    expect(view.getAllByText("0:02").length).toBeGreaterThan(0);
  });
});
