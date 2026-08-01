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

function choiceStudyPayload(overrides: { question: string }): SongStudyPayload {
  return readyStudyPayload({
    exercise_count: 1,
    exercises: [
      {
        id: "ex_choice",
        line_id: "line_1",
        line_index: 0,
        first_outcome: null,
        max_attempts: 3,
        mastered: false,
        presentation_count: 0,
        options: [
          { id: "option_wrong", text: "Good night" },
          { id: "option_correct", text: "Hello world" },
        ],
        prompt_text: "Hola mundo",
        question: overrides.question,
        type: "translation_choice",
      },
    ],
  });
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
let transcribeStudyAudioError: unknown = null;
let telegramVoiceIntentError: unknown = null;
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
fakeApi.communities.transcribePostStudyAudio = async () => {
  calls.push("communities.transcribePostStudyAudio");
  if (transcribeStudyAudioError) throw transcribeStudyAudioError;
  return { text: "Hola mundo" };
};
fakeApi.communities.createPostStudyTelegramVoiceIntent = async (_communityId, _postId, body) => {
  calls.push(`communities.createPostStudyTelegramVoiceIntent:${body.exercise_id}`);
  if (telegramVoiceIntentError) throw telegramVoiceIntentError;
  return {
    created: 1,
    expires_at: 2,
    id: "tsv_test",
    object: "telegram_study_voice_intent",
    status: "pending",
  };
};
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
  transcribeStudyAudioError = null;
  telegramVoiceIntentError = null;
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

function studyLoadCount(): number {
  return calls.filter((entry) => entry === "communities.getPostStudy").length;
}

// Serves a different payload per load so a reload is observable as the card the
// learner actually ends up on, not just as a call count. The last payload repeats
// if the route loads more times than expected.
function queueStudyPayloads(payloads: SongStudyPayload[]): () => void {
  const original = fakeApi.communities.getPostStudy;
  let loads = 0;
  fakeApi.communities.getPostStudy = async () => {
    calls.push("communities.getPostStudy");
    const payload = payloads[Math.min(loads, payloads.length - 1)]!;
    loads += 1;
    return payload;
  };
  return () => {
    fakeApi.communities.getPostStudy = original;
  };
}

function installFakeMediaRecorder(): () => void {
  const originalMediaRecorder = globalThis.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;

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
        getTracks: () => [{ stop: () => undefined }],
      }),
    },
  });

  return () => {
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
  };
}

async function recordSayItBack(view: ReturnType<typeof render>): Promise<void> {
  fireEvent.click(view.getByText("Record").closest("button")!);
  await waitFor(() => expect(view.getByText("Stop")).toBeTruthy());
  fireEvent.click(view.getByText("Stop").closest("button")!);
}

