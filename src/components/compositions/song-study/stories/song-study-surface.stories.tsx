import type { Meta, StoryObj } from "@storybook/react-vite";

import { SongRewardOfferPill } from "@/components/compositions/rewards/reward-surfaces";

import {
  SongStudySurface,
  type SongStudyFillBlankExercise,
  type SongStudyMultipleChoiceExercise,
  type SongStudySayItBackExercise,
} from "../song-study-surface";
import {
  boardEntries,
  makeEntry,
  summary,
  viewerDead,
  viewerNotRanked,
  viewerRankedBehind,
  viewerRankedLockedIn,
} from "./streak-fixtures";

const artworkSrc = "https://picsum.photos/seed/pirate-study/160/160";

const baseProps = {
  artworkSrc,
  onExit: () => undefined,
  onKaraoke: () => undefined,
  onPrimaryAction: () => undefined,
  onStudyAgain: () => undefined,
};

const sayItBackExercise: SongStudySayItBackExercise = {
  id: "line-3-say-it-back",
  lineNumber: 3,
  maxAttempts: 2,
  prompt: "Hold on till the morning light",
  translation: "Aguanta hasta la luz de la mañana",
  expected: "Hold on till the morning light",
};

const multipleChoiceExercise: SongStudyMultipleChoiceExercise = {
  id: "line-5-translation-choice",
  lineNumber: 5,
  maxAttempts: 1,
  prompt: "We drift where the current goes",
  question: "Choose the best translation.",
  correctOptionId: "correct",
  options: [
    { id: "distractor-1", text: "Corremos antes de que llegue la noche" },
    { id: "correct", text: "Derivamos hacia donde va la corriente" },
    { id: "distractor-2", text: "Esperamos hasta que el viento cambie" },
    { id: "distractor-3", text: "Bailamos mientras sube la marea" },
  ],
};

const fillBlankExercise: SongStudyFillBlankExercise = {
  id: "line-7-fill-blank",
  prompt: "Fill in the lyric.",
  segments: [
    { kind: "text", text: "We " },
    { id: "blank_1", kind: "blank" },
    { kind: "text", text: " where the " },
    { id: "blank_2", kind: "blank" },
    { kind: "text", text: " goes" },
  ],
  tokens: [
    { id: "token_1", text: "current" },
    { id: "token_2", text: "morning" },
    { id: "token_3", text: "drift" },
    { id: "token_4", text: "wait" },
  ],
};

const meta = {
  title: "Compositions/Song Study/SongStudySurface",
  component: SongStudySurface,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SongStudySurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LockedNotEntitled: Story = {
  name: "Study / Locked — not entitled",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "locked",
        priceLabel: "$3.99",
      }}
    />
  ),
};

export const SayItBackIdle: Story = {
  name: "Study / Say it back — idle",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 1,
        exercise: sayItBackExercise,
        phase: "idle",
      }}
    />
  ),
};

export const ProgressStart: Story = {
  name: "Study / Progress — start",
  render: () => (
    <SongStudySurface
      {...baseProps}
      lessonProgress={{ resolvedCount: 0, totalCount: 8 }}
      state={{ kind: "say_it_back", attemptNumber: 1, exercise: sayItBackExercise, phase: "idle" }}
    />
  ),
};

export const ProgressMidLesson: Story = {
  name: "Study / Progress — mid-lesson",
  render: () => (
    <SongStudySurface
      {...baseProps}
      lessonProgress={{ resolvedCount: 4, totalCount: 8 }}
      rewardSlot={<SongRewardOfferPill amountLabel="$0.40" />}
      state={{ kind: "multiple_choice", attemptNumber: 1, exercise: multipleChoiceExercise }}
    />
  ),
};

export const ProgressRetryPending: Story = {
  name: "Study / Progress — retry pending",
  render: () => (
    <SongStudySurface
      {...baseProps}
      lessonProgress={{ resolvedCount: 6, totalCount: 8 }}
      state={{ kind: "say_it_back", attemptNumber: 1, exercise: sayItBackExercise, phase: "wrong" }}
    />
  ),
};

export const ProgressComplete: Story = {
  name: "Study / Progress — complete",
  render: () => (
    <SongStudySurface
      {...baseProps}
      lessonProgress={{ resolvedCount: 8, totalCount: 8 }}
      state={{ kind: "complete", correctCount: 7, scorePercent: 88, totalCount: 8 }}
    />
  ),
};

