import { describe, expect, test } from "bun:test";

import { submitLearningDeckPost } from "./generic";

const baseRequest = {
  idempotency_key: "idem_deck_retry",
  identity_mode: "public" as const,
  translation_policy: "none" as const,
  visibility: "public" as const,
};

function draft(cards: Array<{ cardId: string; ordinal: number }>) {
  return {
    deck: { learning_deck_id: "ldk_1", title: "Deck", description: null, status: "draft" as const },
    version: { learning_deck_version_id: "ldv_1", version: 1, status: "draft" },
    cards: cards.map((card) => ({
      ...card,
      cardType: "basic" as const,
      retiredAt: null,
      prompt: "Question",
      answer: "Answer",
      tags: [],
    })),
  };
}

describe("generic post submission", () => {
  test("reuses a server card ID when a deck retry resumes an existing draft", async () => {
    const calls: Array<{ card_id?: string }> = [];
    const result = await submitLearningDeckPost({
      communityId: "com_1",
      title: "Deck",
      deck: {
        description: "Practice",
        cards: [{ id: "client-uuid", cardType: "basic", prompt: "Question", answer: "Answer", tags: [] }],
      },
      baseRequest,
      learningDeckId: "ldk_1",
      getLearningDeck: async () => draft([{ cardId: "lcd_existing", ordinal: 0 }]),
      createLearningDeck: async () => draft([]),
      upsertLearningDeckCard: async (_communityId, _deckId, body) => {
        calls.push(body);
        return draft([{ cardId: body.card_id ?? "lcd_new", ordinal: 0 }]);
      },
      validateLearningDeck: async () => ({ issues: [], canonical: null }),
      createPost: async () => ({ id: "pst_1" }),
    });

    expect(result.id).toBe("pst_1");
    expect(calls.map((call) => call.card_id)).toEqual(["lcd_existing"]);
  });
});
