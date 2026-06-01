import { describe, expect, test } from "bun:test";

import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import {
  normalizeDocumentProofProviders,
  toggleDocumentProofProvider,
} from "./community-gates-editor-page";
import {
  normalizeGateDraftsForMatchMode,
  upsertGateDraftForMatchMode,
} from "./gate-draft-match-mode";

describe("CommunityGatesEditorPage gate draft helpers", () => {
  test("keeps proof-of-work and palm scan together in any mode", () => {
    const powGate: IdentityGateDraft = { gateType: "altcha_pow" };
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };

    expect(upsertGateDraftForMatchMode([powGate], palmScanGate, "any")).toEqual([
      powGate,
      palmScanGate,
    ]);
    expect(upsertGateDraftForMatchMode([palmScanGate], powGate, "any")).toEqual([
      palmScanGate,
      powGate,
    ]);
  });

  test("preserves proof-of-work exclusivity in all mode", () => {
    const powGate: IdentityGateDraft = { gateType: "altcha_pow" };
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };

    expect(upsertGateDraftForMatchMode([powGate], palmScanGate, "all")).toEqual([
      palmScanGate,
    ]);
    expect(upsertGateDraftForMatchMode([palmScanGate], powGate, "all")).toEqual([
      powGate,
    ]);
  });

  test("normalizes proof-of-work fallback away when switching back to all mode", () => {
    const powGate: IdentityGateDraft = { gateType: "altcha_pow" };
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };

    expect(normalizeGateDraftsForMatchMode([powGate, palmScanGate], "all")).toEqual([
      palmScanGate,
    ]);
    expect(normalizeGateDraftsForMatchMode([powGate, palmScanGate], "any")).toEqual([
      powGate,
      palmScanGate,
    ]);
  });

  test("normalizes document proof providers with Self as the backward-compatible default", () => {
    expect(normalizeDocumentProofProviders(undefined)).toEqual(["self"]);
    expect(normalizeDocumentProofProviders([])).toEqual(["self"]);
    expect(normalizeDocumentProofProviders(["zkpassport"])).toEqual(["zkpassport"]);
    expect(normalizeDocumentProofProviders(["zkpassport", "self"])).toEqual(["self", "zkpassport"]);
  });

  test("toggles document proof providers without allowing an empty provider set", () => {
    expect(toggleDocumentProofProvider(["self"], "self", false)).toEqual(["self"]);
    expect(toggleDocumentProofProvider(["self"], "zkpassport", true)).toEqual(["self", "zkpassport"]);
    expect(toggleDocumentProofProvider(["self", "zkpassport"], "self", false)).toEqual(["zkpassport"]);
    expect(toggleDocumentProofProvider(["zkpassport"], "self", true)).toEqual(["self", "zkpassport"]);
  });
});
