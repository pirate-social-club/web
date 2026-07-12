import { describe, expect, test } from "bun:test";
import type { GateAtom } from "@pirate/api-contracts";

import { isValidGateAtom, validateGateAtom } from "@/lib/gate-atom-validation";
import { COURTYARD_POLYGON_REGISTRY } from "@/lib/courtyard-inventory-gates";

const BAYC = "0xBC4CA0EDA7647A8AB7C2061C2E118A18A936F13D";

function inventoryGate(match: Record<string, unknown>, overrides: Record<string, unknown> = {}): GateAtom {
  return {
    type: "erc721_inventory_match",
    provider: "courtyard",
    chain_namespace: "eip155:137",
    contract_address: COURTYARD_POLYGON_REGISTRY,
    min_quantity: 1,
    match,
    ...overrides,
  } as unknown as GateAtom;
}

describe("inventory match completeness (API parity)", () => {
  test("accepts a valid trading card filter", () => {
    expect(validateGateAtom(inventoryGate({
      category: "trading_card",
      franchise: "Pokemon",
      subject: "Charizard",
      grade: "PSA 9",
    }))).toBeNull();
  });

  test("accepts a valid watch filter", () => {
    expect(validateGateAtom(inventoryGate({
      category: "watch",
      brand: "Rolex",
      model: "Submariner",
    }))).toBeNull();
  });

  test("rejects a category-only filter", () => {
    // Emitted by simply selecting a trusted collection and saving.
    expect(isValidGateAtom(inventoryGate({ category: "trading_card" }))).toBe(false);
  });

  test("rejects a grade-only card filter", () => {
    // The old validator accepted this; the API does not.
    expect(validateGateAtom(inventoryGate({ category: "trading_card", grade: "PSA 9" })))
      .toBe("Trading card rules need a Franchise or Name filter.");
  });

  test("rejects a reference-only watch filter", () => {
    expect(validateGateAtom(inventoryGate({ category: "watch", reference: "116610LN" })))
      .toBe("Watch rules need a Brand or Model filter.");
  });

  test("rejects a non-allowlisted contract", () => {
    expect(validateGateAtom(inventoryGate(
      { category: "trading_card", franchise: "Pokemon" },
      { contract_address: BAYC, chain_namespace: "eip155:1" },
    ))).toBe("Choose a trusted collection.");
  });

  test("rejects an out-of-range quantity", () => {
    expect(isValidGateAtom(inventoryGate(
      { category: "trading_card", franchise: "Pokemon" },
      { min_quantity: 0 },
    ))).toBe(false);
  });

  test("accepts multi-value facets and rejects over-long or duplicate lists", () => {
    expect(isValidGateAtom(inventoryGate({
      category: "trading_card",
      franchise: "Pokemon",
      subject: ["Charizard", "Gengar"],
    }))).toBe(true);

    expect(isValidGateAtom(inventoryGate({
      category: "trading_card",
      franchise: "Pokemon",
      subject: Array.from({ length: 11 }, (_, index) => `Card ${index}`),
    }))).toBe(false);

    expect(isValidGateAtom(inventoryGate({
      category: "trading_card",
      franchise: "Pokemon",
      subject: ["Charizard", "Charizard"],
    }))).toBe(false);
  });

  test("rejects unsupported match keys", () => {
    expect(isValidGateAtom(inventoryGate({ category: "trading_card", franchise: "Pokemon", colour: "red" })))
      .toBe(false);
  });
});