describe("StudyRoutePage", () => {
  test("offers age verification when the lesson requires proof", async () => {
    studyError = new ApiError("verification_required", "Age verification is required", 403);

    const view = render(<StudyRoutePage postId="pst_song" />);

    expect(await waitFor(() => view.getByRole("button", { name: "Verify age" }))).toBeTruthy();
    expect(view.getByText("Age verification is required to view 18+ content.")).toBeTruthy();
  });

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
    const progress = view.getByRole("progressbar", { name: "Lesson progress" });
    expect(progress.getAttribute("aria-valuenow")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("1");
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

  test("shows a compact reward pill for the active song campaign", async () => {
    rewardCampaignResult = {
      campaign: "rcp_study_offer",
      chain_id: 8453,
      eligible_activity: "either",
      daily_reward_cents: 40,
      ends_at: 1_786_060_799,
      min_score_bps: 8_500,
    };

    const view = render(<StudyRoutePage postId="pst_song" />);

    await waitFor(() => expect(view.getByText("Earn $0.40")).toBeTruthy());
    expect(view.queryByText("Earn $0.40 today")).toBeNull();
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

  test("does not rebuild a multiple choice session after an unrelated app switch", async () => {
    studyResult = choiceStudyPayload({ question: "Choose the translation" });
    const originalVisibilityState = document.visibilityState;

    try {
      const view = render(<StudyRoutePage postId="pst_song" telegramMiniApp />);
      await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());

      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      const hiddenEvent = document.createEvent("Event");
      hiddenEvent.initEvent("visibilitychange", false, false);
      document.dispatchEvent(hiddenEvent);
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      const visibleEvent = document.createEvent("Event");
      visibleEvent.initEvent("visibilitychange", false, false);
      document.dispatchEvent(visibleEvent);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(studyLoadCount()).toBe(1);
      expect(view.getByText("Choose the translation")).toBeTruthy();
    } finally {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: originalVisibilityState,
      });
    }
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
      campaign: "rcp_study_progress",
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

  // A transient failure has to leave the learner on the card with a retry, because
  // re-sending the same attempt is exactly the right move. Contrast with the stale
  // rejections below, where re-sending can only fail identically.
  test("keeps the say-it-back exercise visible when the attempt fails transiently", async () => {
    submitPostStudyAttemptError = new ApiError("server_error", "Study attempt storage is unavailable", 503);
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      await recordSayItBack(view);

      await waitFor(() => expect(view.getByText(/Study attempt storage is unavailable/)).toBeTruthy());
      expect(view.getAllByText("Say it back").length).toBeGreaterThan(0);
      expect(view.getByText("Record")).toBeTruthy();
      expect(view.queryByText("Open post")).toBeNull();
      expect(studyLoadCount()).toBe(1);
    } finally {
      restoreRecorder();
    }
  });

  test("hands say-it-back to a native Telegram voice message without requesting the microphone", async () => {
    let closeCalls = 0;
    const originalTelegram = (window as Window & { Telegram?: unknown }).Telegram;
    (window as Window & {
      Telegram?: { WebApp?: { close?: () => void } };
    }).Telegram = {
      WebApp: {
        close: () => {
          closeCalls += 1;
        },
      },
    };

    try {
      const view = render(<StudyRoutePage postId="pst_song" telegramMiniApp />);
      await waitFor(() => expect(view.getByText("Send voice message")).toBeTruthy());
      fireEvent.click(view.getByText("Send voice message").closest("button")!);
      await waitFor(() => expect(closeCalls).toBe(1));
      expect(calls).toContain(
        "communities.createPostStudyTelegramVoiceIntent:ex_say",
      );
      expect(calls).not.toContain("communities.transcribePostStudyAudio");
    } finally {
      (window as Window & { Telegram?: unknown }).Telegram = originalTelegram;
    }
  });

  test("leaves recoverable chat instructions when Telegram cannot close the Mini App", async () => {
    const originalTelegram = (window as Window & { Telegram?: unknown }).Telegram;
    (window as Window & {
      Telegram?: { WebApp?: Record<string, never> };
    }).Telegram = { WebApp: {} };

    try {
      const view = render(<StudyRoutePage postId="pst_song" telegramMiniApp />);
      await waitFor(() => expect(view.getByText("Send voice message")).toBeTruthy());
      fireEvent.click(view.getByText("Send voice message").closest("button")!);

      await waitFor(() => expect(view.getByText(
        "Check your chat with this community’s bot and reply with a voice message. You can close this window now.",
      )).toBeTruthy(), { timeout: 2_000 });
      expect(view.getByText("Send voice message")).toBeTruthy();
      expect(calls).not.toContain("communities.transcribePostStudyAudio");
    } finally {
      (window as Window & { Telegram?: unknown }).Telegram = originalTelegram;
    }
  });

  test("reloads the session when a say-it-back attempt is rejected as stale", async () => {
    submitPostStudyAttemptError = new ApiError("bad_request", "Study exercise presentation limit reached", 400);
    const restoreRecorder = installFakeMediaRecorder();
    const restoreStudy = queueStudyPayloads([
      readyStudyPayload({
        exercises: [{
          ...readyStudyPayload().exercises[0]!,
          prompt_text: "Say the stale line",
        }],
      }),
      readyStudyPayload({
        exercises: [{
          ...readyStudyPayload().exercises[0]!,
          id: "ex_next",
          prompt_text: "Say the next line",
        }],
      }),
    ]);

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getByText("Say the stale line")).toBeTruthy());
      await recordSayItBack(view);

      // Rebuilt from server truth rather than re-arming the rejected card, and no
      // dead-end page.
      await waitFor(() => expect(view.getByText("Say the next line")).toBeTruthy());
      expect(studyLoadCount()).toBe(2);
      expect(view.queryByText("Study exercise presentation limit reached")).toBeNull();
      expect(view.queryByText("Open post")).toBeNull();
    } finally {
      restoreStudy();
      restoreRecorder();
    }
  });

  test("reloads the session when a multiple choice attempt is rejected as stale", async () => {
    submitPostStudyAttemptError = new ApiError("bad_request", "attempt_number does not match the next session presentation", 400);
    const restoreStudy = queueStudyPayloads([
      choiceStudyPayload({ question: "Choose the translation" }),
      choiceStudyPayload({ question: "Choose the next translation" }),
    ]);

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
      fireEvent.click(view.getByText("Hello world").closest("button")!);

      await waitFor(() => expect(view.getByText("Choose the next translation")).toBeTruthy());
      expect(studyLoadCount()).toBe(2);
      expect(view.queryByText(/attempt_number does not match/)).toBeNull();
    } finally {
      restoreStudy();
    }
  });

  // Insurance against a server that keeps handing back a card it then rejects: the
  // learner must end up with a visible error, not a reload loop.
  test("stops reloading and surfaces the error after repeated stale rejections", async () => {
    submitPostStudyAttemptError = new ApiError("bad_request", "Study exercise presentation limit reached", 400);
    const restoreStudy = queueStudyPayloads([
      choiceStudyPayload({ question: "Choose the translation" }),
      choiceStudyPayload({ question: "Choose the translation" }),
      choiceStudyPayload({ question: "Choose the translation" }),
    ]);

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
      fireEvent.click(view.getByText("Hello world").closest("button")!);
      await waitFor(() => expect(studyLoadCount()).toBe(2));

      fireEvent.click(view.getByText("Hello world").closest("button")!);
      await waitFor(() => expect(studyLoadCount()).toBe(3));

      fireEvent.click(view.getByText("Hello world").closest("button")!);
      await waitFor(() => expect(view.getByText("Study exercise presentation limit reached")).toBeTruthy());
      expect(studyLoadCount()).toBe(3);
    } finally {
      restoreStudy();
    }
  });

  // Exiting study used to push the post page on top of the study entry, so the
  // post page's close (history.back()) landed right back on study. Replacing
  // the study entry breaks that loop.
  test("replaces the study history entry on exit instead of pushing the post page", async () => {
    const replaceCalls: (string | undefined)[] = [];
    const pushCalls: (string | undefined)[] = [];
    const originalHistory = window.history;
    const originalEvent = globalThis.Event;
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
          pushCalls.push(url?.toString());
        },
        replaceState: (_data: unknown, _unused: string, url?: string | URL | null) => {
          replaceCalls.push(url?.toString());
        },
      },
    });
    // linkedom's dispatchEvent cannot handle bun's native Event (readonly
    // eventPhase), so route events use the DOM's own Event class here.
    Object.defineProperty(globalThis, "Event", {
      configurable: true,
      value: window.Event,
    });

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);
      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));

      fireEvent.click(view.getByRole("button", { name: "Exit study" }));

      expect(replaceCalls).toEqual(["/p/pst_song"]);
      expect(pushCalls).toEqual([]);
    } finally {
      Object.defineProperty(window, "history", {
        configurable: true,
        value: originalHistory,
      });
      Object.defineProperty(globalThis, "Event", {
        configurable: true,
        value: originalEvent,
      });
    }
  });

  test("advances straight to the next exercise after a correct say-it-back attempt", async () => {
    submitPostStudyAttemptResult = {
      attempts_remaining: 1,
      exercise_id: "ex_say",
      object: "song_study_attempt_result",
      outcome: "correct",
    };
    studyResult = readyStudyPayload({
      exercise_count: 2,
      exercises: [
        {
          ...readyStudyPayload().exercises[0]!,
          prompt_text: "First say-it-back line",
        },
        {
          ...readyStudyPayload().exercises[0]!,
          id: "ex_next",
          line_id: "line_2",
          line_index: 1,
          prompt_text: "Second say-it-back line",
        },
      ],
    });
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getByText("First say-it-back line")).toBeTruthy());
      await recordSayItBack(view);

      // No intermediate "correct" banner: the lesson moves on immediately.
      await waitFor(() => expect(view.getByText("Second say-it-back line")).toBeTruthy());
      expect(view.queryByText("Correct.")).toBeNull();
      expect(view.queryByText("Continue")).toBeNull();
    } finally {
      restoreRecorder();
    }
  });

  test("shows the expected answer banner after a wrong say-it-back attempt", async () => {
    submitPostStudyAttemptResult = {
      attempts_remaining: 1,
      exercise_id: "ex_say",
      object: "song_study_attempt_result",
      outcome: "incorrect",
    };
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      await recordSayItBack(view);

      await waitFor(() => expect(view.getByText("Correct answer:")).toBeTruthy());
      expect(view.getByText("Hola mundo")).toBeTruthy();
      expect(view.getByText("Continue")).toBeTruthy();
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("0");
      expect(view.queryByText(/You said/u)).toBeNull();
      expect(view.queryByText(/Missing:/u)).toBeNull();
      expect(view.queryByText(/Extra:/u)).toBeNull();
    } finally {
      restoreRecorder();
    }
  });

  test("surfaces a submit error and stays idle when voice recording is unavailable", async () => {
    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });

    try {
      const view = render(<StudyRoutePage postId="pst_song" />);

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      fireEvent.click(view.getByText("Record").closest("button")!);

      await waitFor(() => expect(view.getByText("Voice recording is not available in this browser.")).toBeTruthy());
      expect(view.getByRole("alert")).toBeTruthy();
      expect(view.getByText("Record")).toBeTruthy();
      expect(view.queryByText("Correct answer:")).toBeNull();
    } finally {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
  });
});
