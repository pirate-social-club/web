import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiClient, ApiError } from "@/lib/api/client";

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
let sessionValue: {
  accessToken: string;
  onboarding?: unknown;
  profile?: unknown;
  user?: unknown;
  walletAttachments?: unknown[];
} | null = { accessToken: "token" };
let postResult: LocalizedPostResponse = songPost();
let postError: unknown = null;
let publicPostResult: LocalizedPostResponse = songPost();
let publicPostError: unknown = null;
let karaokeResult: unknown = null;
let karaokeError: unknown = new ApiError("not_found", "not found", 404);
let karaokeDeferred: Deferred<unknown> | null = null;
let privyConnectCalls = 0;

const fakeApi = new ApiClient({
  baseUrl: "https://api.test",
  getToken: () => sessionValue?.accessToken ?? null,
});

fakeApi.communities.getPostKaraoke = async () => {
  calls.push("communities.getPostKaraoke");
  if (karaokeDeferred) {
    return await karaokeDeferred.promise as never;
  }
  if (karaokeError) throw karaokeError;
  return karaokeResult as never;
};
fakeApi.posts.get = async () => {
  calls.push("posts.get");
  if (postError) throw postError;
  return postResult;
};
fakeApi.publicPosts.get = async () => {
  calls.push("publicPosts.get");
  if (publicPostError) throw publicPostError;
  return publicPostResult;
};

mock.module("@/lib/api", () => ({
  ApiProvider: ({ children }: { children: React.ReactNode }) => children,
  api: fakeApi,
  useApi: () => fakeApi,
  useSessionRevalidation: () => ({ revalidate: async () => {}, revalidated: null }),
}));

mock.module("@/lib/api/session-store", () => ({
  __resetSessionStoreForTests: () => {
    sessionValue = null;
  },
  clearSession: () => {
    sessionValue = null;
  },
  getAccessToken: () => sessionValue?.accessToken ?? null,
  getStoredSession: () => sessionValue,
  setSession: (response: {
    access_token: string;
    onboarding?: unknown;
    profile?: unknown;
    user?: unknown;
    wallet_attachments?: unknown[];
  }) => {
    sessionValue = {
      accessToken: response.access_token,
      onboarding: response.onboarding,
      profile: response.profile,
      user: response.user,
      walletAttachments: response.wallet_attachments,
    };
    return sessionValue;
  },
  updateSessionOnboarding: () => {},
  updateSessionProfile: () => {},
  updateSessionUser: () => {},
  useSession: () => sessionValue,
  useSessionClearInProgress: () => false,
}));

mock.module("@/hooks/use-client-hydrated", () => ({
  useClientHydrated: () => true,
}));

mock.module("@/components/auth/privy-provider", () => ({
  usePiratePrivyRuntime: () => ({
    busy: false,
    configured: true,
    connect: () => {
      privyConnectCalls += 1;
    },
    loadError: null,
    loaded: true,
  }),
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
  privyConnectCalls = 0;
});

afterEach(() => {
  cleanup();
  mediaElementPrototype.load = originalLoad;
  mediaElementPrototype.pause = originalPause;
});

describe("KaraokeRoutePage", () => {
  test("requires authentication before loading karaoke data", async () => {
    sessionValue = null;
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

    await waitFor(() => expect(view.getByText("Sign in to use karaoke")).toBeTruthy());
    expect(view.queryByText("Public Karaoke")).toBeNull();
    expect(calls).toEqual([]);
  });

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

    await waitFor(() => expect(view.getByText("API Karaoke")).toBeTruthy());
    expect(view.getByText("API Karaoke")).toBeTruthy();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toBe("https://cdn.example.test/api-instrumental.mp3");
    });
    expect(calls).toEqual(["posts.get", "communities.getPostKaraoke"]);
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

    await waitFor(() => expect(view.getByText("API Ref Karaoke")).toBeTruthy());
    expect(view.queryByText("Ref Only Fallback")).toBeNull();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toBe("https://cdn.example.test/ref-api-instrumental.mp3");
    });
    expect(calls).toEqual(["posts.get", "communities.getPostKaraoke"]);
  });

  test("falls back to post metadata when the dedicated payload is missing", async () => {
    karaokeError = new ApiError("not_found", "not found", 404);

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Fallback Karaoke")).toBeTruthy());
    expect(view.getByText("Fallback Karaoke")).toBeTruthy();
    await waitFor(() => {
      expect((view.container.querySelector("audio") as HTMLAudioElement | null)?.src).toContain("/instrumental-fallback.mp3");
    });
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

  test("does not fall back to public post load after auth errors", async () => {
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

    await waitFor(() => expect(view.getByText("Sign in to use karaoke")).toBeTruthy());
    expect(view.queryByText("Public Karaoke")).toBeNull();
    expect(calls).toEqual(["posts.get"]);
  });

  test("does not finish rendering after unmounting during payload load", async () => {
    karaokeDeferred = deferred();

    const view = render(<KaraokeRoutePage postId="pst_song" />);

    await waitFor(() => expect(calls).toEqual(["posts.get", "communities.getPostKaraoke"]));
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
