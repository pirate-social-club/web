import type * as React from "react";

import type { SongStreakSummary } from "./song-streak-preview";

interface SongStudyOption {
  id: string;
  text: string;
}

export interface SongStudySayItBackExercise {
  id: string;
  lineNumber: number;
  maxAttempts: number;
  prompt: string;
  translation?: string;
  expected: string;
}

export interface SongStudyMultipleChoiceExercise {
  id: string;
  lineNumber: number;
  maxAttempts: number;
  prompt: string;
  question: string;
  options: SongStudyOption[];
  correctOptionId: string;
}

export interface SongStudyFillBlankExercise {
  id: string;
  prompt: string;
  segments: Array<{ kind: "text"; text: string } | { id: string; kind: "blank" }>;
  tokens: SongStudyOption[];
}

export type SongStudySurfaceState =
  | {
    kind: "locked";
    priceLabel?: string;
  }
  | {
    kind: "say_it_back";
    attemptNumber: number;
    /** Attempts spent on this appearance of the card. */
    attemptsThisAppearance?: number;
    exercise: SongStudySayItBackExercise;
    guidance?: string;
    /** What speech-to-text heard on the last miss. */
    heardTranscript?: string;
    phase: "idle" | "listening" | "checking" | "wrong";
    /** True once the card is spent, so the miss is final rather than retryable. */
    revealReference?: boolean;
    /** Whether a spent card is coming back later in this lesson. */
    willReturn?: boolean;
    submitError?: string;
  }
  | {
    kind: "multiple_choice";
    attemptNumber: number;
    canRetry?: boolean;
    exercise: SongStudyMultipleChoiceExercise;
    result?: "correct" | "wrong";
    selectedOptionId?: string;
    submitError?: string;
    submitting?: boolean;
  }
  | {
    kind: "fill_blank";
    attemptNumber: number;
    correctPlacements?: Array<{ blank_id: string; token_id: string }>;
    exercise: SongStudyFillBlankExercise;
    result?: "correct" | "wrong";
    selectedTokenIds: string[];
    submitError?: string;
    submitting?: boolean;
  }
  | {
    kind: "complete";
    correctCount: number;
    nextReviewLabel?: string;
    /** Pre-session streak, used only for the slot-number animation. */
    previousStreak?: number;
    scorePercent: number;
    streak?: {
      currentStreak: number;
      qualifiedToday: boolean;
      studyAttemptsToday: number;
      studyCorrectCount: number;
      studyTargetCount: number;
    };
    /** Fresh post-completion leaderboard (server-ranked). */
    streakSummary?: SongStreakSummary;
    totalCount: number;
  };

export interface SongStudySurfaceProps {
  artworkSrc?: string;
  className?: string;
  lessonProgress?: {
    resolvedCount: number;
    totalCount: number;
  };
  onExit?: () => void;
  onFillBlankClear?: () => void;
  onFillBlankTokenSelect?: (tokenId: string) => void;
  onFillBlankUndo?: () => void;
  onKaraoke?: () => void;
  onOptionSelect?: (optionId: string) => void;
  onPrimaryAction?: () => void;
  onStudyAgain?: () => void;
  rewardSlot?: React.ReactNode;
  sayItBackIdleLabel?: string;
  state: SongStudySurfaceState;
}