export const SayItBackRewardOffer: Story = {
  name: "Study / Say it back — reward offer",
  render: () => (
    <SongStudySurface
      {...baseProps}
      rewardSlot={<SongRewardOfferPill amountLabel="$0.40" />}
      state={{
        kind: "say_it_back",
        attemptNumber: 1,
        exercise: sayItBackExercise,
        phase: "idle",
      }}
    />
  ),
};

export const SayItBackListening: Story = {
  name: "Study / Say it back — listening",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 1,
        exercise: sayItBackExercise,
        phase: "listening",
      }}
    />
  ),
};

export const SayItBackWrongFirstAttempt: Story = {
  name: "Study / Say it back — wrong first attempt",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 2,
        exercise: sayItBackExercise,
        heardTranscript: "They tried to kiss me while they chased me around",
        phase: "wrong",
      }}
    />
  ),
};

export const SayItBackSecondAttempt: Story = {
  name: "Study / Say it back — second attempt",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 2,
        exercise: sayItBackExercise,
        phase: "idle",
      }}
    />
  ),
};

export const SayItBackFinalWrongReveal: Story = {
  name: "Study / Say it back — final wrong reveal",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 3,
        exercise: sayItBackExercise,
        heardTranscript: "They tried to kiss me while they chased me around",
        phase: "wrong",
        revealReference: true,
      }}
    />
  ),
};

export const MultipleChoiceUnanswered: Story = {
  name: "Study / Multiple choice — unanswered",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "multiple_choice",
        attemptNumber: 1,
        exercise: multipleChoiceExercise,
      }}
    />
  ),
};

export const FillBlankInProgress: Story = {
  name: "Study / Fill blank — in progress",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "fill_blank",
        attemptNumber: 1,
        exercise: fillBlankExercise,
        selectedTokenIds: ["token_3"],
      }}
    />
  ),
};

export const FillBlankWrongReveal: Story = {
  name: "Study / Fill blank — wrong reveal",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "fill_blank",
        attemptNumber: 1,
        correctPlacements: [
          { blank_id: "blank_1", token_id: "token_3" },
          { blank_id: "blank_2", token_id: "token_1" },
        ],
        exercise: fillBlankExercise,
        result: "wrong",
        selectedTokenIds: ["token_4", "token_1"],
      }}
    />
  ),
};

export const MultipleChoiceWrong: Story = {
  name: "Study / Multiple choice — wrong",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "multiple_choice",
        attemptNumber: 1,
        exercise: multipleChoiceExercise,
        result: "wrong",
        selectedOptionId: "distractor-3",
      }}
    />
  ),
};

export const MultipleChoiceCorrect: Story = {
  name: "Study / Multiple choice — correct",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "multiple_choice",
        attemptNumber: 1,
        exercise: multipleChoiceExercise,
        result: "correct",
        selectedOptionId: "correct",
      }}
    />
  ),
};

export const Complete: Story = {
  name: "Study / Complete — leaderboard",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 3,
        nextReviewLabel: "tomorrow",
        scorePercent: 100,
        streak: {
          currentStreak: 15,
          qualifiedToday: true,
          studyAttemptsToday: 10,
          studyCorrectCount: 10,
          studyTargetCount: 10,
        },
        streakSummary: summary(
          boardEntries.map((entry, index) =>
            index === 2
              ? { ...entry, is_viewer: true, current_streak: 14 }
              : entry,
          ),
          { ...viewerRankedLockedIn, current_streak: 14 },
          boardEntries.length,
        ),
        totalCount: 3,
      }}
    />
  ),
};

export const CompleteStreakQualified: Story = {
  name: "Study / Complete — streak qualified",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 3,
        nextReviewLabel: "tomorrow",
        scorePercent: 100,
        streak: {
          currentStreak: 4,
          qualifiedToday: true,
          studyAttemptsToday: 3,
          studyCorrectCount: 3,
          studyTargetCount: 3,
        },
        streakSummary: summary(
          [
            makeEntry(1, { userId: "usr_lena", handle: "lena.pirate", currentStreak: 21 }),
            makeEntry(2, { userId: "usr_theo", handle: "theo.eth", currentStreak: 18 }),
            makeEntry(3, { userId: "usr_priya", handle: "priya.pirate", currentStreak: 14 }),
          ],
          { ...viewerNotRanked, current_streak: 3, best_streak: 3, qualified_today: false },
          12,
        ),
        totalCount: 3,
      }}
    />
  ),
};

