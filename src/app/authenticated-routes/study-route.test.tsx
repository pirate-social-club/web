import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { installDomGlobals } from "@/test/setup-dom";
import { ApiProvider } from "@/lib/api";
import { ApiClient, ApiError } from "@/lib/api/client";
import { __resetSessionStoreForTests, clearSession, getAccessToken, setSession } from "@/lib/api/session-store";
import type {
  ApiPublicRewardOffer,
  SongStreakLeaderboard,
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
let postResult: LocalizedPostResponse = songPost();
let postError: unknown = null;
let publicPostResult: LocalizedPostResponse = songPost({ title: "Public Study Song" });
let publicPostError: unknown = null;
let studyResult: SongStudyPayload = readyStudyPayload();
let studyError: unknown = null;
let rewardCampaignResult: ApiPublicRewardOffer | null = null;
let privyConnectCalls = 0;
let submitPostStudyAttemptError: unknown = null;
let submitPostStudyAttemptPromise: Promise<SongStudyAttemptResult> | null = null;
let transcribeStudyAudioError: unknown = null;
let transcribeStudyAudioResult: { text: string; language_code?: string | null; language_probability?: number | null } = {
  text: "Hola mundo",
};
let telegramVoiceIntentError: unknown = null;
let streakLeaderboardResult: SongStreakLeaderboard = {
  community_id: "cmt_study",
  date: "2026-07-27",
  entries: [],
  object: "song_streak_leaderboard",
  post_id: "pst_song",
  total_active_streaks: 0,
  viewer: null,
};
let submitPostStudyAttemptResult: SongStudyAttemptResult = {
  attempts_remaining: 0,
  correct_option_id: "option_correct",
  exercise_id: "ex_choice",
  object: "song_study_attempt_result",
  outcome: "correct",
};

const fakeApi = new ApiClient({
  baseUrl: "https://api.test",
  getToken: getAccessToken,
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
  return transcribeStudyAudioResult as never;
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
  calls.push("rewards.getSummary");
  throw new ApiError("server_error", "Study completion must not fetch the reward summary", 500);
};
fakeApi.communities.submitPostStudyAttempt = async (_communityId, _postId, body) => {
  submittedStudyAttempts.push(body);
  calls.push(`communities.submitPostStudyAttempt:${body.type}:${body.type === "translation_choice" ? body.selected_option_id : ""}`);
  if (submitPostStudyAttemptError) throw submitPostStudyAttemptError;
  if (submitPostStudyAttemptPromise) return submitPostStudyAttemptPromise;
  return submitPostStudyAttemptResult;
};
fakeApi.communities.getPostStreakLeaderboard = async () => {
  calls.push("communities.getPostStreakLeaderboard");
  return streakLeaderboardResult;
};

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
  __resetSessionStoreForTests();
  setSession({
    access_token: "token",
    user: {},
    profile: {},
    onboarding: {},
    wallet_attachments: [],
  } as unknown as Parameters<typeof setSession>[0]);
  calls.length = 0;
  submittedStudyAttempts.length = 0;
  postResult = songPost();
  postError = null;
  publicPostResult = songPost({ title: "Public Study Song" });
  publicPostError = null;
  studyResult = readyStudyPayload();
  studyError = null;
  rewardCampaignResult = null;
  privyConnectCalls = 0;
  submitPostStudyAttemptError = null;
  submitPostStudyAttemptPromise = null;
  transcribeStudyAudioError = null;
  transcribeStudyAudioResult = { text: "Hola mundo" };
  telegramVoiceIntentError = null;
  streakLeaderboardResult = {
    community_id: "cmt_study",
    date: "2026-07-27",
    entries: [],
    object: "song_streak_leaderboard",
    post_id: "pst_song",
    total_active_streaks: 0,
    viewer: null,
  };
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
  clearSession();
  __resetSessionStoreForTests();
});

