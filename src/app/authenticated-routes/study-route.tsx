"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import { routeReturnPath } from "@/app/authenticated-helpers/video-viewer-return-state";
import { loadSongRoutePost } from "@/app/authenticated-helpers/load-song-route-post";
import {
  SongStudySurface,
  type SongStudyMultipleChoiceExercise,
  type SongStudySayItBackExercise,
  type SongStudySurfaceState,
} from "@/components/compositions/song-study/song-study-surface";
import type { SongStreakSummary } from "@/components/compositions/song-study/song-streak-preview";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import {
  displayedRewardQualificationStatus,
  RewardQualificationNotice,
  rewardAmountLabel,
  SongRewardOffer,
} from "@/components/compositions/rewards/reward-surfaces";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { toStreakSummary } from "@/app/authenticated-helpers/post-media-presentation";
import { isApiAuthError } from "@/lib/api/client";
import type {
  ApiPublicRewardOffer,
  ApiRewardQualificationSummary,
  SongStudyAttemptResult,
  SongStudyExercise,
  SongStudyPayload,
} from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

type StudyRouteState =
  | { phase: "loading" }
  | { phase: "auth_required" }
  | {
      correctCount: number;
      exerciseQueue: number[];
      lastAttemptResult?: SongStudyAttemptResult;
      presentationCounts: Record<string, number>;
      phase: "ready";
      post: LocalizedPostResponse;
      rewardOffer: ApiPublicRewardOffer | null;
      study: SongStudyPayload;
      surface: SongStudySurfaceState;
    }
  | {
      phase: "locked";
      post: LocalizedPostResponse;
      rewardOffer: ApiPublicRewardOffer | null;
      study: SongStudyPayload;
      surface: SongStudySurfaceState;
    }
  | { actionLabel?: string; message: string; phase: "blocked"; title: string }
  | { phase: "error"; message: string; title: string };

type ReadyStudyRouteState = Extract<StudyRouteState, { phase: "ready" }>;
type MultipleChoiceSurfaceState = Extract<SongStudySurfaceState, { kind: "multiple_choice" }>;
type StudyFeedbackOutcome = "correct" | "incorrect";

const STUDY_FEEDBACK_OUTCOMES: readonly StudyFeedbackOutcome[] = ["correct", "incorrect"];

type StudyFeedbackAudioState = {
  buffers: Partial<Record<StudyFeedbackOutcome, AudioBuffer>>;
  context: AudioContext;
  loading: Partial<Record<StudyFeedbackOutcome, Promise<AudioBuffer>>>;
};

let studyFeedbackAudio: StudyFeedbackAudioState | null = null;

function pageTitle(post: LocalizedPostResponse | null, study?: SongStudyPayload | null): string {
  return study?.title?.trim()
    || post?.song_presentation?.title?.trim()
    || post?.post.song_title?.trim()
    || post?.post.title?.trim()
    || "Study";
}

function pageArtwork(post: LocalizedPostResponse | null, study?: SongStudyPayload | null): string | undefined {
  return study?.artwork_src?.trim() || post?.song_presentation?.cover_art_ref || undefined;
}

function lockedSurface(_study: SongStudyPayload): SongStudySurfaceState {
  return {
    kind: "locked",
    priceLabel: undefined,
  };
}

function toSayItBackExercise(exercise: Extract<SongStudyExercise, { type: "say_it_back" }>): SongStudySayItBackExercise {
  const prompt = exercise.prompt_text || exercise.reference_text || "Listen to the line and say it back.";
  return {
    id: exercise.id,
    lineNumber: exercise.line_index + 1,
    maxAttempts: Math.max(1, exercise.max_attempts || 1),
    prompt,
    translation: exercise.translation_text ?? undefined,
    expected: exercise.reference_text || prompt,
  };
}

function toMultipleChoiceExercise(exercise: Extract<SongStudyExercise, { type: "translation_choice" }>): SongStudyMultipleChoiceExercise {
  return {
    id: exercise.id,
    lineNumber: exercise.line_index + 1,
    maxAttempts: Math.max(1, exercise.max_attempts || 1),
    options: exercise.options,
    prompt: exercise.prompt_text,
    question: exercise.question,
    // The server deliberately withholds this until an attempt is spent. The
    // surface needs the field for reveal styling; keep it empty until the
    // attempt response discloses it.
    correctOptionId: "",
  };
}