describe("other atoms (API parity)", () => {
  test("rejects an invalid ERC-721 contract address", () => {
    expect(validateGateAtom({
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: "not-an-address",
    } as GateAtom)).toBe("Enter a valid contract address.");
  });

  test("rejects an ERC-721 gate off Ethereum mainnet", () => {
    expect(isValidGateAtom({
      type: "erc721_holding",
      chain_namespace: "eip155:137",
      contract_address: BAYC,
    } as GateAtom)).toBe(false);
  });

  test("accepts a valid ERC-721 holding", () => {
    expect(validateGateAtom({
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: BAYC,
    } as GateAtom)).toBeNull();
  });

  test("rejects an age outside 18 to 125", () => {
    const age = (minimum_age: number) => ({ type: "minimum_age", provider: "self", minimum_age } as unknown as GateAtom);
    expect(isValidGateAtom(age(17))).toBe(false);
    expect(isValidGateAtom(age(126))).toBe(false);
    expect(isValidGateAtom(age(21))).toBe(true);
  });

  test("rejects a passport score outside 0 to 100", () => {
    const score = (minimum_score: number) => ({
      type: "wallet_score",
      provider: "passport",
      minimum_score,
    } as unknown as GateAtom);
    expect(isValidGateAtom(score(101))).toBe(false);
    expect(isValidGateAtom(score(20))).toBe(true);
  });

  test("accepts an empty nationality list, which means any verified nationality", () => {
    // API parity: gate-policy-evaluation.test.ts proves a verified AR user satisfies allowed: [].
    expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: [] } as unknown as GateAtom)).toBe(true);
    expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: ["US"] } as unknown as GateAtom)).toBe(true);
  });

  test("rejects invalid country codes", () => {
    expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: ["ZZ"] } as unknown as GateAtom)).toBe(false);
    expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: ["USA"] } as unknown as GateAtom)).toBe(true);
  });

  test("accepts the Kosovo aliases the API canonicalizes to XKK", () => {
    // Real Kosovo passports carry RKS (ICAO Doc 9303). The shared country table rejects these,
    // so validating through it alone would block a policy the API accepts.
    for (const code of ["KS", "RKS", "XKX", "XK", "XKK"]) {
      expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: [code] } as unknown as GateAtom)).toBe(true);
    }
  });

  test("does not throw on malformed country values", () => {
    expect(isValidGateAtom({ type: "nationality", provider: "self", allowed: [42, null] } as unknown as GateAtom)).toBe(false);
  });

  test("rejects document rules proven by the wrong provider", () => {
    expect(isValidGateAtom({ type: "minimum_age", provider: "zkpassport", minimum_age: 21 } as unknown as GateAtom)).toBe(false);
    expect(isValidGateAtom({ type: "nationality", provider: "very", allowed: ["US"] } as unknown as GateAtom)).toBe(false);
    expect(isValidGateAtom({ type: "gender", provider: "very", allowed: ["F"] } as unknown as GateAtom)).toBe(false);
    expect(isValidGateAtom({ type: "wallet_score", provider: "self", minimum_score: 20 } as unknown as GateAtom)).toBe(false);
  });

  test("validates accepted_providers", () => {
    const withProviders = (accepted_providers: unknown) => ({
      type: "minimum_age", provider: "self", minimum_age: 21, accepted_providers,
    } as unknown as GateAtom);
    expect(isValidGateAtom(withProviders(undefined))).toBe(true);
    expect(isValidGateAtom(withProviders(["self", "zkpassport"]))).toBe(true);
    expect(isValidGateAtom(withProviders([]))).toBe(false);
    expect(isValidGateAtom(withProviders(["very"]))).toBe(false);
  });

  test("accepts an unrecognized atom: the API may be ahead of this client", () => {
    // Regression guard: these are preserved read-only and passed back untouched, so treating them
    // as invalid would disable Save and break preservation.
    expect(isValidGateAtom({ type: "nft_trait_snapshot_match" } as unknown as GateAtom)).toBe(true);
  });

  test("accepts human verification and browser challenge", () => {
    expect(validateGateAtom({ type: "unique_human", provider: "very" } as GateAtom)).toBeNull();
    expect(validateGateAtom({ type: "altcha_pow" } as GateAtom)).toBeNull();
  });
});

describe("inventory value normalization (API parity)", () => {
  test("accepts a category that only matches after normalization", () => {
    expect(isValidGateAtom(inventoryGate({ category: " Trading_Card ", franchise: "Pokemon" }))).toBe(true);
  });

  test("rejects an unsupported category", () => {
    expect(isValidGateAtom(inventoryGate({ category: "sneaker", brand: "Nike" }))).toBe(false);
  });

  test("rejects a category array containing an unsupported category", () => {
    expect(isValidGateAtom(inventoryGate({ category: ["trading_card", "sneaker"], franchise: "Pokemon" }))).toBe(false);
  });

  test("rejects values that collide after normalization", () => {
    expect(isValidGateAtom(inventoryGate({
      category: "trading_card",
      franchise: "Pokemon",
      subject: ["Charizard", " charizard "],
    }))).toBe(false);
  });
});

