import { describe, expect, test } from "bun:test";

import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import {
  normalizeGateDraftsForMatchMode,
  upsertGateDraftForMatchMode,
} from "./community-gates-editor-page";

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
});
