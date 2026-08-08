import { describe, expect, test } from "bun:test";
import * as React from "react";

import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import {
  AdvancedGatePolicyBanner,
  GATE_REQUIREMENT_SECTION_ORDER,
  GATE_REQUIREMENT_SECTION_TITLES,
  canAuthorCourtyardInventoryGate,
  courtyardInventoryDraftMatchesGroup,
  documentProofProviderChoiceFromProviders,
  documentProofProvidersFromChoice,
  getGateEditorGroupedAuthoringState,
  normalizeDocumentProofProviders,
  normalizeGateDraftsForMatchMode,
  upsertGateDraftForMatchMode,
} from "./community-gates-editor-page";

type TestElement = React.ReactElement<Record<string, unknown>>;

function walkTree(node: React.ReactNode, visit: (element: TestElement) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walkTree(child, visit));
    return;
  }
  if (!React.isValidElement(node)) {
    return;
  }
  const element = node as TestElement;
  visit(element);
  walkTree(element.props.children as React.ReactNode, visit);
}

function treeIncludesText(node: React.ReactNode, text: string): boolean {
  let found = false;
  walkTree(node, (element) => {
    if (found) return;
    const children = element.props.children;
    if (children === text) {
      found = true;
    }
  });
  return found;
}

describe("CommunityGatesEditorPage gate draft helpers", () => {
  test("names the normal gate editor requirement groups explicitly", () => {
    expect(GATE_REQUIREMENT_SECTION_ORDER).toEqual([
      "humanity",
      "documentAttributes",
      "tokenHoldings",
      "reputation",
    ]);
    expect(GATE_REQUIREMENT_SECTION_TITLES).toEqual({
      documentAttributes: "Document attributes",
      humanity: "Humanity",
      reputation: "Reputation",
      tokenHoldings: "Token holdings",
    });
  });

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

  test("keeps proof-of-work and palm scan together in all mode", () => {
    const powGate: IdentityGateDraft = { gateType: "altcha_pow" };
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };

    expect(upsertGateDraftForMatchMode([powGate], palmScanGate, "all")).toEqual([
      powGate,
      palmScanGate,
    ]);
    expect(upsertGateDraftForMatchMode([palmScanGate], powGate, "all")).toEqual([
      palmScanGate,
      powGate,
    ]);
  });

  test("preserves proof-of-work fallback intent when upserting the fallback gate", () => {
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };
    const powFallbackGate: IdentityGateDraft = { gateType: "altcha_pow", fallbackFor: "unique_human" };

    expect(upsertGateDraftForMatchMode([palmScanGate], powFallbackGate, "all")).toEqual([
      palmScanGate,
      powFallbackGate,
    ]);
  });

  test("keeps proof-of-work selected when switching back to all mode", () => {
    const powGate: IdentityGateDraft = { gateType: "altcha_pow" };
    const palmScanGate: IdentityGateDraft = { gateType: "unique_human", provider: "very" };

    expect(normalizeGateDraftsForMatchMode([powGate, palmScanGate], "all")).toEqual([
      powGate,
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

  test("maps document proof provider choices to explicit saved provider sets", () => {
    expect(documentProofProvidersFromChoice("self")).toEqual(["self"]);
    expect(documentProofProvidersFromChoice("zkpassport")).toEqual(["zkpassport"]);
    expect(documentProofProvidersFromChoice("both")).toEqual(["self", "zkpassport"]);
    expect(documentProofProvidersFromChoice("unknown")).toEqual(["self"]);
  });

  test("maps saved document proof providers to the editor choice", () => {
    expect(documentProofProviderChoiceFromProviders(undefined)).toBe("self");
    expect(documentProofProviderChoiceFromProviders([])).toBe("self");
    expect(documentProofProviderChoiceFromProviders(["self"])).toBe("self");
    expect(documentProofProviderChoiceFromProviders(["zkpassport"])).toBe("zkpassport");
    expect(documentProofProviderChoiceFromProviders(["zkpassport", "self"])).toBe("both");
  });

  test("derives normal grouped authoring copy without promoting browser anti-bot as a peer gate", () => {
    const state = getGateEditorGroupedAuthoringState([
      { gateType: "unique_human", provider: "very" },
      { gateType: "nationality", provider: "self", requiredValues: ["US"] },
    ], "any");

    expect(state.projection.normalAuthoringSupported).toBe(false);
    expect(state.projection.advancedReasons).toEqual(["cross_group_or"]);
    expect(state.showMatchModeControl).toBe(true);
    expect(state.allowAnyDescription).toBe(
      "Members can pass any one selected advanced access path. Review the saved policy before replacing it.",
    );
    expect(state.allowAnyDescription).not.toContain("browser anti-bot");
  });

  test("hides the global match-mode control for normal grouped all-mode authoring", () => {
    const state = getGateEditorGroupedAuthoringState([
      { gateType: "unique_human", provider: "very" },
      { gateType: "nationality", provider: "self", requiredValues: ["US"] },
    ], "all");

    expect(state.projection.normalAuthoringSupported).toBe(true);
    expect(state.showMatchModeControl).toBe(false);
    expect(state.showStandaloneAntiBotControl).toBe(false);
    expect(state.allowAnyDescription).toBe("Members can pass any one selected access path.");
  });

  test("keeps simple standalone anti-bot copy generic without showing top-level OR controls", () => {
    const state = getGateEditorGroupedAuthoringState([
      { gateType: "altcha_pow" },
    ], "all");

    expect(state.projection.normalAuthoringSupported).toBe(true);
    expect(state.showMatchModeControl).toBe(false);
    expect(state.showStandaloneAntiBotControl).toBe(true);
    expect(state.allowAnyDescription).toBe("Members can pass any one selected access path.");
  });

  test("does not expose the local anti-bot fallback as a standalone peer control", () => {
    const state = getGateEditorGroupedAuthoringState([
      { gateType: "unique_human", provider: "very" },
      { gateType: "altcha_pow", fallbackFor: "unique_human" },
    ], "all");

    expect(state.projection.normalAuthoringSupported).toBe(true);
    expect(state.showStandaloneAntiBotControl).toBe(false);
  });

  test("renders advanced policy replacement consent when replacement is required", () => {
    const tree = AdvancedGatePolicyBanner({
      replacementRequired: true,
      replaceConfirmed: false,
    });

    let actionBanner: TestElement | null = null;
    walkTree(tree, (element) => {
      if (typeof element.type === "function" && element.type.name === "ActionBanner") {
        actionBanner = element;
      }
    });

    expect(actionBanner?.props.title).toBe("Advanced gate policy");
    expect(treeIncludesText(tree, "Replace the saved advanced policy with the gate settings shown here")).toBe(true);
  });

  test("matches Courtyard wallet inventory groups to drafts", () => {
    const group = {
      category: "trading_card" as const,
      franchise: "pokemon",
      subject: "charizard",
      displayLabel: "Pokemon Charizard",
      count: 4,
    };
    const draft: IdentityGateDraft = {
      gateType: "erc721_inventory_match",
      chainNamespace: "eip155:137",
      contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
      inventoryProvider: "courtyard",
      minQuantity: 4,
      assetFilter: {
        category: "trading_card",
        franchise: "pokemon",
        subject: "charizard",
      },
    };

    expect(courtyardInventoryDraftMatchesGroup(draft, group)).toBe(true);
    expect(courtyardInventoryDraftMatchesGroup({
      ...draft,
      assetFilter: { ...draft.assetFilter, subject: "pikachu" },
    }, group)).toBe(false);
  });

  test("enables Courtyard authoring only when inventory groups are available", () => {
    expect(canAuthorCourtyardInventoryGate(undefined)).toBe(false);
    expect(canAuthorCourtyardInventoryGate(null)).toBe(false);
    expect(canAuthorCourtyardInventoryGate([])).toBe(false);
    expect(canAuthorCourtyardInventoryGate([{
      category: "trading_card",
      count: 1,
      displayLabel: "Pokemon",
    }], false)).toBe(false);
    expect(canAuthorCourtyardInventoryGate([{
      category: "watch",
      brand: "rolex",
      displayLabel: "Rolex",
      count: 1,
    }])).toBe(true);
  });
});
