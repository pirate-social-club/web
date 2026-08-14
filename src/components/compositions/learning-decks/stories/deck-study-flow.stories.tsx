import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { userEvent } from "storybook/test";

import { LearningDeckStudyView, type LearningDeckStudyAdapter } from "../learning-deck-study-surface";
import type { ApiLearningStudySession } from "@/lib/api/client-api-types";

type StudyStoryState = "prompt" | "no_cards_due" | "reveal" | "next_due_completion" | "stale_revision" | "access_revoked" | "quarantine" | "takedown";

const cards = [
  { item_id: "lcd_1", ordinal: 0, status: "current" as const, prompt: "What does a review event store?", answer: "An append-only rating and resulting state.", card_type: "basic" as const, tags: [] },
  { item_id: "lcd_2", ordinal: 1, status: "current" as const, prompt: "Why is the scheduler deterministic?", answer: "It receives an explicit timestamp and disables fuzzing.", card_type: "basic" as const, tags: [] },
];

function session(overrides: Partial<ApiLearningStudySession> = {}): ApiLearningStudySession {
  return {
    session_id: "lss_storybook",
    status: "active",
    session_revision: 1,
    item_count: cards.length,
    reviewed_count: 0,
    expires_at: "2099-01-01T00:00:00.000Z",
    current_item: cards[0] ?? null,
    ...overrides,
  };
}

function makeAdapter(initialState: StudyStoryState): LearningDeckStudyAdapter {
  let current = session({ current_item: initialState === "reveal" ? { ...cards[0], status: "revealed" } : cards[0] });
  return {
    createSession: async () => {
      if (initialState === "access_revoked") throw new Error("Access revoked · study session closed");
      if (initialState === "quarantine") throw new Error("Deck quarantined · cards unavailable");
      if (initialState === "takedown") throw new Error("Takedown active · deck removed from study");
      if (initialState === "no_cards_due" || initialState === "next_due_completion") return session({ status: "completed", current_item: null });
      return current;
    },
    reveal: async () => {
      current = session({ ...current, session_revision: current.session_revision + 1, current_item: current.current_item ? { ...current.current_item, status: "revealed" } : null });
      return current;
    },
    rate: async ({ rating }) => {
      if (initialState === "stale_revision") throw new Error("Stale revision · refresh required before rating");
      const next = cards[(current.current_item?.ordinal ?? 0) + 1];
      current = session({
        ...current,
        session_revision: current.session_revision + 1,
        reviewed_count: current.reviewed_count + 1,
        current_item: next ?? null,
        status: next ? "active" : "completed",
        next_item: next,
        replayed: rating === "again",
      });
      return current;
    },
  };
}

function DeckStudyFlow({ initialState = "prompt" }: { initialState?: StudyStoryState }) {
  const adapter = React.useMemo(() => makeAdapter(initialState), [initialState]);
  return (
    <LearningDeckStudyView
      adapter={adapter}
      returnPath="/p/storybook"
      title="Spaced repetition foundations"
    />
  );
}

const meta = { title: "Compositions/Learning Decks/Study", component: DeckStudyFlow, tags: ["digital-goods"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof DeckStudyFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "Deck study flow" };
Flow.play = async ({ canvasElement }) => {
  let reveal: HTMLButtonElement | undefined;
  for (let attempt = 0; attempt < 20 && !reveal; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    reveal = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Reveal answer");
  }
  if (!reveal) throw new Error("study reveal action is missing");
  await userEvent.click(reveal);
  let good: HTMLButtonElement | undefined;
  for (let attempt = 0; attempt < 20 && !good; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    good = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Good");
  }
  if (!good) throw new Error(`study rating actions are missing: ${canvasElement.textContent?.slice(0, 240)}`);
  await userEvent.click(good);
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!canvasElement.textContent?.includes("1/2")) throw new Error("study rating was not recorded");
};

export const NoCardsDue: Story = { name: "Terminal — no cards due", args: { initialState: "no_cards_due" } };
export const Reveal: Story = { name: "Study — prompt and reveal", args: { initialState: "reveal" } };
export const NextDueCompletion: Story = { name: "Terminal — next-due completion", args: { initialState: "next_due_completion" } };
export const StaleRevision: Story = { name: "Failure — stale revision", args: { initialState: "stale_revision" } };
export const AccessRevoked: Story = { name: "Entitlement — access revoked", args: { initialState: "access_revoked" } };
export const Quarantine: Story = { name: "Enforcement — quarantine", args: { initialState: "quarantine" } };
export const Takedown: Story = { name: "Terminal — takedown", args: { initialState: "takedown" } };
