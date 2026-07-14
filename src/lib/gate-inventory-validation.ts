/**
 * Inventory-gate rules, mirrored from the API
 * (services/api/src/lib/communities/community-token-inventory-gates.ts on api@main).
 *
 * Dependency-neutral on purpose: both the tree builder and the legacy gate editor import this, so
 * there is exactly one definition of "is this Courtyard rule complete?" on the client.
 */

export const COURTYARD_POLYGON_REGISTRY = "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD";
export const COURTYARD_MAINNET_REGISTRY = "0xd4ac3CE8e1E14CD60666D49AC34Ff2d2937cF6FA";

export const INVENTORY_MATCH_KEYS = [
  "category",
  "franchise",
  "subject",
  "brand",
  "model",
  "reference",
  "set",
  "year",
  "grader",
  "grade",
  "condition",
] as const;

export const INVENTORY_CATEGORIES = ["trading_card", "watch"] as const;
export const MAX_INVENTORY_MATCH_VALUES_PER_KEY = 10;

export type InventoryAssetMatchValidationError = {
  code:
    | "inventoryAttributeFilterRequired"
    | "inventoryAttributeValues"
    | "inventoryCardIdentityRequired"
    | "inventoryCollectionRequired"
    | "inventoryCollectionTypeUnsupported"
    | "inventoryMatchRequired"
    | "inventoryUnsupportedAttribute"
    | "inventoryWatchIdentityRequired";
  params?: Record<string, string>;
};

/** The API only accepts inventory gates pointing at an allowlisted Courtyard registry. */
export function isAllowedCourtyardRegistry(chainNamespace: string, contractAddress: string): boolean {
  const address = contractAddress.trim().toLowerCase();
  if (chainNamespace === "eip155:1") {
    return address === COURTYARD_MAINNET_REGISTRY.toLowerCase();
  }
  if (chainNamespace === "eip155:137") {
    return address === COURTYARD_POLYGON_REGISTRY.toLowerCase();
  }
  return false;
}

/**
 * Mirrors the API's normalizeInventoryText: trim, strip diacritics, lowercase.
 *
 * Values are compared *after* this runs, so "Trading_Card " is a valid category and
 * ["Charizard", " charizard "] is a duplicate — both of which a naive exact-match check gets wrong.
 */
export function normalizeInventoryText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .normalize("NFC")
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/** A value is one string, or 1..10 strings that stay unique after normalization. */
export function normalizeInventoryMatchValue(value: unknown): string[] | null {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0 || values.length > MAX_INVENTORY_MATCH_VALUES_PER_KEY) {
    return null;
  }
  const normalizedValues: string[] = [];
  for (const raw of values) {
    const normalized = normalizeInventoryText(raw);
    if (!normalized || normalizedValues.includes(normalized)) {
      return null;
    }
    normalizedValues.push(normalized);
  }
  return normalizedValues;
}

export function isValidInventoryMatchValue(value: unknown): boolean {
  return normalizeInventoryMatchValue(value) != null;
}

function hasMatchValue(match: Record<string, unknown>, key: string): boolean {
  return normalizeInventoryMatchValue(match[key]) != null;
}

/**
 * The API requires a category PLUS an identifying field, and that field must be franchise/subject
 * for cards or brand/model for watches. A grade-only card filter or a reference-only watch filter
 * looks complete in the editor but is rejected server-side.
 */
export function validateInventoryAssetMatch(match: unknown): InventoryAssetMatchValidationError | null {
  if (!match || typeof match !== "object" || Array.isArray(match)) {
    return { code: "inventoryMatchRequired" };
  }

  const raw = match as Record<string, unknown>;
  const allowedKeys = new Set<string>(INVENTORY_MATCH_KEYS);
  const invalidKeys = Object.keys(raw).filter((key) => !allowedKeys.has(key));
  if (invalidKeys.length > 0) {
    return { code: "inventoryUnsupportedAttribute", params: { attributes: invalidKeys.join(", ") } };
  }

  if (Object.values(raw).some((value) => !isValidInventoryMatchValue(value))) {
    return { code: "inventoryAttributeValues", params: { max: String(MAX_INVENTORY_MATCH_VALUES_PER_KEY) } };
  }

  const categories = normalizeInventoryMatchValue(raw.category);
  if (!categories) {
    return { code: "inventoryCollectionRequired" };
  }
  if (categories.some((category) => !INVENTORY_CATEGORIES.some((allowed) => allowed === category))) {
    return { code: "inventoryCollectionTypeUnsupported" };
  }

  const identifyingKeys = INVENTORY_MATCH_KEYS
    .filter((key) => key !== "category" && hasMatchValue(raw, key));
  if (identifyingKeys.length === 0) {
    return { code: "inventoryAttributeFilterRequired" };
  }

  if (categories.includes("trading_card") && !hasMatchValue(raw, "franchise") && !hasMatchValue(raw, "subject")) {
    return { code: "inventoryCardIdentityRequired" };
  }

  if (categories.includes("watch") && !hasMatchValue(raw, "brand") && !hasMatchValue(raw, "model")) {
    return { code: "inventoryWatchIdentityRequired" };
  }

  return null;
}
