import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  SongStudySurface,
  type SongStudyMultipleChoiceExercise,
  type SongStudySayItBackExercise,
} from "../song-study-surface";

const artworkSrc = "https://picsum.photos/seed/pirate-study/160/160";

const baseProps = {
  artistName: "The Castaways",
  artworkSrc,
  onExit: () => undefined,
  onPrimaryAction: () => undefined,
  title: "Midnight Waves",
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
        transcript: "Hold on till…",
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
        attemptNumber: 1,
        exercise: sayItBackExercise,
        feedback: {
          missing: ["till", "light"],
          extra: ["to", "line"],
        },
        phase: "wrong",
        transcript: "Hold on to the morning line",
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
        feedback: {
          missing: ["till", "light"],
          extra: ["to", "line"],
        },
        phase: "idle",
        transcript: "Hold on to the morning line",
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
        attemptNumber: 2,
        exercise: sayItBackExercise,
        feedback: {
          missing: ["till", "light"],
          extra: ["to", "line"],
        },
        phase: "wrong",
        revealReference: true,
        transcript: "Hold on to the morning line",
      }}
    />
  ),
};

export const SayItBackCorrect: Story = {
  name: "Study / Say it back — correct",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "say_it_back",
        attemptNumber: 1,
        exercise: sayItBackExercise,
        phase: "correct",
        transcript: "Hold on till the morning light",
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
  name: "Study / Complete",
  render: () => (
    <SongStudySurface
      {...baseProps}
      state={{
        kind: "complete",
        correctCount: 11,
        nextReviewLabel: "tomorrow",
        scorePercent: 86,
        totalCount: 14,
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
          studyCorrectCount: 3,
          studyTargetCount: 3,
        },
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
          studyCorrectCount: 7,
          studyTargetCount: 10,
        },
        totalCount: 10,
      }}
    />
  ),
};
