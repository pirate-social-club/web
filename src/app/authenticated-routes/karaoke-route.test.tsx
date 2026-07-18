import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";

import type { LocalizedPostResponse, SongKaraokePayload } from "@pirate/api-contracts";

import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { __resetSessionStoreForTests, setSession } from "@/lib/api/session-store";
import { installDomGlobals } from "@/test/setup-dom";

const { mock } = await import("bun:test") as unknown as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};

// Inject a controllable Privy runtime so the logged-out "Sing" CTA has a real
// connect() to call. Re-export the rest of the module untouched.
const realPrivy = await import("@/components/auth/privy-provider");
let connectCalls = 0;
let privyRuntime = {
  busy: false,
  configured: true,
  connect: () => {
    connectCalls += 1;
  },
  connectedWallets: [],
  loadError: null,
  loaded: true,
  privyAuthenticated: false,
  privyReady: true,
  reconnectEthereumWallet: null,
  sendSponsoredIntent: null,
  walletSyncMounted: false,
  walletsReady: false,
};
mock.module("@/components/auth/privy-provider", () => ({
  ...realPrivy,
  usePiratePrivyRuntime: () => privyRuntime,
}));

const { KaraokeRoutePage } = await import("./karaoke-route");

installDomGlobals();

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ResizeObserverStub });
Object.defineProperty(window, "ResizeObserver", { configurable: true, value: ResizeObserverStub });

const testOrigin = "https://pirate.test";
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("/p/pst_song/karaoke", testOrigin),
});
// useRouteContentLocale spreads navigator.languages; the bare test DOM leaves it
// undefined, so wrap navigator to supply a value and keep the route from throwing.
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: new Proxy(globalThis.navigator, {
    get(target, prop) {
      if (prop === "languages") return ["en"];
      if (prop === "language") return "en";
      return Reflect.get(target, prop);
    },
  }),
});

type MediaElementStubPrototype = HTMLElement & {
  load?: () => void;
  pause?: () => void;
  play?: () => Promise<void>;
};
const mediaElementPrototype = window.HTMLElement.prototype as MediaElementStubPrototype;
const originalLoad = mediaElementPrototype.load;
const originalPlay = mediaElementPrototype.play;
const originalPause = mediaElementPrototype.pause;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
const originalScrollTo = window.scrollTo;

const POST_ID = "pst_song";
const COMMUNITY_ID = "cmt_test";

function buildPost(): LocalizedPostResponse {
  return {
    post: {
      id: POST_ID,
      object: "post",
      post: POST_ID,
      community: COMMUNITY_ID,
      post_type: "song",
      title: "Test Song",
      song_title: "Test Song",
      status: "published",
      visibility: "public",
    },
    song_presentation: { title: "Test Song", cover_art_ref: null },
  } as unknown as LocalizedPostResponse;
}

function buildKaraoke(): SongKaraokePayload {
  return {
    instrumental_audio_url: "https://cdn.example.test/instrumental.mp3",
    karaoke_lines: [
      {
        start_ms: 0,
        end_ms: 1200,
        text: "Sing this line",
        words: [{ start_ms: 0, end_ms: 1200, text: "Sing this line" }],
      },
    ],
  } as unknown as SongKaraokePayload;
}

interface ApiCallLog {
  authGet: string[];
  publicGet: string[];
  karaoke: string[];
}

function installApiSpies(log: ApiCallLog, authGetBehavior: (postId: string) => Promise<LocalizedPostResponse>): void {
  (api.posts as unknown as { get: (id: string, opts?: unknown) => Promise<LocalizedPostResponse> }).get = async (id) => {
    log.authGet.push(id);
    return authGetBehavior(id);
  };
  (api.publicPosts as unknown as { get: (id: string, opts?: unknown) => Promise<LocalizedPostResponse> }).get = async (id) => {
    log.publicGet.push(id);
    return buildPost();
  };
  (api.publicPosts as unknown as {
    getKaraoke: (postId: string, opts?: unknown) => Promise<SongKaraokePayload>;
  }).getKaraoke = async (postId) => {
    log.karaoke.push(postId);
    return buildKaraoke();
  };
  (api.communities as unknown as {
    getPostKaraoke: (communityId: string, postId: string, opts?: unknown) => Promise<SongKaraokePayload>;
  }).getPostKaraoke = async () => {
    throw new Error("community-scoped karaoke payload should not load on the post karaoke route");
  };
  api.rewards.getActiveCampaignForSong = async () => {
    throw new ApiError("not_found", "not found", 404);
  };
}

const originalPostsGet = api.posts.get;
const originalPublicPostsGet = api.publicPosts.get;
const originalPublicPostsGetKaraoke = api.publicPosts.getKaraoke;
const originalGetPostKaraoke = api.communities.getPostKaraoke;
const originalGetActiveCampaignForSong = api.rewards.getActiveCampaignForSong;