export const CompleteStreakProgress: Story = {
  name: "Study / Complete — streak progress",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 7,
        nextReviewLabel: "in 4 hr",
        scorePercent: 70,
        streak: {
          currentStreak: 2,
          qualifiedToday: false,
          studyAttemptsToday: 7,
          studyCorrectCount: 7,
          studyTargetCount: 10,
        },
        totalCount: 10,
      }}
    />
  ),
};

export const CompleteWithLeadersViewerRanked: Story = {
  name: "Study / Complete — leaders, viewer ranked",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 3,
        nextReviewLabel: "tomorrow",
        scorePercent: 100,
        streak: {
          currentStreak: 14,
          qualifiedToday: true,
          studyAttemptsToday: 10,
          studyCorrectCount: 10,
          studyTargetCount: 10,
        },
        streakSummary: summary(
          boardEntries.map((entry, index) =>
            index === 2 ? { ...entry, is_viewer: true } : entry,
          ),
          viewerRankedLockedIn,
          boardEntries.length,
        ),
        totalCount: 3,
      }}
    />
  ),
};

export const CompleteWithLeadersViewerBehind: Story = {
  name: "Study / Complete — leaders, viewer behind",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 6,
        nextReviewLabel: "in 6 hr",
        scorePercent: 60,
        streak: {
          currentStreak: 14,
          qualifiedToday: false,
          studyAttemptsToday: 6,
          studyCorrectCount: 6,
          studyTargetCount: 10,
        },
        streakSummary: summary(boardEntries, viewerRankedBehind, boardEntries.length),
        totalCount: 10,
      }}
    />
  ),
};

export const CompleteWithLeadersViewerNotRanked: Story = {
  name: "Study / Complete — leaders, viewer not ranked",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 1,
        nextReviewLabel: "soon",
        scorePercent: 33,
        streak: {
          currentStreak: 1,
          qualifiedToday: true,
          studyAttemptsToday: 3,
          studyCorrectCount: 1,
          studyTargetCount: 3,
        },
        streakSummary: summary(
          [makeEntry(1, { userId: "usr_lena", handle: "lena.pirate", currentStreak: 21 })],
          viewerNotRanked,
          5,
        ),
        totalCount: 3,
      }}
    />
  ),
};

export const CompleteEmptyBoardViewerLapsed: Story = {
  name: "Study / Complete — empty board, viewer lapsed",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 2,
        nextReviewLabel: "in 2 hr",
        scorePercent: 50,
        streak: {
          currentStreak: 0,
          qualifiedToday: false,
          studyAttemptsToday: 2,
          studyCorrectCount: 2,
          studyTargetCount: 4,
        },
        streakSummary: summary([], viewerDead, 0),
        totalCount: 4,
      }}
    />
  ),
};

export const CompleteStaleViewerRowPatched: Story = {
  name: "Study / Complete — stale viewer row patched",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 3,
        nextReviewLabel: "tomorrow",
        scorePercent: 100,
        streak: {
          currentStreak: 15,
          qualifiedToday: true,
          studyAttemptsToday: 10,
          studyCorrectCount: 10,
          studyTargetCount: 10,
        },
        streakSummary: summary(
          boardEntries.map((entry, index) =>
            index === 2
              ? { ...entry, is_viewer: true, current_streak: 14 }
              : entry,
          ),
          { ...viewerRankedLockedIn, current_streak: 14 },
          boardEntries.length,
        ),
        totalCount: 3,
      }}
    />
  ),
};

export const CompleteViewerNewFirst: Story = {
  name: "Study / Complete — viewer new #1",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 3,
        nextReviewLabel: "tomorrow",
        scorePercent: 100,
        streak: {
          currentStreak: 22,
          qualifiedToday: true,
          studyAttemptsToday: 10,
          studyCorrectCount: 10,
          studyTargetCount: 10,
        },
        streakSummary: summary(
          boardEntries.map((entry, index) =>
            index === 2 ? { ...entry, is_viewer: true } : entry,
          ),
          viewerRankedLockedIn,
          boardEntries.length,
        ),
        totalCount: 3,
      }}
    />
  ),
};
