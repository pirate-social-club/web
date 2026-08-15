/**
 * Small, deliberately boring reader for the public canonical deck package.
 *
 * The package is an API boundary, not an application-owned object. Unknown
 * additive keys are ignored and a newer schema is reported as unsupported so
 * a collection/detail surface can skip it without crashing the enclosing UI.
 */
export const SUPPORTED_LEARNING_DECK_SCHEMA_VERSION = 1 as const;

export type ReadableLearningDeckCard = {
  card_id: string;
  ordinal: number;
  card_type: "basic" | "cloze";
  prompt: string;
  answer: string;
  tags: string[];
};

export type ReadableLearningDeckPackage = {
  schema_version: typeof SUPPORTED_LEARNING_DECK_SCHEMA_VERSION;
  title: string;
  description: string | null;
  cards: ReadableLearningDeckCard[];
};

export type LearningDeckPackageReadResult =
  | { status: "supported"; package: ReadableLearningDeckPackage }
  | { status: "unsupported"; schemaVersion: number };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid learning deck package: ${field}`);
  return value;
}

/** Parse a bounded canonical package while ignoring additive fields. */
export function readCanonicalLearningDeckPackage(
  input: unknown,
): LearningDeckPackageReadResult {
  const value = typeof input === "string" ? JSON.parse(input) as unknown : input;
  const root = record(value);
  if (!root) throw new Error("Invalid learning deck package: object required");

  const schemaVersion = root.schema_version;
  if (typeof schemaVersion !== "number" || !Number.isSafeInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("Invalid learning deck package: schema_version");
  }
  if (schemaVersion > SUPPORTED_LEARNING_DECK_SCHEMA_VERSION) {
    return { status: "unsupported", schemaVersion };
  }
  if (schemaVersion !== SUPPORTED_LEARNING_DECK_SCHEMA_VERSION) {
    throw new Error("Invalid learning deck package: unsupported schema_version");
  }

  if (typeof root.description !== "string" && root.description !== null) {
    throw new Error("Invalid learning deck package: description");
  }
  if (!Array.isArray(root.cards)) throw new Error("Invalid learning deck package: cards");

  const cards = root.cards.map((rawCard, index) => {
    const card = record(rawCard);
    if (!card) throw new Error(`Invalid learning deck package: card ${index}`);
    const cardType = card.card_type;
    if (cardType !== "basic" && cardType !== "cloze") {
      throw new Error(`Invalid learning deck package: card ${index} type`);
    }
    const ordinal = card.ordinal;
    if (!Number.isSafeInteger(ordinal) || (ordinal as number) < 0) {
      throw new Error(`Invalid learning deck package: card ${index} ordinal`);
    }
    if (!Array.isArray(card.tags) || card.tags.some((tag) => typeof tag !== "string")) {
      throw new Error(`Invalid learning deck package: card ${index} tags`);
    }
    return {
      card_id: requiredString(card.card_id, `card ${index} id`),
      ordinal: ordinal as number,
      card_type: cardType,
      prompt: requiredString(card.prompt, `card ${index} prompt`),
      answer: requiredString(card.answer, `card ${index} answer`),
      tags: [...(card.tags as string[])],
    } satisfies ReadableLearningDeckCard;
  });

  const ordinals = new Set<number>();
  for (const card of cards) {
    if (ordinals.has(card.ordinal)) throw new Error("Invalid learning deck package: duplicate ordinal");
    ordinals.add(card.ordinal);
  }

  return {
    status: "supported",
    package: {
      schema_version: SUPPORTED_LEARNING_DECK_SCHEMA_VERSION,
      title: requiredString(root.title, "title"),
      description: root.description as string | null,
      cards,
    },
  };
}
