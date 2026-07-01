"use client";

import * as React from "react";
import type { LocalizedPostResponse } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import {
  SongStudySurface,
  type SongStudyMultipleChoiceExercise,
  type SongStudySayItBackExercise,
  type SongStudySurfaceState,
} from "@/components/compositions/song-study/song-study-surface";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { Button } from "@/components/primitives/button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useClientHydrated } from "@/hooks/use-client-hydrated";
import { useRouteContentLocale } from "@/hooks/use-route-content-locale";
import { isApiAuthError } from "@/lib/api/client";
import type { SongStudyExercise, SongStudyPayload } from "@/lib/api/client-api-types";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getErrorMessage } from "@/lib/error-utils";

type StudyRouteState =
  | { phase: "loading" }
  | { phase: "auth_required" }
  | {
      correctCount: number;
      exerciseIndex: number;
      phase: "ready";
      post: LocalizedPostResponse;
      study: SongStudyPayload;
      surface: SongStudySurfaceState;
    }
  | { phase: "locked"; post: LocalizedPostResponse; study: SongStudyPayload; surface: SongStudySurfaceState }
  | { phase: "blocked"; message: string; title: string }
  | { phase: "error"; message: string; title: string };

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

function startSurface(study: SongStudyPayload): SongStudySurfaceState {
  return {
    kind: "start",
    exerciseCount: Math.max(1, study.exercise_count),
    progressLabel: "New study pack",
    sourceLanguageLabel: study.source_language || "Original lyrics",
    targetLanguageLabel: study.target_language || "Practice",
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

function exerciseSurface(exercise: SongStudyExercise): SongStudySurfaceState {
  return exercise.type === "translation_choice"
    ? {
        kind: "multiple_choice",
        attemptNumber: 1,
        exercise: toMultipleChoiceExercise(exercise),
      }
    : {
        kind: "say_it_back",
        attemptNumber: 1,
        exercise: toSayItBackExercise(exercise),
        phase: "idle",
      };
}

function completeSurface(input: { correctCount: number; totalCount: number }): SongStudySurfaceState {
  return {
    kind: "complete",
    correctCount: input.correctCount,
    scorePercent: input.totalCount > 0 ? (input.correctCount / input.totalCount) * 100 : 0,
    totalCount: input.totalCount,
  };
}

function makeAttemptIdempotencyKey(exerciseId: string, attemptNumber: number): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `study:${exerciseId}:${attemptNumber}:${random}`;
}

function StudyRouteMessage({
  message,
  postId,
  title,
}: {
  message: string;
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
        <Type as="p" className="text-muted-foreground" variant="body">
          Study requires a Pirate account.
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
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingChunksRef = React.useRef<BlobPart[]>([]);
  const recordingStreamRef = React.useRef<MediaStream | null>(null);

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

  React.useEffect(() => {
    let canceled = false;

    async function loadPost(): Promise<LocalizedPostResponse> {
      return await api.posts.get(postId, { locale: contentLocale });
    }

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
        const post = await loadPost();
        if (canceled) return;

        if (post.post.post_type !== "song") {
          setState({
            phase: "blocked",
            title: "Study",
            message: "This post is not a song.",
          });
          return;
        }

        const study = await api.communities.getPostStudy(post.post.community, post.post.id, {
          targetLanguage: contentLocale,
        });
        if (canceled) return;

        if (study.access === "locked") {
          setState({
            phase: "locked",
            post,
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

        if (study.exercises.length === 0) {
          setState({
            phase: "blocked",
            title: pageTitle(post, study),
            message: "Study has no exercises yet.",
          });
          return;
        }

        setState({
          correctCount: 0,
          exerciseIndex: 0,
          phase: "ready",
          post,
          study,
          surface: startSurface(study),
        });
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
  }, [api, contentLocale, hydrated, postId, session?.accessToken]);

  const handlePrimaryAction = React.useCallback(() => {
    if (state.phase === "locked") {
      navigate(`/p/${encodeURIComponent(postId)}`);
      return;
    }

    if (state.phase !== "ready") return;

    if (state.surface.kind === "start") {
      const exercise = state.study.exercises[0] ?? null;
      if (!exercise) return;
      setState({
        ...state,
        correctCount: 0,
        exerciseIndex: 0,
        surface: exerciseSurface(exercise),
      });
      return;
    }

    if (state.surface.kind === "multiple_choice") {
      if (state.surface.result) {
        if (state.surface.result === "wrong" && state.surface.canRetry) {
          setState({
            ...state,
            surface: {
              ...state.surface,
              attemptNumber: state.surface.attemptNumber + 1,
              canRetry: false,
              result: undefined,
              selectedOptionId: undefined,
            },
          });
          return;
        }
        const nextCorrectCount = state.correctCount + (state.surface.result === "correct" ? 1 : 0);
        const nextIndex = state.exerciseIndex + 1;
        const nextExercise = state.study.exercises[nextIndex] ?? null;
        setState({
          ...state,
          correctCount: nextCorrectCount,
          exerciseIndex: nextIndex,
          surface: nextExercise
            ? exerciseSurface(nextExercise)
            : completeSurface({ correctCount: nextCorrectCount, totalCount: state.study.exercises.length }),
        });
        return;
      }

      const selectedOptionId = state.surface.selectedOptionId;
      if (!selectedOptionId || state.surface.submitting) return;

      const exercise = state.surface.exercise;
      setState({
        ...state,
        surface: {
          ...state.surface,
          submitting: true,
        },
      });
      void api.communities.submitPostStudyAttempt(state.post.post.community, state.post.post.id, {
        attempt_number: state.surface.attemptNumber,
        exercise_id: exercise.id,
        idempotency_key: makeAttemptIdempotencyKey(exercise.id, state.surface.attemptNumber),
        selected_option_id: selectedOptionId,
        type: "translation_choice",
      }).then((result) => {
        setState((current) => {
          if (current.phase !== "ready" || current.surface.kind !== "multiple_choice" || current.surface.exercise.id !== exercise.id) {
            return current;
          }
          return {
            ...current,
            surface: {
              ...current.surface,
              exercise: {
                ...current.surface.exercise,
                correctOptionId: result.correct_option_id ?? current.surface.exercise.correctOptionId,
              },
              canRetry: result.outcome !== "correct" && result.attempts_remaining > 0,
              result: result.outcome === "correct" ? "correct" : "wrong",
              submitting: false,
            },
          };
        });
      }).catch((error) => {
        setState({
          phase: "error",
          title: pageTitle(state.post, state.study),
          message: getErrorMessage(error, "Could not submit this study attempt."),
        });
      });
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "idle") {
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
                idempotency_key: makeAttemptIdempotencyKey(exercise.id, sayItBackSurface.attemptNumber),
                transcript: transcription.text,
                type: "say_it_back",
              }).then((result) => ({ result, transcript: transcription.text })))
              .then(({ result, transcript }) => {
                setState((current) => {
                  if (current.phase !== "ready" || current.surface.kind !== "say_it_back" || current.surface.exercise.id !== exercise.id) {
                    return current;
                  }
                  const correct = result.outcome === "correct";
                  const attemptsUsed = result.attempts_remaining <= 0;
                  return {
                    ...current,
                    surface: {
                      ...current.surface,
                      attemptNumber: current.surface.attemptNumber,
                      feedback: result.feedback,
                      phase: correct ? "correct" : "wrong",
                      revealReference: !correct && (attemptsUsed || result.outcome === "revealed"),
                      transcript,
                    },
                  };
                });
              })
              .catch((error) => {
                setState({
                  phase: "error",
                  title: pageTitle(state.post, state.study),
                  message: getErrorMessage(error, "Could not transcribe this study attempt."),
                });
              });
          };
          recorder.start();
          setState({
            ...state,
            surface: {
              ...sayItBackSurface,
              phase: "listening",
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
      if (state.surface.attemptNumber < state.surface.exercise.maxAttempts && !state.surface.revealReference) {
        setState({
          ...state,
          surface: {
            ...state.surface,
            attemptNumber: state.surface.attemptNumber + 1,
            feedback: undefined,
            phase: "idle",
            revealReference: false,
            transcript: undefined,
          },
        });
        return;
      }
      setState({
        ...state,
        exerciseIndex: state.exerciseIndex + 1,
        surface: state.study.exercises[state.exerciseIndex + 1]
          ? exerciseSurface(state.study.exercises[state.exerciseIndex + 1]!)
          : completeSurface({ correctCount: state.correctCount, totalCount: state.study.exercises.length }),
      });
      return;
    }

    if (state.surface.kind === "say_it_back" && state.surface.phase === "correct") {
      const nextCorrectCount = state.correctCount + 1;
      const nextIndex = state.exerciseIndex + 1;
      const nextExercise = state.study.exercises[nextIndex] ?? null;
      setState({
        ...state,
        correctCount: nextCorrectCount,
        exerciseIndex: nextIndex,
        surface: nextExercise
          ? exerciseSurface(nextExercise)
          : completeSurface({ correctCount: nextCorrectCount, totalCount: state.study.exercises.length }),
      });
    }
  }, [api, postId, state, stopRecordingStream]);

  const handleOptionSelect = React.useCallback((optionId: string) => {
    setState((current) => {
      if (current.phase !== "ready" || current.surface.kind !== "multiple_choice" || current.surface.result) {
        return current;
      }
      return {
        ...current,
        surface: {
          ...current.surface,
          selectedOptionId: optionId,
        },
      };
    });
  }, []);

  const handleSecondaryAction = React.useCallback(() => {
    navigate(`/p/${encodeURIComponent(postId)}/karaoke`);
  }, [postId]);

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
    return <StudyRouteMessage message={state.message} postId={postId} title={state.title} />;
  }

  return (
    <SongStudySurface
      artistName={undefined}
      artworkSrc={pageArtwork(state.post, state.study)}
      className="h-dvh"
      onExit={() => navigate(`/p/${encodeURIComponent(postId)}`)}
      onOptionSelect={handleOptionSelect}
      onPrimaryAction={handlePrimaryAction}
      onSecondaryAction={handleSecondaryAction}
      state={state.surface}
      title={pageTitle(state.post, state.study)}
    />
  );
}