function exerciseSurface(exercise: SongStudyExercise, attemptNumber = Number(exercise.presentation_count ?? 0) + 1): SongStudySurfaceState {
  return exercise.type === "translation_choice"
    ? {
        kind: "multiple_choice",
        attemptNumber,
        exercise: toMultipleChoiceExercise(exercise),
      }
    : {
        kind: "say_it_back",
        attemptNumber,
        exercise: toSayItBackExercise(exercise),
        phase: "idle",
      };
}

function formatNextReviewLabel(nextDueAt?: number): string | undefined {
  if (!nextDueAt) return undefined;
  const dueMs = nextDueAt * 1000;
  const deltaMs = dueMs - Date.now();
  if (!Number.isFinite(deltaMs)) return undefined;
  if (deltaMs <= 60_000) return "soon";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(deltaMs / 3_600_000);
  if (hours < 24) return `in ${hours} hr`;
  const days = Math.round(deltaMs / 86_400_000);
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(dueMs));
}

function caughtUpMessage(study: SongStudyPayload): string {
  const nextReviewLabel = formatNextReviewLabel(study.session?.next_due_at);
  if (!nextReviewLabel) return "You're caught up for this song.";
  return `You're caught up for this song. Review again ${nextReviewLabel} to keep going.`;
}

function completeSurface(input: {
  correctCount: number;
  lastAttemptResult?: SongStudyAttemptResult;
  streakSummary?: SongStreakSummary;
  totalCount: number;
}): SongStudySurfaceState {
  const progress = input.lastAttemptResult?.study_progress;
  return {
    kind: "complete",
    correctCount: input.correctCount,
    nextReviewLabel: formatNextReviewLabel(progress?.next_due_at),
    scorePercent: input.totalCount > 0 ? (input.correctCount / input.totalCount) * 100 : 0,
    ...(progress
      ? {
          streak: {
            currentStreak: progress.current_streak,
            qualifiedToday: progress.qualified_today,
            studyAttemptsToday: progress.study_attempt_count,
            studyCorrectCount: progress.study_correct_count,
            studyTargetCount: progress.study_target_count,
          },
        }
      : {}),
    streakSummary: input.streakSummary,
    totalCount: input.totalCount,
  };
}

function advanceLesson(
  state: ReadyStudyRouteState,
  outcome: "correct" | "wrong",
): ReadyStudyRouteState {
  const currentIndex = state.exerciseQueue[0];
  if (currentIndex === undefined) return state;
  const currentExercise = state.study.exercises[currentIndex]!;
  const attemptNumber = state.surface.kind === "multiple_choice" || state.surface.kind === "say_it_back"
    ? state.surface.attemptNumber
    : 0;
  const presentationCounts = {
    ...state.presentationCounts,
    [currentExercise.id]: Math.max(state.presentationCounts[currentExercise.id] ?? 0, attemptNumber),
  };
  const firstPassCorrect = outcome === "correct" && attemptNumber === 1;
  const correctCount = state.lastAttemptResult?.session?.first_pass_correct_count
    ?? state.correctCount + (firstPassCorrect ? 1 : 0);
  const remaining = state.exerciseQueue.slice(1);
  const shouldRequeue = outcome === "wrong"
    && (state.lastAttemptResult?.attempts_remaining ?? 0) > 0
    && state.lastAttemptResult?.session?.status !== "completed";
  if (shouldRequeue) {
    // Keep two or three different prompts between a miss and its retry where
    // the remaining lesson is large enough.
    remaining.splice(Math.min(3, remaining.length), 0, currentIndex);
  }
  const completed = (state.lastAttemptResult?.session?.status !== undefined
    && state.lastAttemptResult.session.status !== "active") || remaining.length === 0;
  const nextIndex = remaining[0];
  return {
    ...state,
    correctCount,
    exerciseQueue: remaining,
    presentationCounts,
    surface: completed || nextIndex === undefined
      ? completeSurface({
          correctCount,
          lastAttemptResult: state.lastAttemptResult,
          streakSummary: toStreakSummary(state.post),
          totalCount: state.study.session?.served_count ?? state.study.exercises.length,
        })
      : exerciseSurface(
          state.study.exercises[nextIndex]!,
          (presentationCounts[state.study.exercises[nextIndex]!.id] ?? 0) + 1,
        ),
  };
}

