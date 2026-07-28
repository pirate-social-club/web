import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiClient, ApiError } from "@/lib/api/client";
import type {
  ApiPublicRewardOffer,
  ApiRewardsSummaryResponse,
  SongStudyAttemptRequest,
  SongStudyAttemptResult,
  SongStudyPayload,
} from "@/lib/api/client-api-types";

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
        first_outcome: null,
        max_attempts: 2,
        mastered: false,
        presentation_count: 0,
        prompt_text: "Say it back",
        reference_text: "Hola mundo",
        translation_text: "Hello world",
        type: "say_it_back",
      },
    ],
    generated_at: 1_782_672_000,
    object: "song_study_payload",
    source_language: "es",
    session: {
      completed_exercise_count: 0,
      due_count: 0,
      first_pass_correct_count: 0,
      id: "sts_test",
      mastered_exercise_count: 0,
      max_presentations: 3,
      presentation_count: 0,
      qualified: false,
      required_correct_count: 1,
      served_count: 1,
      status: "active",
      total_units: 1,
    },
    study_pack_version: 1,
    target_language: "en",
    title: "Study Song",
    ...overrides,
  };
}

const calls: string[] = [];
const submittedStudyAttempts: SongStudyAttemptRequest[] = [];
let sessionValue: { accessToken: string } | null = { accessToken: "token" };
let postResult: LocalizedPostResponse = songPost();
let postError: unknown = null;
let publicPostResult: LocalizedPostResponse = songPost({ title: "Public Study Song" });
let publicPostError: unknown = null;
let studyResult: SongStudyPayload = readyStudyPayload();
let studyError: unknown = null;
let rewardCampaignResult: ApiPublicRewardOffer | null = null;
let rewardSummaryResult: ApiRewardsSummaryResponse | null = null;
let privyConnectCalls = 0;
let submitPostStudyAttemptError: unknown = null;
let submitPostStudyAttemptResult: SongStudyAttemptResult = {
  attempts_remaining: 0,
  correct_option_id: "option_correct",
  exercise_id: "ex_choice",
  object: "song_study_attempt_result",
  outcome: "correct",
};

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
fakeApi.communities.transcribePostStudyAudio = async () => ({ text: "Hola mundo" });
fakeApi.rewards.getActiveCampaignForSong = async () => {
  if (!rewardCampaignResult) throw new ApiError("not_found", "Active reward campaign not found", 404);
  return rewardCampaignResult;
};
fakeApi.rewards.getSummary = async () => {
  if (!rewardSummaryResult) throw new ApiError("not_found", "Reward summary not configured", 404);
  return rewardSummaryResult;
};
fakeApi.communities.submitPostStudyAttempt = async (_communityId, _postId, body) => {
  submittedStudyAttempts.push(body);
  calls.push(`communities.submitPostStudyAttempt:${body.type}:${body.type === "translation_choice" ? body.selected_option_id : ""}`);
  if (submitPostStudyAttemptError) throw submitPostStudyAttemptError;
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
  submittedStudyAttempts.length = 0;
  sessionValue = { accessToken: "token" };
  postResult = songPost();
  postError = null;
  publicPostResult = songPost({ title: "Public Study Song" });
  publicPostError = null;
  studyResult = readyStudyPayload();
  studyError = null;
  rewardCampaignResult = null;
  rewardSummaryResult = null;
  privyConnectCalls = 0;
  submitPostStudyAttemptError = null;
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
    expect(view.queryByText("Study requires a Pirate account.")).toBeNull();
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

    await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
    expect(view.queryByText("Hello world")).toBeNull();
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

    await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
    expect(view.queryByText("Hello world")).toBeNull();
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });

  test("shows an exact uniform reward offer for the active song campaign", async () => {
    rewardCampaignResult = {
      chain_id: 8453,
      eligible_activity: "either",
      daily_reward_cents: 40,
      ends_at: 1_786_060_799,
      min_score_bps: 8_500,
    };

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Earn $0.40 today")).toBeTruthy());
    expect(view.getByText(/Complete a study set or score at least 85% in Karaoke/u)).toBeTruthy();
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

  test("shows the next recovery time and can refresh a caught-up study pack", async () => {
    const nextDueAt = Math.floor(Date.now() / 1000) + 600;
    studyResult = readyStudyPayload({
      exercise_count: 0,
      exercises: [],
      session: {
        due_count: 0,
        next_due_at: nextDueAt,
        served_count: 0,
        total_units: 1,
      },
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("You're caught up for this song. Review again in 10 min to keep going.")).toBeTruthy());
    expect(view.getByText("Check again")).toBeTruthy();
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);

    studyResult = readyStudyPayload();
    fireEvent.click(view.getByText("Check again").closest("button")!);

    await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
    expect(calls).toEqual(["posts.get", "communities.getPostStudy", "posts.get", "communities.getPostStudy"]);
  });

  test("skips an exhausted unmastered exercise when rebuilding the queue", async () => {
    studyResult = readyStudyPayload({
      exercise_count: 2,
      exercises: [
        {
          id: "ex_exhausted",
          line_id: "line_1",
          line_index: 0,
          first_outcome: "incorrect",
          max_attempts: 3,
          mastered: false,
          presentation_count: 3,
          prompt_text: "Exhausted prompt",
          reference_text: "Exhausted reference",
          translation_text: "Exhausted translation",
          type: "say_it_back",
        },
        {
          id: "ex_eligible",
          line_id: "line_2",
          line_index: 1,
          first_outcome: null,
          max_attempts: 3,
          mastered: false,
          presentation_count: 1,
          prompt_text: "Eligible prompt",
          reference_text: "Eligible reference",
          translation_text: "Eligible translation",
          type: "say_it_back",
        },
      ],
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Eligible prompt")).toBeTruthy());
    expect(view.queryByText("Exhausted prompt")).toBeNull();
  });

  test("shows completion without a restart action when every exercise is exhausted", async () => {
    studyResult = readyStudyPayload({
      exercises: [{
        ...readyStudyPayload().exercises[0]!,
        max_attempts: 3,
        presentation_count: 3,
      }],
    });

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("This lesson is complete.")).toBeTruthy());
    expect(view.queryByText("Study again")).toBeNull();
    expect(view.queryByText("Record")).toBeNull();
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
    expect(submittedStudyAttempts.at(-1)).toMatchObject({ session_id: "sts_test" });
    expect(submittedStudyAttempts.at(-1)).not.toHaveProperty("target_language");
    await waitFor(() => expect(view.getByText("Continue")).toBeTruthy());
  });

  test("unlocks feedback audio on answer selection before the attempt response", async () => {
    let resumeCalls = 0;
    const originalAudioContext = window.AudioContext;
    const originalFetch = globalThis.fetch;
    class FakeAudioContext {
      destination = {};
      state = "suspended";
      createBufferSource() {
        return {
          buffer: null,
          connect: () => ({ connect: () => undefined }),
          start: () => undefined,
        };
      }
      createGain() {
        return {
          connect: () => undefined,
          gain: { value: 1 },
        };
      }
      decodeAudioData = async () => ({}) as AudioBuffer;
      resume = async () => {
        resumeCalls += 1;
        this.state = "running";
      };
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });
    globalThis.fetch = (async () => ({
      arrayBuffer: async () => new ArrayBuffer(1),
      ok: true,
    })) as typeof fetch;

    try {
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
      fireEvent.click(view.getByText("Hello world").closest("button")!);

      expect(resumeCalls).toBe(1);
      await waitFor(() => expect(calls).toContain("communities.submitPostStudyAttempt:translation_choice:option_correct"));
    } finally {
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: originalAudioContext,
      });
      globalThis.fetch = originalFetch;
    }
  });

  test("renders server-owned streak progress on completion", async () => {
    rewardCampaignResult = {
      chain_id: 84532,
      eligible_activity: "study",
      daily_reward_cents: 40,
      ends_at: Math.floor(Date.now() / 1000) + 86_400,
      min_score_bps: 7_000,
    };
    rewardSummaryResult = {
      balance_cents: 40,
      cashout: {
        eligible: false,
        min_cents: 100,
        verification_provider: "self",
        verification_state: "verified",
      },
      chain_id: 84532,
      latest_in_flight_cashout: null,
      pending_verification: {
        conditional_cents: 0,
        count: 0,
        earliest_expires_at: null,
      },
      recent_events: [],
      recent_qualifications: [{
        amount_cents: 40,
        community_id: "cmt_study",
        created_at: 1,
        credited_reward_event_id: "rew_study",
        expires_at: Math.floor(Date.now() / 1000) + 86_400,
        id: "rpq_study",
        outcome_reason: null,
        post_id: "pst_song",
        qualification_basis: "study",
        reward_campaign_id: "rcp_study",
        reward_period_key: "2026-07-23",
        reward_qualification_event_id: "rqe_study",
        status: "credited",
        updated_at: 2,
      }],
      today_earned_cents: 40,
    };
    submitPostStudyAttemptResult = {
      attempts_remaining: 0,
      correct_option_id: "option_correct",
      exercise_id: "ex_choice",
      next_review_hint: "good",
      object: "song_study_attempt_result",
      outcome: "correct",
      study_progress: {
        current_streak: 4,
        next_due_at: Math.floor(Date.now() / 1000) + 86_400,
        qualified_today: true,
        study_attempt_count: 3,
        study_correct_count: 3,
        study_target_count: 3,
      },
    };
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
    fireEvent.click(view.getByText("Hello world").closest("button")!);
    await waitFor(() => expect(view.getByText("Continue")).toBeTruthy());
    fireEvent.click(view.getByText("Continue").closest("button")!);

    await waitFor(() => expect(view.getByText("Your streak")).toBeTruthy());
    expect(view.getByLabelText("4 day streak")).toBeTruthy();
    expect(view.getByText("1/1")).toBeTruthy();
    await waitFor(() => expect(view.getByText("+$0.40 🎉")).toBeTruthy());
    expect(view.getByText("Test reward — no cash value.")).toBeTruthy();
  });

  test("keeps the multiple choice exercise visible when attempt recording fails", async () => {
    submitPostStudyAttemptError = new ApiError("server_error", "recording failed", 500);
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
    fireEvent.click(view.getByText("Hello world").closest("button")!);

    await waitFor(() => expect(view.getByText("recording failed")).toBeTruthy());
    expect(view.getByText("Choose the translation")).toBeTruthy();
    expect(view.queryByText("Could not submit this study attempt.")).toBeNull();
  });

  test("keeps the say-it-back exercise visible when attempt recording fails", async () => {
    submitPostStudyAttemptError = new ApiError("bad_request", "Study exercise presentation limit reached", 400);
    const originalMediaRecorder = globalThis.MediaRecorder;
    const originalMediaDevices = navigator.mediaDevices;
    const stopTrack = () => undefined;

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onerror: (() => void) | null = null;
      onstop: (() => void) | null = null;
      state: RecordingState = "recording";

      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
      start() {}
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["audio"], { type: this.mimeType }) });
        this.onstop?.();
      }
    }

    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      fireEvent.click(view.getByText("Record").closest("button")!);
      await waitFor(() => expect(view.getByText("Stop")).toBeTruthy());
      fireEvent.click(view.getByText("Stop").closest("button")!);

      await waitFor(() => expect(view.getByText("Study exercise presentation limit reached")).toBeTruthy());
      expect(view.getAllByText("Say it back").length).toBeGreaterThan(0);
      expect(view.getByText("Record")).toBeTruthy();
      expect(view.queryByText("Open post")).toBeNull();
    } finally {
      Object.defineProperty(globalThis, "MediaRecorder", {
        configurable: true,
        value: originalMediaRecorder,
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
  });
});
