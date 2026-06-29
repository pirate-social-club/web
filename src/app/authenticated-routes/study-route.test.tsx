import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiClient, ApiError } from "@/lib/api/client";
import type { SongStudyPayload } from "@/lib/api/client-api-types";

installDomGlobals();
Object.defineProperty(window, "location", {
  configurable: true,
  value: new URL("https://pirate.test/"),
});

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

function songPost(overrides: {
  community?: string | null;
  postType?: string;
  title?: string;
} = {}): LocalizedPostResponse {
  return {
    post: {
      community: overrides.community ?? "cmt_study",
      id: "pst_song",
      post_type: overrides.postType ?? "song",
      song_title: overrides.title ?? "Study Song",
      title: overrides.title ?? "Study Post",
    },
    song_presentation: {
      cover_art_ref: "https://media.test/cover.jpg",
      title: overrides.title ?? "Study Song",
    },
  } as unknown as LocalizedPostResponse;
}

function readyStudyPayload(overrides: Partial<SongStudyPayload> = {}): SongStudyPayload {
  return {
    access: "ready",
    artwork_src: "https://media.test/cover.jpg",
    artist_name: "Study Artist",
    exercise_count: 1,
    exercises: [
      {
        id: "ex_say",
        line_id: "line_1",
        line_index: 0,
        max_attempts: 2,
        prompt_text: "Say it back",
        reference_text: "Hola mundo",
        translation_text: "Hello world",
        type: "say_it_back",
      },
    ],
    generated_at: "2026-06-29T00:00:00.000Z",
    object: "song_study_payload",
    source_language: "es",
    study_pack_version: 1,
    target_language: "en",
    title: "Study Song",
    ...overrides,
  };
}

const calls: string[] = [];
let sessionValue: { accessToken: string } | null = { accessToken: "token" };
let postResult: LocalizedPostResponse = songPost();
let postError: unknown = null;
let publicPostResult: LocalizedPostResponse = songPost({ title: "Public Study Song" });
let publicPostError: unknown = null;
let studyResult: SongStudyPayload = readyStudyPayload();
let studyError: unknown = null;
let privyConnectCalls = 0;

const fakeApi = new ApiClient({
  baseUrl: "https://api.test",
  getToken: () => sessionValue?.accessToken ?? null,
});

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
fakeApi.communities.getPostStudy = async () => {
  calls.push("communities.getPostStudy");
  if (studyError) throw studyError;
  return studyResult;
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
  setSession: (response: { access_token: string }) => {
    sessionValue = { accessToken: response.access_token };
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

const { StudyRoutePage } = await import("./study-route");

beforeEach(() => {
  calls.length = 0;
  sessionValue = { accessToken: "token" };
  postResult = songPost();
  postError = null;
  publicPostResult = songPost({ title: "Public Study Song" });
  publicPostError = null;
  studyResult = readyStudyPayload();
  studyError = null;
  privyConnectCalls = 0;
});

afterEach(() => {
  cleanup();
});

describe("StudyRoutePage", () => {
  test("requires authentication before loading study data", async () => {
    sessionValue = null;

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Sign in to study")).toBeTruthy());
    expect(view.queryByText("Public Study Song")).toBeNull();
    expect(calls).toEqual([]);
  });

  test("does not fall back to public post load after auth errors", async () => {
    postError = new ApiError("auth_error", "auth expired", 401);

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Sign in to study")).toBeTruthy());
    expect(view.queryByText("Public Study Song")).toBeNull();
    expect(calls).toEqual(["posts.get"]);
  });

  test("loads the server-authoritative study pack for authenticated users", async () => {
    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Learn this song line by line")).toBeTruthy());
    expect(view.getByText("1 exercises")).toBeTruthy();
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });
});