function makeAttemptIdempotencyKey(sessionId: string, exerciseId: string, attemptNumber: number): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `study:${sessionId}:${exerciseId}:${attemptNumber}:${random}`;
}

function getStudyFeedbackAudioContext(): StudyFeedbackAudioState | null {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  studyFeedbackAudio ??= {
    buffers: {},
    context: new AudioContextConstructor(),
    loading: {},
  };
  return studyFeedbackAudio;
}

function loadStudyFeedbackBuffer(outcome: StudyFeedbackOutcome): Promise<AudioBuffer> | null {
  const state = getStudyFeedbackAudioContext();
  if (!state) return null;
  if (state.buffers[outcome]) return Promise.resolve(state.buffers[outcome]);
  state.loading[outcome] ??= fetch(`/sounds/study/${outcome}.mp3`)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load study feedback sound: ${outcome}`);
      return response.arrayBuffer();
    })
    .then((audioData) => state.context.decodeAudioData(audioData))
    .then((buffer) => {
      state.buffers[outcome] = buffer;
      return buffer;
    });
  return state.loading[outcome] ?? null;
}

function preloadStudyFeedbackSounds() {
  for (const outcome of STUDY_FEEDBACK_OUTCOMES) {
    void loadStudyFeedbackBuffer(outcome)?.catch(() => {
      // Feedback audio is non-critical.
    });
  }
}

function unlockStudyFeedbackAudio() {
  const state = getStudyFeedbackAudioContext();
  if (!state) return;
  preloadStudyFeedbackSounds();
  if (state.context.state === "suspended") {
    void state.context.resume().catch(() => {
      // Browsers require a user gesture; this is called from answer selection.
    });
  }
}

function playStudyFeedbackBuffer(outcome: StudyFeedbackOutcome): boolean {
  const state = studyFeedbackAudio;
  const buffer = state?.buffers[outcome];
  if (!state || !buffer) return false;
  const source = state.context.createBufferSource();
  const gain = state.context.createGain();
  gain.gain.value = 0.7;
  source.buffer = buffer;
  source.connect(gain).connect(state.context.destination);
  source.start();
  return true;
}

function playStudyFeedbackSound(outcome: StudyFeedbackOutcome) {
  if (playStudyFeedbackBuffer(outcome)) return;
  void loadStudyFeedbackBuffer(outcome)?.then(() => {
    if (playStudyFeedbackBuffer(outcome)) return;
    playStudyFeedbackSoundElement(outcome);
  }).catch(() => {
    playStudyFeedbackSoundElement(outcome);
  });
}

function playStudyFeedbackSoundElement(outcome: StudyFeedbackOutcome) {
  if (typeof Audio === "undefined") return;
  const audio = new Audio(`/sounds/study/${outcome}.mp3`);
  audio.volume = 0.7;
  void audio.play().catch(() => {
    // Non-critical feedback. Browsers may still block playback in strict modes.
  });
}

function StudyRouteMessage({
  actionLabel,
  onAction,
  message,
  postId,
  title,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  postId: string;
  title: string;
}) {
  return (
    <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Type as="h1" variant="h3">
          {title}
        </Type>
        <Type as="p" className="text-muted-foreground" variant="body">
          {message}
        </Type>
        {actionLabel && onAction ? (
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
        <Button onClick={() => navigate(`/p/${encodeURIComponent(postId)}`)} variant="secondary">
          Open post
        </Button>
      </div>
    </div>
  );
}

function StudyAuthRequiredMessage({ postId }: { postId: string }) {
  const { busy, configured, connect, loadError } = usePiratePrivyRuntime();

  return (
    <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Type as="h1" variant="h3">
          Sign in to study
        </Type>
        {configured && connect ? (
          <Button loading={busy} onClick={connect}>
            Sign in
          </Button>
        ) : null}
        {loadError ? (
          <Type as="p" className="text-muted-foreground" variant="caption">
            Authentication is unavailable right now.
          </Type>
        ) : null}
        <Button onClick={() => navigate(`/p/${encodeURIComponent(postId)}`)} variant="secondary">
          Open post
        </Button>
      </div>
    </div>
  );
}

export function StudyRoutePage({ postId }: { postId: string }) {
  const api = useApi();
  const session = useSession();
  const hydrated = useClientHydrated();
  const { configured, loaded } = usePiratePrivyRuntime();
  const contentLocale = useRouteContentLocale();
  const [state, setState] = React.useState<StudyRouteState>({ phase: "loading" });
  const [rewardQualification, setRewardQualification] = React.useState<ApiRewardQualificationSummary | null>(null);
  const [rewardCheckDelayed, setRewardCheckDelayed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const recordingStreamRef = React.useRef<MediaStream | null>(null);
  const pendingMultipleChoiceAttemptRef = React.useRef<string | null>(null);
  const attemptIdempotencyKeysRef = React.useRef(new Map<string, string>());

  const attemptIdempotencyKey = React.useCallback((sessionId: string, exerciseId: string, attemptNumber: number) => {
    const logicalAttempt = `${sessionId}:${exerciseId}:${attemptNumber}`;
    const existing = attemptIdempotencyKeysRef.current.get(logicalAttempt);
    if (existing) return existing;
    const created = makeAttemptIdempotencyKey(sessionId, exerciseId, attemptNumber);
    attemptIdempotencyKeysRef.current.set(logicalAttempt, created);
    return created;
  }, []);

  const stopRecordingStream = React.useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  React.useEffect(() => () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    stopRecordingStream();
  }, [stopRecordingStream]);

  const studyComplete = state.phase === "ready" && state.surface.kind === "complete";
  const completedRewardOffer = state.phase === "ready" ? state.rewardOffer : null;
  React.useEffect(() => {
    if (!studyComplete || !completedRewardOffer || !session?.accessToken) return;
    let cancelled = false;
    let timeout: number | undefined;
    let attempt = 0;
    const poll = async () => {
      const summary = await api.rewards.getSummary().catch(() => null);
      if (cancelled) return;
      const qualification = summary?.recent_qualifications?.find((item) =>
        item.post_id === postId && item.qualification_basis === "study"
      ) ?? null;
      if (qualification) {
        setRewardQualification(qualification);
        if (qualification.status !== "checking") return;
      }
      if (attempt < 5) {
        timeout = window.setTimeout(() => { void poll(); }, 1_500 * 2 ** attempt++);
      } else {
        setRewardCheckDelayed(true);
      }
    };
    setRewardQualification(null);
    setRewardCheckDelayed(false);
    void poll();
    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [api, completedRewardOffer, postId, session?.accessToken, studyComplete]);

  React.useEffect(() => {
    let canceled = false;

    async function loadStudy() {
      if (!hydrated) {
        return;
      }

      if (!session?.accessToken) {
        setState({ phase: "auth_required" });
        return;
      }

      setState({ phase: "loading" });
      try {
        const post = await loadSongRoutePost({ api, contentLocale, hasAccessToken: true, postId });
        if (canceled) return;

        if (post.post.post_type !== "song") {
          setState({
            phase: "blocked",
            title: "Study",
            message: "This post is not a song.",
          });
          return;
        }

        const [study, rewardOffer] = await Promise.all([
          api.communities.getPostStudy(post.post.community, post.post.id, {
            targetLanguage: contentLocale,
          }),
          api.rewards.getActiveCampaignForSong(post.post.community, post.post.id).catch(() => null),
        ]);
        if (canceled) return;

        if (study.access === "locked") {
          setState({
            phase: "locked",
            post,
            rewardOffer,
            study,
            surface: lockedSurface(study),
          });
          return;
        }

        if (study.access === "processing") {
          setState({
            phase: "blocked",
            title: pageTitle(post, study),
            message: "Study is still being prepared for this song.",
          });
          return;
        }

        if (study.access === "unavailable") {
          setState({
            phase: "blocked",
            title: pageTitle(post, study),
            message: "Study is not available for this song.",
          });
          return;
        }

        if (study.exercises.length === 0 || !study.session?.id) {
          const hasNextDue = Boolean(study.session?.next_due_at);
          setState({
            actionLabel: hasNextDue ? "Check again" : undefined,
            phase: "blocked",
            title: pageTitle(post, study),
            message: caughtUpMessage(study),
          });
          return;
        }

        const exerciseQueue = study.exercises.flatMap((exercise, index) => (
          exercise.mastered
          || Number(exercise.presentation_count ?? 0) >= Math.max(1, exercise.max_attempts || 1)
            ? []
            : [index]
        ));
        const presentationCounts = Object.fromEntries(
          study.exercises.map((exercise) => [exercise.id, Number(exercise.presentation_count ?? 0)]),
        );
        const firstIndex = exerciseQueue[0];
        if (firstIndex === undefined) {
          setState({
            phase: "blocked",
            title: pageTitle(post, study),
            message: "This lesson is complete.",
          });
          return;
        }
        setState({
          correctCount: study.session.first_pass_correct_count,
          exerciseQueue,
          phase: "ready",
          post,
          presentationCounts,
          rewardOffer,
          study,
          surface: exerciseSurface(study.exercises[firstIndex]!),
        });
        preloadStudyFeedbackSounds();
      } catch (error) {
        if (canceled) return;
        if (isApiAuthError(error)) {
          setState({ phase: "auth_required" });
          return;
        }
        setState({
          phase: "error",
          title: "Study",
          message: getErrorMessage(error, "Could not open study for this song."),
        });
      }
    }

    void loadStudy();

    return () => {
      canceled = true;
    };
  }, [api, contentLocale, hydrated, postId, reloadKey, session?.accessToken]);

  const submitMultipleChoiceAttempt = React.useCallback((
    readyState: ReadyStudyRouteState,
    surface: MultipleChoiceSurfaceState,
    selectedOptionId: string,
  ) => {
    if (surface.result || surface.submitting) return;
    unlockStudyFeedbackAudio();
    const pendingKey = `${surface.exercise.id}:${surface.attemptNumber}`;
    if (pendingMultipleChoiceAttemptRef.current === pendingKey) return;
    pendingMultipleChoiceAttemptRef.current = pendingKey;

    const exercise = surface.exercise;
    const studySessionId = readyState.study.session?.id;
    if (!studySessionId) return;
    setState((current) => {
      if (
        current.phase !== "ready"
        || current.surface.kind !== "multiple_choice"
        || current.surface.exercise.id !== exercise.id
        || current.surface.result
        || current.surface.submitting
      ) {
        pendingMultipleChoiceAttemptRef.current = null;
        return current;
      }
      return {
        ...current,
        surface: {
          ...current.surface,
          selectedOptionId,
          submitError: undefined,
          submitting: true,
        },
      };
    });

    void api.communities.submitPostStudyAttempt(readyState.post.post.community, readyState.post.post.id, {
      attempt_number: surface.attemptNumber,
      exercise_id: exercise.id,
      idempotency_key: attemptIdempotencyKey(studySessionId, exercise.id, surface.attemptNumber),
      session_id: studySessionId,
      selected_option_id: selectedOptionId,
      type: "translation_choice",
    }).then((result) => {
      pendingMultipleChoiceAttemptRef.current = null;
      playStudyFeedbackSound(result.outcome === "correct" ? "correct" : "incorrect");
      setState((current) => {
        if (current.phase !== "ready" || current.surface.kind !== "multiple_choice" || current.surface.exercise.id !== exercise.id) {
          return current;
        }
        return {
          ...current,
          lastAttemptResult: result,
          surface: {
            ...current.surface,
            exercise: {
              ...current.surface.exercise,
              correctOptionId: result.correct_option_id ?? current.surface.exercise.correctOptionId,
            },
            canRetry: false,
            result: result.outcome === "correct" ? "correct" : "wrong",
            submitting: false,
          },
        };
      });
    }).catch((error) => {
      pendingMultipleChoiceAttemptRef.current = null;
      setState((current) => {
        if (current.phase !== "ready" || current.surface.kind !== "multiple_choice" || current.surface.exercise.id !== exercise.id) {
          return current;
        }
        return {
          ...current,
          surface: {
            ...current.surface,
            selectedOptionId: undefined,
            submitError: getErrorMessage(error, "Could not record this answer. Try again."),
            submitting: false,
          },
        };
      });
    });
  }, [api, attemptIdempotencyKey]);

  const handlePrimaryAction = React.useCallback(() => {
    if (state.phase === "locked") {
      navigate(`/p/${encodeURIComponent(postId)}`);
      return;
    }

    if (state.phase !== "ready") return;

    if (state.surface.kind === "multiple_choice") {
      if (state.surface.result) {
        setState(advanceLesson(state, state.surface.result));
        return;
      }

      if (state.surface.selectedOptionId) {
        submitMultipleChoiceAttempt(state, state.surface, state.surface.selectedOptionId);
      }
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "idle") {
      unlockStudyFeedbackAudio();
      const sayItBackSurface = state.surface;
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setState({
          ...state,
          surface: {
            ...state.surface,
            phase: "wrong",
            transcript: "Voice recording is not available in this browser.",
          },
        });
        return;
      }
      void (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/mp4",
          ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          recordingStreamRef.current = stream;
          recorderRef.current = recorder;
          recordingChunksRef.current = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordingChunksRef.current.push(event.data);
            }
          };
          recorder.onerror = () => {
            stopRecordingStream();
            setState((current) => current.phase === "ready" && current.surface.kind === "say_it_back"
              ? {
                  ...current,
                  surface: {
                    ...current.surface,
                    phase: "wrong",
                    transcript: "Could not record audio.",
                  },
                }
              : current);
          };
          recorder.onstop = () => {
            const chunks = recordingChunksRef.current;
            const type = recorder.mimeType || mimeType || "audio/webm";
            recorderRef.current = null;
            stopRecordingStream();
            if (chunks.length === 0) {
              setState((current) => current.phase === "ready" && current.surface.kind === "say_it_back"
                ? {
                    ...current,
                    surface: {
                      ...current.surface,
                      phase: "wrong",
                      transcript: "No audio was recorded.",
                    },
                  }
                : current);
              return;
            }
            const blob = new Blob(chunks, { type });
            if (blob.size <= 0) {
              setState((current) => current.phase === "ready" && current.surface.kind === "say_it_back"
                ? {
                    ...current,
                    surface: {
                      ...current.surface,
                      phase: "wrong",
                      transcript: "No audio was recorded.",
                    },
                  }
                : current);
              return;
            }
            const exercise = sayItBackSurface.exercise;
            const studySessionId = state.study.session?.id;
            if (!studySessionId) {
              setState({ phase: "error", title: pageTitle(state.post, state.study), message: "Study session expired. Reopen the lesson." });
              return;
            }
            setState((current) => current.phase === "ready" && current.surface.kind === "say_it_back" && current.surface.exercise.id === exercise.id
              ? {
                  ...current,
                  surface: {
                    ...current.surface,
                    phase: "checking",
                  },
                }
              : current);
            void api.communities.transcribePostStudyAudio(state.post.post.community, state.post.post.id, {
              file: new File([blob], "study-say-it-back.webm", { type }),
            }).then((transcription) => api.communities.submitPostStudyAttempt(state.post.post.community, state.post.post.id, {
                attempt_number: sayItBackSurface.attemptNumber,
                exercise_id: exercise.id,
                idempotency_key: attemptIdempotencyKey(studySessionId, exercise.id, sayItBackSurface.attemptNumber),
                session_id: studySessionId,
                transcript: transcription.text,
                type: "say_it_back",
              }).then((result) => ({ result, transcript: transcription.text })))
              .then(({ result, transcript }) => {
                playStudyFeedbackSound(result.outcome === "correct" ? "correct" : "incorrect");
                setState((current) => {
                  if (current.phase !== "ready" || current.surface.kind !== "say_it_back" || current.surface.exercise.id !== exercise.id) {
                    return current;
                  }
                  const correct = result.outcome === "correct";
                  return {
                    ...current,
                    lastAttemptResult: result,
                    surface: {
                      ...current.surface,
                      attemptNumber: current.surface.attemptNumber,
                      feedback: result.feedback,
                      phase: correct ? "correct" : "wrong",
                      revealReference: !correct,
                      submitError: undefined,
                      transcript,
                    },
                  };
                });
              })
              .catch((error) => {
                setState((current) => current.phase === "ready"
                  && current.surface.kind === "say_it_back"
                  && current.surface.exercise.id === exercise.id
                  ? {
                      ...current,
                      surface: {
                        ...current.surface,
                        phase: "idle",
                        submitError: getErrorMessage(error, "Could not submit this study attempt. Try again."),
                      },
                    }
                  : current);
              });
          };
          recorder.start();
          setState({
            ...state,
            surface: {
              ...sayItBackSurface,
              phase: "listening",
              submitError: undefined,
            },
          });
        } catch (error) {
          stopRecordingStream();
          setState({
            ...state,
            surface: {
              ...sayItBackSurface,
              phase: "wrong",
              transcript: getErrorMessage(error, "Could not start microphone."),
            },
          });
        }
      })();
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "listening") {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "wrong") {
      if (!state.surface.revealReference) {
        setState({
          ...state,
          surface: {
            ...state.surface,
            feedback: undefined,
            phase: "idle",
            revealReference: false,
            transcript: undefined,
          },
        });
        return;
      }
      setState(advanceLesson(state, "wrong"));
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "correct") {
      setState(advanceLesson(state, "correct"));
    }
  }, [api, attemptIdempotencyKey, postId, state, stopRecordingStream, submitMultipleChoiceAttempt]);

  const handleOptionSelect = React.useCallback((optionId: string) => {
    if (state.phase !== "ready" || state.surface.kind !== "multiple_choice" || state.surface.result || state.surface.submitting) {
      return;
    }
    submitMultipleChoiceAttempt(state, state.surface, optionId);
  }, [state, submitMultipleChoiceAttempt]);

  if (!hydrated || (configured && !loaded)) {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background text-foreground">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!session?.accessToken || state.phase === "auth_required") {
    return <StudyAuthRequiredMessage postId={postId} />;
  }

  if (state.phase === "loading") {
    return (
      <div className="flex h-dvh min-h-screen w-full items-center justify-center bg-background text-foreground">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (state.phase === "blocked" || state.phase === "error") {
    return (
      <StudyRouteMessage
        actionLabel={state.phase === "blocked" ? state.actionLabel : undefined}
        message={state.message}
        onAction={state.phase === "blocked" && state.actionLabel ? () => setReloadKey((value) => value + 1) : undefined}
        postId={postId}
        title={state.title}
      />
    );
  }


  return (
    <SongStudySurface
      artistName={state.study.artist_name ?? undefined}
      artworkSrc={pageArtwork(state.post, state.study)}
      className="h-dvh"
      onExit={() => navigate(routeReturnPath(`/p/${encodeURIComponent(postId)}`))}
      onOptionSelect={handleOptionSelect}
      onPrimaryAction={handlePrimaryAction}
      onKaraoke={state.surface.kind === "complete"
        ? () => navigate(`/p/${encodeURIComponent(postId)}/karaoke`)
        : undefined}
      onStudyAgain={state.surface.kind === "complete"
        ? () => setReloadKey((value) => value + 1)
        : undefined}
      rewardSlot={state.rewardOffer && state.rewardOffer.eligible_activity !== "karaoke" ? (
        state.surface.kind === "complete" ? (
          <RewardQualificationNotice
            amountLabel={rewardAmountLabel(state.rewardOffer.daily_reward_cents, state.rewardOffer.chain_id)}
            expiresAt={rewardQualification?.expires_at}
            outcomeReason={rewardQualification?.outcome_reason}
            status={displayedRewardQualificationStatus(rewardQualification?.status, rewardCheckDelayed)}
            testMode={state.rewardOffer.chain_id === 84532}
          />
        ) : (
          <SongRewardOffer
            amountLabel={rewardAmountLabel(state.rewardOffer.daily_reward_cents, state.rewardOffer.chain_id)}
            eligibleActivity={state.rewardOffer.eligible_activity}
            minScoreBps={state.rewardOffer.min_score_bps}
          />
        )
      ) : undefined}
      state={state.surface}
      title={pageTitle(state.post, state.study)}
    />
  );
}
