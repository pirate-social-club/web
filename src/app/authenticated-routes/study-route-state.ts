import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { toStreakSummary } from "@/app/authenticated-helpers/post-media-presentation";
import type {
  SongStudyFillBlankExercise,
  SongStudyMultipleChoiceExercise,
  SongStudySayItBackExercise,
  SongStudySurfaceState,
} from "@/components/compositions/song-study/song-study-surface";
import type {
  ApiPublicRewardOffer,
  SongStudyAttemptResult,
  SongStudyExercise,
  SongStudyPayload,
} from "@/lib/api/client-api-types";

export type StudyRouteState =
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
  | { message: string; phase: "verification_required"; title: string }
  | { phase: "error"; message: string; title: string };

export type ReadyStudyRouteState = Extract<StudyRouteState, { phase: "ready" }>;
export type MultipleChoiceSurfaceState = Extract<SongStudySurfaceState, { kind: "multiple_choice" }>;
export type FillBlankSurfaceState = Extract<SongStudySurfaceState, { kind: "fill_blank" }>;

export const LEGACY_SAY_IT_BACK_ATTEMPTS_PER_APPEARANCE = 2;

export function usesFillBlankOrchestration(study: SongStudyPayload): boolean {
  // The fill-blank card is the rollout marker available in today's payload.
  // If generation yields no usable cloze card, Web deliberately stays on the
  // legacy revision-absent queue; the API compatibility path supports it.
  return study.exercises.some((exercise) => exercise.type === "fill_blank");
}

export function pageTitle(post: LocalizedPostResponse | null, study?: SongStudyPayload | null): string {
  return study?.title?.trim()
    || post?.song_presentation?.title?.trim()
    || post?.post.song_title?.trim()
    || post?.post.title?.trim()
    || "Study";
}

export function pageArtwork(post: LocalizedPostResponse | null, study?: SongStudyPayload | null): string | undefined {
  return study?.artwork_src?.trim() || post?.song_presentation?.cover_art_ref || undefined;
}

export function lockedSurface(_study: SongStudyPayload): SongStudySurfaceState {
  return { kind: "locked", priceLabel: undefined };
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
    // The server withholds this until an attempt is spent.
    correctOptionId: "",
  };
}

function toFillBlankExercise(exercise: Extract<SongStudyExercise, { type: "fill_blank" }>): SongStudyFillBlankExercise {
  return {
    id: exercise.id,
    prompt: exercise.prompt_text,
    segments: exercise.segments,
    tokens: exercise.tokens,
  };
}

export function exerciseSurface(
  exercise: SongStudyExercise,
  attemptNumber = Number(exercise.presentation_count ?? 0) + 1,
): SongStudySurfaceState {
  if (exercise.type === "translation_choice") {
    return { kind: "multiple_choice", attemptNumber, exercise: toMultipleChoiceExercise(exercise) };
  }
  if (exercise.type === "fill_blank") {
    return { kind: "fill_blank", attemptNumber, exercise: toFillBlankExercise(exercise), selectedTokenIds: [] };
  }
  if (exercise.type === "say_it_back") {
    return { kind: "say_it_back", attemptNumber, exercise: toSayItBackExercise(exercise), phase: "idle" };
  }
  throw new Error("Unsupported study exercise type");
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

export function caughtUpMessage(study: SongStudyPayload): string {
  const nextReviewLabel = formatNextReviewLabel(study.session?.next_due_at);
  if (!nextReviewLabel) return "You're caught up for this song.";
  return `You're caught up for this song. Review again ${nextReviewLabel} to keep going.`;
}

function completeSurface(input: {
  correctCount: number;
  lastAttemptResult?: SongStudyAttemptResult;
  previousStreak?: number;
  totalCount: number;
}): SongStudySurfaceState {
  const progress = input.lastAttemptResult?.study_progress;
  return {
    kind: "complete",
    correctCount: input.correctCount,
    nextReviewLabel: formatNextReviewLabel(progress?.next_due_at),
    previousStreak: input.previousStreak,
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
    totalCount: input.totalCount,
  };
}

export function advanceLesson(
  state: ReadyStudyRouteState,
  outcome: "correct" | "wrong",
): ReadyStudyRouteState {
  const authoritative = usesFillBlankOrchestration(state.study)
    ? state.lastAttemptResult?.lesson
    : undefined;
  if (authoritative) {
    const correctCount = state.lastAttemptResult?.session?.first_pass_correct_count ?? state.correctCount;
    const nextPrompt = authoritative.next?.prompt;
    const exercises = nextPrompt
      ? state.study.exercises.some((exercise) => exercise.id === nextPrompt.id)
        ? state.study.exercises.map((exercise) => exercise.id === nextPrompt.id ? nextPrompt : exercise)
        : [...state.study.exercises, nextPrompt]
      : state.study.exercises;
    const nextIndex = nextPrompt ? exercises.findIndex((exercise) => exercise.id === nextPrompt.id) : -1;
    return {
      ...state,
      correctCount,
      exerciseQueue: nextIndex >= 0 ? [nextIndex] : [],
      study: {
        ...state.study,
        exercises,
        lesson: authoritative,
        ...(state.lastAttemptResult?.session ? { session: state.lastAttemptResult.session } : {}),
      },
      surface: !nextPrompt || authoritative.completion_reason
        ? completeSurface({
            correctCount,
            lastAttemptResult: state.lastAttemptResult,
            previousStreak: toStreakSummary(state.post)?.viewer?.current_streak,
            totalCount: authoritative.total_count,
          })
        : exerciseSurface(nextPrompt, authoritative.next!.presentation_number),
    };
  }

  const currentIndex = state.exerciseQueue[0];
  if (currentIndex === undefined) return state;
  const currentExercise = state.study.exercises[currentIndex]!;
  const attemptNumber = state.surface.kind === "multiple_choice" || state.surface.kind === "say_it_back" || state.surface.kind === "fill_blank"
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
    && remaining.length > 0
    && (state.lastAttemptResult?.attempts_remaining ?? 0) > 0
    && state.lastAttemptResult?.session?.status !== "completed";
  if (shouldRequeue) remaining.splice(Math.min(3, remaining.length), 0, currentIndex);
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
          previousStreak: toStreakSummary(state.post)?.viewer?.current_streak,
          totalCount: state.study.session?.served_count ?? state.study.exercises.length,
        })
      : exerciseSurface(
          state.study.exercises[nextIndex]!,
          (presentationCounts[state.study.exercises[nextIndex]!.id] ?? 0) + 1,
        ),
  };
}
