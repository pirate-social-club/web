import { describe, expect, test } from "bun:test";
import * as React from "react";

import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import {
  AdvancedGatePolicyBanner,
  courtyardInventoryDraftMatchesGroup,
  normalizeDocumentProofProviders,
  normalizeGateDraftsForMatchMode,
  toggleDocumentProofProvider,
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

  test("toggles document proof providers without allowing an empty provider set", () => {
    expect(toggleDocumentProofProvider(["self"], "self", false)).toEqual(["self"]);
    expect(toggleDocumentProofProvider(["self"], "zkpassport", true)).toEqual(["self", "zkpassport"]);
    expect(toggleDocumentProofProvider(["self", "zkpassport"], "self", false)).toEqual(["zkpassport"]);
    expect(toggleDocumentProofProvider(["zkpassport"], "self", true)).toEqual(["self", "zkpassport"]);
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
});