beforeEach(() => {
  __resetSessionStoreForTests();
  connectCalls = 0;
  privyRuntime = {
    busy: false,
    configured: true,
    connect: () => {
      connectCalls += 1;
    },
    connectedWallets: [],
    loadError: null,
    loaded: true,
    privyAuthenticated: false,
    privyReady: true,
    reconnectEthereumWallet: null,
    sendSponsoredIntent: null,
    walletSyncMounted: false,
    walletsReady: false,
  };
  mediaElementPrototype.load = () => undefined;
  mediaElementPrototype.play = () => Promise.resolve();
  mediaElementPrototype.pause = () => undefined;
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => undefined;
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  __resetSessionStoreForTests();
  api.posts.get = originalPostsGet;
  api.publicPosts.get = originalPublicPostsGet;
  api.publicPosts.getKaraoke = originalPublicPostsGetKaraoke;
  api.communities.getPostKaraoke = originalGetPostKaraoke;
  api.rewards.getActiveCampaignForSong = originalGetActiveCampaignForSong;
  mediaElementPrototype.load = originalLoad;
  mediaElementPrototype.play = originalPlay;
  mediaElementPrototype.pause = originalPause;
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
  window.scrollTo = originalScrollTo;
});

function signIn(): void {
  setSession({
    access_token: "tok_test",
    user: { id: "usr_test", object: "user" },
    profile: null,
    onboarding: null,
    wallet_attachments: [],
  } as unknown as Parameters<typeof setSession>[0]);
}

describe("KaraokeRoutePage", () => {
  test("logged-out viewer loads karaoke via the public read", async () => {
    const log: ApiCallLog = { authGet: [], publicGet: [], karaoke: [] };
    installApiSpies(log, async () => {
      throw new Error("authenticated read should not run for a logged-out viewer");
    });

    const view = render(<KaraokeRoutePage postId={POST_ID} />);

    await waitFor(() => expect(log.karaoke).toContain(POST_ID));
    // No authenticated read attempted; the public read served the post.
    expect(log.authGet).toEqual([]);
    expect(log.publicGet).toContain(POST_ID);
    // Reached the player, not the "Community not found"/blocked message.
    expect(view.queryByText("Open post")).toBeNull();
    expect(view.container.querySelector("audio")).toBeTruthy();
  });

  test("logged-out viewer gets a Sing CTA that opens auth instead of a dead-end", async () => {
    const log: ApiCallLog = { authGet: [], publicGet: [], karaoke: [] };
    installApiSpies(log, async () => {
      throw new Error("authenticated read should not run for a logged-out viewer");
    });

    const view = render(<KaraokeRoutePage postId={POST_ID} />);

    const singButton = await waitFor(() => view.getByText("Log in to karaoke"));
    fireEvent.click(singButton);
    expect(connectCalls).toBe(1);
  });

  test("Sing CTA is replaced by the scoring Start panel once a session is established", async () => {
    const log: ApiCallLog = { authGet: [], publicGet: [], karaoke: [] };
    // Authenticated read succeeds post-sign-in so the route reaches a scorable,
    // community-backed payload (the precondition for scoring to enable).
    installApiSpies(log, async () => buildPost());

    const view = render(<KaraokeRoutePage postId={POST_ID} />);

    // Logged out: the Sing CTA stands in for the (disabled) scoring panel.
    await waitFor(() => expect(view.getByText("Log in to karaoke")).toBeTruthy());
    expect(view.queryByText("Start")).toBeNull();

    // Establishing a session flips needsAuth off and enables scoring.
    act(() => {
      signIn();
    });

    // The same footer slot now hosts the scoring Start panel; the CTA is gone.
    await waitFor(() => expect(view.getByText("Start")).toBeTruthy());
    expect(view.queryByText("Log in to karaoke")).toBeNull();
  });

  test("logged-in non-member falls back from an authenticated 404 to the public read", async () => {
    signIn();
    const log: ApiCallLog = { authGet: [], publicGet: [], karaoke: [] };
    installApiSpies(log, async () => {
      // Authenticated post reads require community membership; non-members get
      // not_found: Community not found.
      throw new ApiError("not_found", "Community not found", 404);
    });

    const view = render(<KaraokeRoutePage postId={POST_ID} />);

    await waitFor(() => expect(log.karaoke).toContain(POST_ID));
    // Authenticated read attempted first, then fell back to the public read.
    expect(log.authGet).toContain(POST_ID);
    expect(log.publicGet).toContain(POST_ID);
    // The 404 must NOT surface as a dead-end error page.
    expect(view.queryByText("Open post")).toBeNull();
    expect(view.container.querySelector("audio")).toBeTruthy();
  });
});