function renderRoute(props: { telegramMiniApp?: boolean } = {}) {
  return render(
    <ApiProvider client={fakeApi}>
      <StudyRoutePage postId="pst_song" {...props} />
    </ApiProvider>,
  );
}

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

    const view = renderRoute();

    expect(await waitFor(() => view.getByRole("button", { name: "Verify age" }))).toBeTruthy();
    expect(view.getByText("Age verification is required to view 18+ content.")).toBeTruthy();
  });

  test("requires authentication before loading study data", async () => {
    clearSession();

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Sign in to study")).toBeTruthy());
    expect(view.queryByText("Study requires a Pirate account.")).toBeNull();
    expect(view.queryByText("Public Study Song")).toBeNull();
    expect(calls).toEqual([]);
  });

  test("does not fall back to public post load after auth errors", async () => {
    postError = new ApiError("auth_error", "auth expired", 401);

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Sign in to study")).toBeTruthy());
    expect(view.queryByText("Public Study Song")).toBeNull();
    expect(calls).toEqual(["posts.get"]);
  });

  test("falls back to the public post read when the authenticated read 404s for non-members", async () => {
    postError = new ApiError("not_found", "Community not found", 404);

    const view = renderRoute();

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

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Post not found")).toBeTruthy());
    expect(calls).toEqual(["posts.get", "publicPosts.get"]);
  });

  test("loads the server-authoritative study pack for authenticated users", async () => {
    const view = renderRoute();

    await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
    expect(view.queryByText("Hello world")).toBeNull();
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(calls).toEqual(["posts.get", "communities.getPostStudy"]);
  });

  test("renders a locked lesson without reading ready-state progress", async () => {
    studyResult = readyStudyPayload({ access: "locked" });

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Study unlocks with the song")).toBeTruthy());
    expect(view.queryByRole("progressbar", { name: "Lesson progress" })).toBeNull();
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

    const view = renderRoute();

    await waitFor(() => expect(view.getByLabelText("Bounty $0.40")).toBeTruthy());
    expect(view.getByText("$0.40")).toBeTruthy();
    expect(view.queryByText("Earn $0.40")).toBeNull();
    expect(view.queryByText("Earn $0.40 today")).toBeNull();
  });

  test("shows a caught-up message when a ready study pack has no remaining exercises", async () => {
    studyResult = readyStudyPayload({
      exercise_count: 0,
      exercises: [],
    });

    const view = renderRoute();

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

    const view = renderRoute();

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

    const view = renderRoute();

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

    const view = renderRoute();

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
    submitPostStudyAttemptResult = {
      ...submitPostStudyAttemptResult,
      lesson: {
        completion_reason: "all_resolved",
        next: null,
        resolved_count: 1,
        session_revision: 4,
        total_count: 1,
      },
    };

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
    expect(view.queryByText("Learn this song line by line")).toBeNull();
    expect(view.queryByText("Check answer")).toBeNull();

    fireEvent.click(view.getByText("Hello world").closest("button")!);

    await waitFor(() => expect(calls).toContain("communities.submitPostStudyAttempt:translation_choice:option_correct"));
    expect(submittedStudyAttempts.at(-1)).toMatchObject({ session_id: "sts_test" });
    expect(submittedStudyAttempts.at(-1)).not.toHaveProperty("target_language");
    expect(submittedStudyAttempts.at(-1)).not.toHaveProperty("session_revision");
    await waitFor(() => expect(view.getByText("Continue")).toBeTruthy());
  });

  test("submits ordered fill-blank placements and follows the authoritative lesson", async () => {
    const fillExercise = {
      first_outcome: null,
      id: "ex_fill",
      line_id: "line_1",
      line_index: 0,
      mastered: false,
      max_attempts: 3,
      presentation_count: 0,
      prompt_text: "Fill in the lyric.",
      segments: [
        { kind: "text" as const, text: "We " },
        { id: "blank_1", kind: "blank" as const },
        { kind: "text" as const, text: " together" },
      ],
      tokens: [
        { id: "token_1", text: "sing" },
        { id: "token_2", text: "wait" },
      ],
      type: "fill_blank" as const,
    };
    studyResult = readyStudyPayload({
      exercises: [fillExercise],
      lesson: {
        completion_reason: null,
        next: {
          attempts_this_appearance: 0,
          exercise_id: fillExercise.id,
          is_reappearance: false,
          presentation_number: 1,
          prompt: fillExercise,
          type: "fill_blank",
        },
        resolved_count: 0,
        session_revision: 7,
        total_count: 1,
      },
    });
    submitPostStudyAttemptResult = {
      attempts_remaining: 2,
      correct_placements: [{ blank_id: "blank_1", token_id: "token_1" }],
      exercise_id: fillExercise.id,
      lesson: {
        completion_reason: "all_resolved",
        next: null,
        resolved_count: 1,
        session_revision: 8,
        total_count: 1,
      },
      object: "song_study_attempt_result",
      outcome: "correct",
      session: {
        ...readyStudyPayload().session!,
        completed_exercise_count: 1,
        first_pass_correct_count: 1,
        presentation_count: 1,
        qualified: false,
        status: "completed",
      },
    };

    const view = renderRoute();
    await waitFor(() => expect(view.getByText("Fill in the lyric.")).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "sing" }));
    fireEvent.click(view.getByRole("button", { name: "Check" }));

    await waitFor(() => expect(submittedStudyAttempts).toHaveLength(1));
    expect(submittedStudyAttempts[0]).toMatchObject({
      placements: [{ blank_id: "blank_1", token_id: "token_1" }],
      session_revision: 7,
      type: "fill_blank",
    });
    await waitFor(() => expect(view.getByRole("button", { name: "Continue" })).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(view.getByText("Session complete")).toBeTruthy());
  });

  test("does not rebuild a multiple choice session after an unrelated app switch", async () => {
    studyResult = choiceStudyPayload({ question: "Choose the translation" });
    const originalVisibilityState = document.visibilityState;

    try {
      const view = renderRoute({ telegramMiniApp: true });
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

      const view = renderRoute();

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

  test("finishes after the durable attempt response without checking the bounty outcome", async () => {
    rewardCampaignResult = {
      campaign: "rcp_study_progress",
      chain_id: 84532,
      eligible_activity: "study",
      daily_reward_cents: 40,
      ends_at: Math.floor(Date.now() / 1000) + 86_400,
      min_score_bps: 7_000,
    };
    submitPostStudyAttemptResult = {
      attempts_remaining: 0,
      correct_option_id: "option_correct",
      exercise_id: "ex_choice",
      next_review_hint: "good",
      object: "song_study_attempt_result",
      outcome: "correct",
      session: {
        ...readyStudyPayload().session!,
        completed_exercise_count: 1,
        first_pass_correct_count: 1,
        mastered_exercise_count: 1,
        presentation_count: 1,
        qualified: true,
        status: "completed",
      },
      study_progress: {
        current_streak: 4,
        next_due_at: Math.floor(Date.now() / 1000) + 86_400,
        qualified_today: true,
        study_attempt_count: 3,
        study_correct_count: 3,
        study_target_count: 3,
      },
    };
    const freshExpiry = new Date(Date.now() + 86_400_000).toISOString();
    postResult = {
      ...songPost(),
      streak_summary: {
        entries: [{
          active_until_at: freshExpiry,
          best_streak: 9,
          current_streak: 9,
          identity: { avatar_ref: null, display_name: "Stale Leader", handle: null, user_id: "usr_stale" },
          is_viewer: false,
          last_qualified_date: "2026-07-26",
          rank: 1,
          streak_started_date: "2026-07-18",
          total_qualified_days: 9,
        }],
        totalActiveStreaks: 1,
        viewer: null,
      },
    } as unknown as LocalizedPostResponse;
    streakLeaderboardResult = {
      community_id: "cmt_study",
      date: "2026-07-27",
      entries: [{
        active_until_at: freshExpiry,
        best_streak: 6,
        current_streak: 6,
        identity: { avatar_ref: null, display_name: "Peer Singer", handle: null, user_id: "usr_peer" },
        is_viewer: false,
        last_qualified_date: "2026-07-27",
        rank: 1,
        streak_started_date: "2026-07-22",
        total_qualified_days: 6,
      }],
      object: "song_streak_leaderboard",
      post_id: "pst_song",
      total_active_streaks: 2,
      viewer: {
        active_until_at: freshExpiry,
        alive: true,
        best_streak: 4,
        current_streak: 4,
        karaoke_passed_today: false,
        qualified_today: true,
        rank: 2,
        study_attempts_today: 3,
        study_target_today: 3,
        total_qualified_days: 4,
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
    let resolveFinalAttempt!: (result: SongStudyAttemptResult) => void;
    submitPostStudyAttemptPromise = new Promise((resolve) => {
      resolveFinalAttempt = resolve;
    });

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
    expect(view.getByLabelText("Bounty $0.40")).toBeTruthy();
    fireEvent.click(view.getByText("Hello world").closest("button")!);

    await waitFor(() => expect(submittedStudyAttempts).toHaveLength(1));
    expect(view.queryByText("Your streak")).toBeNull();
    expect(view.queryByText("Session complete")).toBeNull();
    expect(calls).not.toContain("rewards.getSummary");

    resolveFinalAttempt(submitPostStudyAttemptResult);
    await waitFor(() => expect(view.getByText("Continue")).toBeTruthy());
    fireEvent.click(view.getByText("Continue").closest("button")!);

    await waitFor(() => expect(view.getByText("Your streak")).toBeTruthy());
    expect(view.getByLabelText("4 day streak")).toBeTruthy();
    expect(view.getByText("1/1")).toBeTruthy();
    expect(view.getByRole("button", { name: "Exit study" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Study again" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Karaoke" })).toBeTruthy();
    expect(view.queryByLabelText("Bounty $0.40")).toBeNull();
    expect(view.queryByText(/Checking your/u)).toBeNull();
    expect(view.queryByText("Still checking your reward")).toBeNull();
    expect(view.queryByText("$0.40 pending")).toBeNull();
    expect(view.queryByText("+$0.40 🎉")).toBeNull();
    expect(view.queryByText("Reward expired")).toBeNull();
    expect(view.queryByText("No reward this time")).toBeNull();
    expect(view.queryByText("Today's rewards have all been claimed.")).toBeNull();
    expect(view.queryByText("You already got this song's reward today.")).toBeNull();
    expect(view.queryByText("You can leave this screen. The result will appear in your Wallet.")).toBeNull();
    expect(calls).not.toContain("rewards.getSummary");
    expect(calls.filter((call) => call.startsWith("communities.submitPostStudyAttempt:"))).toHaveLength(1);

    // The completion list comes from a fresh leaderboard fetch — server ranks,
    // never the pre-session snapshot riding on the post payload.
    await waitFor(() => expect(view.getByText("Peer Singer")).toBeTruthy());
    expect(view.queryByText("Stale Leader")).toBeNull();
    expect(view.getByText("#2")).toBeTruthy();
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

    const view = renderRoute();

    await waitFor(() => expect(view.getByText("Choose the translation")).toBeTruthy());
    fireEvent.click(view.getByText("Hello world").closest("button")!);

    await waitFor(() => expect(view.getByText("recording failed")).toBeTruthy());
    expect(view.getByText("Choose the translation")).toBeTruthy();
    expect(view.queryByText("Could not submit this study attempt.")).toBeNull();
  });

  test("forwards STT language metadata with a say-it-back attempt", async () => {
    transcribeStudyAudioResult = {
      language_code: "th",
      language_probability: 0.99,
      text: "ทดสอบ",
    };
    const restoreRecorder = installFakeMediaRecorder();
    try {
      const view = renderRoute();
      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      await recordSayItBack(view);
      await waitFor(() => expect(submittedStudyAttempts.at(-1)?.transcription_language_code).toBe("th"));
      expect(submittedStudyAttempts.at(-1)).toMatchObject({
        transcription_language_code: "th",
        transcription_language_probability: 0.99,
      });
    } finally {
      restoreRecorder();
    }
  });

  // A transient failure has to leave the learner on the card with a retry, because
  // re-sending the same attempt is exactly the right move. Contrast with the stale
  // rejections below, where re-sending can only fail identically.
  test("keeps the say-it-back exercise visible when the attempt fails transiently", async () => {
    submitPostStudyAttemptError = new ApiError("server_error", "Study attempt storage is unavailable", 503);
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = renderRoute();

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
      const view = renderRoute({ telegramMiniApp: true });
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
      const view = renderRoute({ telegramMiniApp: true });
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
      const view = renderRoute();

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
      const view = renderRoute();

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
      const view = renderRoute();

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
      const view = renderRoute();
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
      const view = renderRoute();

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

  test("retries a missed say-it-back in place while attempts remain", async () => {
    submitPostStudyAttemptResult = {
      attempts_remaining: 1,
      exercise_id: "ex_say",
      lesson: {
        completion_reason: "all_resolved",
        next: null,
        resolved_count: 1,
        session_revision: 4,
        total_count: 1,
      },
      object: "song_study_attempt_result",
      outcome: "incorrect",
    };
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = renderRoute();

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      await recordSayItBack(view);

      // A retryable miss keeps the same prompt and offers another recording. It
      // never echoes the expected answer, which is already the prompt above.
      await waitFor(() => expect(view.getByText("Not quite — try again")).toBeTruthy());
      expect(submittedStudyAttempts.at(-1)).not.toHaveProperty("session_revision");
      expect(view.getByText("Heard: Hola mundo")).toBeTruthy();
      expect(view.getByText("Record")).toBeTruthy();
      expect(view.queryByText("Correct answer:")).toBeNull();
      expect(view.queryByText("Continue")).toBeNull();
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("0");
      expect(view.queryByText(/You said/u)).toBeNull();
      expect(view.queryByText(/Missing:/u)).toBeNull();
      expect(view.queryByText(/Extra:/u)).toBeNull();

      // Spending the last attempt resolves the card: now it offers Continue.
      submitPostStudyAttemptResult = {
        attempts_remaining: 0,
        exercise_id: "ex_say",
        object: "song_study_attempt_result",
        outcome: "incorrect",
      };
      await recordSayItBack(view);

      // Nothing is coming back — the copy must not promise a return the lesson
      // will not deliver.
      await waitFor(() => expect(view.getByText("Let's keep going")).toBeTruthy());
      expect(view.queryByText("Let's come back to this")).toBeNull();
      expect(view.getByText("Continue")).toBeTruthy();
      expect(view.queryByText("Correct answer:")).toBeNull();

      // With no attempts left the card is not requeued, so the lesson resolves
      // it and moves on rather than bouncing the learner back to the same line.
      fireEvent.click(view.getByText("Continue").closest("button")!);
      await waitFor(() => expect(view.getByText("Session complete")).toBeTruthy());
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("1");
    } finally {
      restoreRecorder();
    }
  });

  test("stops retrying in place after the second miss, then resolves on review", async () => {
    // Two cards, so a requeued miss has something to sit behind. With a single
    // card the lesson ends instead — covered by the test above.
    studyResult = readyStudyPayload({
      exercise_count: 2,
      exercises: [
        {
          id: "ex_say",
          line_id: "line_1",
          line_index: 0,
          first_outcome: null,
          max_attempts: 3,
          mastered: false,
          presentation_count: 0,
          prompt_text: "Primera linea",
          reference_text: "Hola mundo",
          translation_text: "Hello world",
          type: "say_it_back",
        },
        {
          id: "ex_say_2",
          line_id: "line_2",
          line_index: 1,
          first_outcome: null,
          max_attempts: 3,
          mastered: false,
          presentation_count: 0,
          prompt_text: "Segunda linea",
          reference_text: "Segunda linea",
          translation_text: "Second line",
          type: "say_it_back",
        },
      ],
      session: { ...readyStudyPayload().session!, required_correct_count: 2, served_count: 2, total_units: 2 },
    });
    // The server still has an attempt left (lifetime budget is 3), but a single
    // appearance is capped at two so the lesson moves on instead of looping.
    submitPostStudyAttemptResult = {
      attempts_remaining: 1,
      exercise_id: "ex_say",
      object: "song_study_attempt_result",
      outcome: "incorrect",
    };
    const restoreRecorder = installFakeMediaRecorder();

    try {
      const view = renderRoute();

      await waitFor(() => expect(view.getAllByText("Say it back").length).toBeGreaterThan(0));
      await waitFor(() => expect(view.getByText("Primera linea")).toBeTruthy());

      // First miss: retry stays on this card.
      await recordSayItBack(view);
      await waitFor(() => expect(view.getByText("Not quite — try again")).toBeTruthy());
      expect(view.getByText("Record")).toBeTruthy();

      // Second miss: the appearance is spent even though the server would allow
      // another attempt, so the learner is offered Continue, not another Record.
      await recordSayItBack(view);
      await waitFor(() => expect(view.getByText("Let's come back to this")).toBeTruthy());
      expect(view.getByText("Continue")).toBeTruthy();
      expect(view.queryByText("Not quite — try again")).toBeNull();

      // Requeued, not resolved: the OTHER card comes up next and progress holds.
      fireEvent.click(view.getByText("Continue").closest("button")!);
      await waitFor(() => expect(view.getByText("Segunda linea")).toBeTruthy());
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("0");
      expect(view.queryByText("Session complete")).toBeNull();

      // Clear the second card so the review pass returns to the first.
      submitPostStudyAttemptResult = {
        attempts_remaining: 2,
        exercise_id: "ex_say_2",
        object: "song_study_attempt_result",
        outcome: "correct",
      };
      await recordSayItBack(view);
      await waitFor(() => expect(view.getByText("Primera linea")).toBeTruthy());
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("1");

      // Third and final attempt on the review pass: the per-appearance counter
      // reset, so this is a fresh attempt — but the server has nothing left, so
      // it resolves rather than offering a fourth try.
      submitPostStudyAttemptResult = {
        attempts_remaining: 0,
        exercise_id: "ex_say",
        object: "song_study_attempt_result",
        outcome: "incorrect",
      };
      await recordSayItBack(view);
      await waitFor(() => expect(view.getByText("Let's keep going")).toBeTruthy());
      expect(view.getByText("Continue")).toBeTruthy();
      expect(view.queryByText("Not quite — try again")).toBeNull();
      expect(view.queryByText("Let's come back to this")).toBeNull();

      fireEvent.click(view.getByText("Continue").closest("button")!);
      await waitFor(() => expect(view.getByText("Session complete")).toBeTruthy());
      expect(view.getByRole("progressbar", { name: "Lesson progress" }).getAttribute("aria-valuenow")).toBe("2");
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
      const view = renderRoute();

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
