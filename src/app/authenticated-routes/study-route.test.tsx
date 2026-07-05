import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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
let submitPostStudyAttemptResult = {
  attempts_remaining: 0,
  correct_option_id: "option_correct",
  exercise_id: "ex_choice",
  object: "song_study_attempt_result",
  outcome: "correct",
} as const;

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
fakeApi.communities.submitPostStudyAttempt = async (_communityId, _postId, body) => {
  calls.push(`communities.submitPostStudyAttempt:${body.type}:${body.type === "translation_choice" ? body.selected_option_id : ""}`);
  return submitPostStudyAttemptResult;
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
  submitPostStudyAttemptResult = {
    attempts_remaining: 0,
    correct_option_id: "option_correct",
    exercise_id: "ex_choice",
    object: "song_study_attempt_result",
    outcome: "correct",
  };
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

  test("falls back to the public post read when the authenticated read 404s for non-members", async () => {
    postError = new ApiError("not_found", "Community not found", 404);

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Your transcript will appear here.")).toBeTruthy());
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(view.queryByText("Community not found")).toBeNull();
    expect(calls).toEqual(["posts.get", "publicPosts.get", "communities.getPostStudy"]);
  });

  test("surfaces the public read error when both reads fail", async () => {
    postError = new ApiError("not_found", "Community not found", 404);
    publicPostError = new ApiError("not_found", "Post not found", 404);

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Post not found")).toBeTruthy());
    expect(calls).toEqual(["posts.get", "publicPosts.get"]);
  });

  test("loads the server-authoritative study pack for authenticated users", async () => {
    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Your transcript will appear here.")).toBeTruthy());
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });

  test("shows a caught-up message when a ready study pack has no remaining exercises", async () => {
    studyResult = readyStudyPayload({
      exercise_count: 0,
      exercises: [],
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("You're caught up for this song.")).toBeTruthy());
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });

  test("includes the next review time in the caught-up message when supplied", async () => {
    studyResult = readyStudyPayload({
      exercise_count: 0,
      exercises: [],
      session: {
        due_count: 0,
        next_due_at: 4102444800,
        served_count: 0,
        total_units: 3,
      },
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText((text) => text.startsWith("You're caught up for this song. Next review "))).toBeTruthy());
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });

  test("submits a multiple choice attempt when an answer is selected", async () => {
    studyResult = readyStudyPayload({
      exercise_count: 1,
      exercises: [
        {
          id: "ex_choice",
          line_id: "line_1",
          line_index: 0,
          max_attempts: 1,
          options: [
            { id: "option_wrong", text: "Good night" },
            { id: "option_correct", text: "Hello world" },
          ],
          prompt_text: "Hola mundo",
          question: "Choose the translation",
          type: "translation_choice",
        },
      ],
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(view.queryByText("Check answer")).toBeNull();

    fireEvent.click(view.getByText("Hello world").closest("button")!);

    await waitFor(() => expect(calls).toContain("communities.submitPostStudyAttempt:translation_choice:option_correct"));
    await waitFor(() => expect(view.getByText("Continue")).toBeTruthy());
  });
});
