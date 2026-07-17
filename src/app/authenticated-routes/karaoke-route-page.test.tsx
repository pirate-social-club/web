import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiError } from "@/lib/api/client";

installDomGlobals();
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://pirate.test/"),
});
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

type MediaElementStubPrototype = HTMLElement & {
  load?: () => void;
  pause?: () => void;
};

const mediaElementPrototype = window.HTMLElement.prototype as MediaElementStubPrototype;
const originalLoad = mediaElementPrototype.load;
const originalPause = mediaElementPrototype.pause;

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

type Deferred<T> = {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let reject!: (error: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

function songPost(overrides: {
  community?: string | null;
  presentation?: Record<string, unknown> | null;
  postType?: string;
  title?: string;
} = {}): LocalizedPostResponse {
  const defaultPresentation = {
    cover_art_ref: "https://media.test/cover.jpg",
    instrumental_audio: {
      storage_ref: "/instrumental-fallback.mp3",
    },
    timed_lyrics: {
      raw_lines: [
        {
          end_ms: 1000,
          start_ms: 0,
          text: "Fallback lyric",
        },
      ],
    },
    title: "Fallback Karaoke",
  };

  return {
    post: {
      community: overrides.community ?? "cmt_karaoke",
      id: "pst_song",
      post_type: overrides.postType ?? "song",
      song_title: overrides.title ?? "Fallback Song",
      title: overrides.title ?? "Fallback Post",
    },
    song_presentation: Object.prototype.hasOwnProperty.call(overrides, "presentation")
      ? overrides.presentation
      : defaultPresentation,
  } as unknown as LocalizedPostResponse;
}

const calls: string[] = [];
let sessionValue: { accessToken?: string } | null = { accessToken: "token" };
const sessionListeners = new Set<() => void>();
const notifySessionListeners = () => sessionListeners.forEach((fn) => fn());
let postResult: LocalizedPostResponse = songPost();
let postError: unknown = null;
let publicPostResult: LocalizedPostResponse = songPost();
let publicPostError: unknown = null;
let karaokeResult: unknown = null;
let karaokeError: unknown = new ApiError("not_found", "not found", 404);
let karaokeDeferred: Deferred<unknown> | null = null;
let rewardOfferResult: unknown = null;
let rewardOfferError: unknown = null;

const fakeApi = {
  communities: {
    getPostKaraoke: async () => {
      calls.push("communities.getPostKaraoke");
      throw new Error("community-scoped karaoke payload should not load on the post karaoke route");
    },
  },
  posts: {
    get: async () => {
      calls.push("posts.get");
      if (postError) throw postError;
      return postResult;
    },
  },
  publicPosts: {
    get: async () => {
      calls.push("publicPosts.get");
      if (publicPostError) throw publicPostError;
      return publicPostResult;
    },
    getKaraoke: async () => {
      calls.push("publicPosts.getKaraoke");
      if (karaokeDeferred) {
        return await karaokeDeferred.promise;
      }
      if (karaokeError) throw karaokeError;
      return karaokeResult;
    },
  },
  rewards: {
    getActiveCampaignForSong: async () => {
      calls.push("rewards.getActiveCampaignForSong");
      if (rewardOfferError) throw rewardOfferError;
      return rewardOfferResult;
    },
  },
};

mock.module("@/lib/api", () => ({
  api: fakeApi,
  useApi: () => fakeApi,
}));

mock.module("@/lib/api/session-store", () => ({
  __resetSessionStoreForTests: () => { sessionValue = null; notifySessionListeners(); },
  getAccessToken: () => sessionValue?.accessToken ?? null,
  getSessionAccessTokenExpiryMs: () => null,
  setSession: (response: { access_token?: string } | null) => {
    sessionValue = response?.access_token ? { accessToken: response.access_token } : null;
    notifySessionListeners();
    return response;
  },
  useSession: () => React.useSyncExternalStore(
    (listener: () => void) => { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; },
    () => sessionValue,
    () => null,
  ),
}));

mock.module("@/hooks/use-route-content-locale", () => ({
  useRouteContentLocale: () => "en",
}));

const { KaraokeRoutePage } = await import("./karaoke-route");

beforeEach(() => {
  mediaElementPrototype.load = () => undefined;
  mediaElementPrototype.pause = () => undefined;
  calls.length = 0;
  sessionValue = { accessToken: "token" };
  postResult = songPost();
  postError = null;
  publicPostResult = songPost();
  publicPostError = null;
  karaokeResult = null;
  karaokeError = new ApiError("not_found", "not found", 404);
  karaokeDeferred = null;
  rewardOfferResult = null;
  rewardOfferError = null;
});

afterEach(() => {
  cleanup();
  mediaElementPrototype.load = originalLoad;
  mediaElementPrototype.pause = originalPause;
});

describe("KaraokeRoutePage", () => {
  test("uses the dedicated karaoke payload before post metadata fallback", async () => {
    karaokeError = null;
    karaokeResult = {
      instrumental_audio_url: "https://cdn.example.test/api-instrumental.mp3",
      raw_lines: [
        {
          end_ms: 1400,
          start_ms: 0,
          text: "API lyric",
        },
      ],
      title: "API Karaoke",
    };

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.container.querySelector('[aria-label="API Karaoke"]')).toBeTruthy());
    expect(view.container.querySelector('[aria-label="API Karaoke"]')).toBeTruthy();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toBe("https://cdn.example.test/api-instrumental.mp3");
    });
    expect(calls).toEqual([
      "posts.get",
      "publicPosts.getKaraoke",
      "rewards.getActiveCampaignForSong",
    ]);
  });

  test("uses the dedicated karaoke payload for ref-only post metadata", async () => {
    postResult = songPost({
      presentation: {
        alignment_status: "completed",
        cover_art_ref: "https://media.test/ref-cover.jpg",
        instrumental_audio: {
          storage_ref: "/ref-only-instrumental.mp3",
        },
        timed_lyrics_ref: "https://lyrics.test/ref-only-song.json",
        title: "Ref Only Fallback",
      },
    });
    karaokeError = null;
    karaokeResult = {
      instrumental_audio_url: "https://cdn.example.test/ref-api-instrumental.mp3",
      raw_lines: [
        {
          end_ms: 1600,
          start_ms: 0,
          text: "API ref lyric",
        },
      ],
      title: "API Ref Karaoke",
    };

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.container.querySelector('[aria-label="API Ref Karaoke"]')).toBeTruthy());
    expect(view.container.querySelector('[aria-label="Ref Only Fallback"]')).toBeNull();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toBe("https://cdn.example.test/ref-api-instrumental.mp3");
    });
    expect(calls).toEqual([
      "posts.get",
      "publicPosts.getKaraoke",
      "rewards.getActiveCampaignForSong",
    ]);
  });

  test("falls back to post metadata when the dedicated payload is missing", async () => {
    karaokeError = new ApiError("not_found", "not found", 404);

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.container.querySelector('[aria-label="Fallback Karaoke"]')).toBeTruthy());
    expect(view.container.querySelector('[aria-label="Fallback Karaoke"]')).toBeTruthy();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toContain("/instrumental-fallback.mp3");
    });
  });

  test("does not repeat the reward offer inside the karaoke surface", async () => {
    rewardOfferResult = {
      chain_id: 84532,
      daily_reward_cents: 100,
      eligible_activity: "karaoke",
      ends_at: Date.now() + 86_400_000,
      min_score_bps: 7_000,
    };

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(calls).toContain("rewards.getActiveCampaignForSong"));
    await waitFor(() => expect(view.container.querySelector('[aria-label="Fallback Karaoke"]')).toBeTruthy());
    expect(view.queryByText("Reward")).toBeNull();
    expect(view.queryByText(/testnet USDC/)).toBeNull();
    expect(view.queryByText(/Score at least 70%/)).toBeNull();
  });

  test("blocks with payload-problem copy when the dedicated payload is unusable", async () => {
    karaokeError = null;
    karaokeResult = {
      instrumental_audio_url: "https://cdn.example.test/api-instrumental.mp3",
      raw_lines: [],
    };
    postResult = songPost({ presentation: null });

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => {
      expect(view.getByText("Karaoke data was returned but did not include usable timed lyrics and instrumental audio.")).toBeTruthy();
    });
  });

  test("blocks when neither endpoint can provide karaoke data", async () => {
    karaokeError = new ApiError("not_found", "not found", 404);
    postResult = songPost({
      presentation: {
        alignment_status: "completed",
      },
    });

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => {
      expect(view.getByText("This song does not have an instrumental track for karaoke.")).toBeTruthy();
    });
  });

  test("shows errors from non-404 karaoke payload failures", async () => {
    karaokeError = new Error("upstream unavailable");

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => {
      expect(view.getByText("upstream unavailable")).toBeTruthy();
    });
  });

  test("falls back to public post load after auth errors", async () => {
    postError = new ApiError("auth_error", "auth expired", 401);
    publicPostResult = songPost({
      presentation: {
        instrumental_audio: {
          storage_ref: "/public-instrumental.mp3",
        },
        timed_lyrics: {
          raw_lines: [{ end_ms: 1000, start_ms: 0, text: "Public lyric" }],
        },
        title: "Public Karaoke",
      },
    });

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.container.querySelector('[aria-label="Public Karaoke"]')).toBeTruthy());
    expect(view.container.querySelector('[aria-label="Public Karaoke"]')).toBeTruthy();
    expect(calls[0]).toBe("posts.get");
    expect(calls).toContain("publicPosts.get");
    expect(calls).toContain("publicPosts.getKaraoke");
  });

  test("does not finish rendering after unmounting during payload load", async () => {
    karaokeDeferred = deferred();

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(calls).toEqual([
      "posts.get",
      "publicPosts.getKaraoke",
      "rewards.getActiveCampaignForSong",
    ]));
    view.unmount();
    karaokeDeferred.resolve({
      instrumental_audio_url: "https://cdn.example.test/late.mp3",
      raw_lines: [{ end_ms: 1000, start_ms: 0, text: "Late lyric" }],
      title: "Late Karaoke",
    });

    await Promise.resolve();
    expect(view.queryByText("Late Karaoke")).toBeNull();
  });
});
