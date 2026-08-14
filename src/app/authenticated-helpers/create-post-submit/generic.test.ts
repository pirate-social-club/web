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

  test("commits an uploaded CSV import without re-adding manual cards", async () => {
    const commits: Array<{ content_blob_id: string; prompt_column: number; answer_column: number }> = [];
    let upsertCalls = 0;
    const result = await submitLearningDeckPost({
      communityId: "com_1",
      title: "Imported deck",
      deck: {
        description: "Practice",
        cards: [],
        csvImport: {
          answerColumn: 1,
          contentBlobId: "cbl_import",
          errors: [],
          filename: "cards.csv",
          headers: ["prompt", "answer"],
          promptColumn: 0,
          rows: [["Question", "Answer"]],
          tagsColumn: null,
        },
      },
      baseRequest,
      learningDeckId: "ldk_1",
      getLearningDeck: async () => draft([]),
      createLearningDeck: async () => draft([]),
      commitLearningDeckCsv: async (_communityId, _deckId, body) => {
        commits.push(body);
        return draft([{ cardId: "lcd_imported", ordinal: 0 }]);
      },
      upsertLearningDeckCard: async () => {
        upsertCalls += 1;
        return draft([]);
      },
      validateLearningDeck: async () => ({ issues: [], canonical: null }),
      createPost: async () => ({ id: "pst_imported" }),
    });

    expect(result.id).toBe("pst_imported");
    expect(commits).toEqual([{ content_blob_id: "cbl_import", prompt_column: 0, answer_column: 1, tags_column: null }]);
    expect(upsertCalls).toBe(0);
  });
});
