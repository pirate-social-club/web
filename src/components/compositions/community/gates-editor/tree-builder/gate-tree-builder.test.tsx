import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { withGateAssetMinimum } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { UiLocaleProvider } from "@/lib/ui-locale";
import type { CollectionCapabilitySource } from "./collection-capability-source";
import { GateTreeBuilder, serializeFacetSelection } from "./gate-tree-builder";

for (const key of ["Event", "HTMLInputElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}
Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: function DocumentFragment() {
    return document.createDocumentFragment();
  },
});
Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({ getPropertyValue: () => "" }),
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: globalThis.getComputedStyle,
});

const { cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

const humanRule = {
  kind: "rule",
  gate: { type: "unique_human", provider: "self" },
} as const;

function renderBuilder(
  initialValue: GateBuilderGroupDraft = { kind: "group", op: "and", children: [] },
  options: { capabilitySource?: CollectionCapabilitySource; locale?: "ar" | "en" | "zh" } = {},
) {
  let latestValue = initialValue;
  window.localStorage.setItem("pirate_ui_locale", options.locale ?? "en");

  function Harness() {
    const [value, setValue] = React.useState(initialValue);
    const locale = options.locale ?? "en";
    return (
      <UiLocaleProvider dir={locale === "ar" ? "rtl" : "ltr"} locale={locale}>
        <GateTreeBuilder
          capabilitySource={options.capabilitySource}
          onChange={(nextValue) => {
            latestValue = nextValue;
            setValue(nextValue);
          }}
          value={value}
        />
      </UiLocaleProvider>
    );
  }

  return {
    ...render(<Harness />),
    getLatestValue: () => latestValue,
  };
}

describe("GateTreeBuilder", () => {
  test("adds and removes a requirement through rendered controls", () => {
    const view = renderBuilder();

    fireEvent.click(view.getByRole("button", { name: "Rule" }));
    expect(view.getLatestValue().children).toEqual([humanRule]);
    expect(view.getByRole("combobox", { name: "Requirement type" })).not.toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Remove requirement" }));
    expect(view.getLatestValue().children).toEqual([]);
  });

  test("disables group insertion when the tree already has twenty atoms", () => {
    const view = renderBuilder({
      kind: "group",
      op: "and",
      children: Array.from({ length: 20 }, () => humanRule),
    });

    const addGroup = view.getByRole("button", { name: "Group" });
    expect(addGroup.hasAttribute("disabled")).toBe(true);
    fireEvent.click(addGroup);
    expect(view.getLatestValue().children).toHaveLength(20);
  });

  test("shows a localized source error when trusted collections fail to load", async () => {
    const capabilitySource: CollectionCapabilitySource = {
      estimateMatchCount: async () => null,
      listTrustedSources: async () => Promise.reject(new Error("catalog unavailable")),
      probeContract: async () => null,
      searchFacetValues: async () => [],
    };
    const nftRule = {
      kind: "group",
      op: "and",
      children: [{
        kind: "rule",
        gate: {
          type: "erc721_holding",
          chain_namespace: "eip155:1",
          contract_address: "0x0000000000000000000000000000000000000000",
        },
      }],
    } as unknown as GateBuilderGroupDraft;
    const view = renderBuilder(nftRule, { capabilitySource, locale: "zh" });

    expect((await view.findByRole("alert")).textContent)
      .toContain("无法加载系列");
  });

  test("keeps an inventory atom read-only when its capability source cannot be resolved", async () => {
    const capabilitySource: CollectionCapabilitySource = {
      estimateMatchCount: async () => null,
      listTrustedSources: async () => [],
      probeContract: async () => null,
      searchFacetValues: async () => [],
    };
    const initialValue = {
      kind: "group",
      op: "and",
      children: [{
        kind: "rule",
        gate: {
          type: "erc721_inventory_match",
          provider: "courtyard",
          chain_namespace: "eip155:137",
          contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
          min_quantity: 2,
          match: { category: "trading_card", subject: ["Charizard", "Gengar"] },
        },
      }],
    } as unknown as GateBuilderGroupDraft;
    const view = renderBuilder(initialValue, { capabilitySource });

    const quantity = await view.findByRole("textbox", { name: "Minimum NFT quantity" });
    const contract = view.getByRole("textbox", { name: "NFT contract address" });
    expect(quantity.hasAttribute("disabled")).toBe(true);
    expect(contract.hasAttribute("disabled")).toBe(true);
    expect(view.queryByRole("combobox", { name: "Search collections" })).toBeNull();
    expect(view.getLatestValue()).toEqual(initialValue);
  });

  test("renders a plain ERC-721 collection quantity", async () => {
    const capabilitySource: CollectionCapabilitySource = {
      estimateMatchCount: async () => null,
      listTrustedSources: async () => [],
      probeContract: async () => null,
      searchFacetValues: async () => [],
    };
    const view = renderBuilder({
      kind: "group",
      op: "and",
      children: [{
        kind: "rule",
        gate: {
          type: "erc721_holding",
          chain_namespace: "eip155:1",
          contract_address: "0x0000000000000000000000000000000000000001",
          min_count: 10,
        },
      }],
    } as GateBuilderGroupDraft, { capabilitySource });

    const input = await view.findByRole("spinbutton", { name: "Minimum NFT quantity" });
    expect(input.getAttribute("value")).toBe("10");
    expect(input.hasAttribute("disabled")).toBe(false);
  });

  test("updates ERC-721 collection quantities without dropping the atom", () => {
    expect(withGateAssetMinimum({
      type: "erc721_holding",
      chain_namespace: "eip155:1",
      contract_address: "0x0000000000000000000000000000000000000001",
    }, 10)).toMatchObject({
      type: "erc721_holding",
      contract_address: "0x0000000000000000000000000000000000000001",
      min_count: 10,
    });
  });

  test("preserves a loaded multi-value facet when another inventory field changes", async () => {
    const capabilitySource: CollectionCapabilitySource = {
      estimateMatchCount: async () => null,
      listTrustedSources: async () => [{
        id: "courtyard-cards",
        label: "Courtyard graded cards",
        chainNamespace: "eip155:137",
        contractAddress: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        standard: "erc721",
        traitFiltersSupported: true,
        facetKeys: ["franchise", "subject", "grade"],
        maxValuesPerFacet: 10,
        inventoryProvider: "courtyard",
        fixedMatch: { category: "trading_card" },
        minQuantitySupported: true,
      }],
      probeContract: async () => null,
      searchFacetValues: async () => [
        { value: "Charizard" },
        { value: "Gengar" },
      ],
    };
    const view = renderBuilder({
      kind: "group",
      op: "and",
      children: [{
        kind: "rule",
        gate: {
          type: "erc721_inventory_match",
          provider: "courtyard",
          chain_namespace: "eip155:137",
          contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
          min_quantity: 1,
          match: {
            category: "trading_card",
            subject: ["Charizard", "Gengar"],
          },
        },
      }],
    } as unknown as GateBuilderGroupDraft, { capabilitySource });

    await view.findByText("Courtyard graded cards");
    expect(view.getAllByText("Charizard").length).toBeGreaterThan(0);
    expect(view.getAllByText("Gengar").length).toBeGreaterThan(0);

    fireEvent.change(view.getByRole("spinbutton", { name: "Minimum NFT quantity" }), {
      target: { value: "2" },
    });
    const rule = view.getLatestValue().children[0] as { gate: { match: Record<string, unknown> } };
    expect(rule.gate.match.subject).toEqual(["Charizard", "Gengar"]);
  });

});

describe("inventory facet selection serialization", () => {
  test("uses a scalar for one selection and an array for multiple selections", () => {
    expect(serializeFacetSelection(["Charizard"], 10)).toBe("Charizard");
    expect(serializeFacetSelection(["Charizard", "Gengar"], 10))
      .toEqual(["Charizard", "Gengar"]);
  });

  test("does not confuse a comma-bearing scalar with a multi-value selection", () => {
    expect(serializeFacetSelection(["Charizard,Gengar"], 10)).toBe("Charizard,Gengar");
    expect(serializeFacetSelection(["Charizard", "Gengar"], 10))
      .not.toEqual("Charizard,Gengar");
  });

  test("normalizes changed values, deduplicates like the API, and honors the cap", () => {
    const values = [" Charizard ", "charizard", ...Array.from({ length: 12 }, (_, index) => `Card ${index}`)];
    expect(serializeFacetSelection(values, 3)).toEqual(["Charizard", "Card 0", "Card 1"]);
  });
});

describe("GateTreeBuilder rule validation", () => {
  const courtyardRule = (match: Record<string, unknown>) => ({
    kind: "group",
    op: "and",
    children: [{
      kind: "rule",
      gate: {
        type: "erc721_inventory_match",
        provider: "courtyard",
        chain_namespace: "eip155:137",
        contract_address: "0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD",
        min_quantity: 1,
        match,
      },
    }],
  }) as unknown as GateBuilderGroupDraft;

  test("shows an inline error on an incomplete Courtyard rule rendered read-only", () => {
    // An unresolved inventory source stays read-only and must still explain why the atom is invalid.
    const view = renderBuilder(courtyardRule({ category: "trading_card" }));

    expect(view.getByRole("alert").textContent).toContain("Add at least one attribute filter");
  });

  test("shows the card-specific error on a grade-only rule", () => {
    const view = renderBuilder(courtyardRule({ category: "trading_card", grade: "PSA 9" }));

    expect(view.getByRole("alert").textContent).toContain("Franchise or Name");
  });

  test("shows no error on a complete Courtyard rule", () => {
    const view = renderBuilder(courtyardRule({ category: "trading_card", franchise: "Pokemon" }));

    expect(view.queryByRole("alert")).toBeNull();
  });

  test("does not flag a preserved unknown atom", () => {
    const unknown = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "nft_trait_snapshot_match" } }],
    } as unknown as GateBuilderGroupDraft;

    const view = renderBuilder(unknown);
    expect(view.queryByRole("alert")).toBeNull();
  });

  test("shows an inline error on an out-of-range age", () => {
    const badAge = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "minimum_age", provider: "self", minimum_age: 5 } }],
    } as unknown as GateBuilderGroupDraft;

    expect(renderBuilder(badAge).getByRole("alert").textContent).toContain("18 to 125");
  });

  test("localizes validation messages", () => {
    const badAge = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "minimum_age", provider: "self", minimum_age: 5 } }],
    } as unknown as GateBuilderGroupDraft;

    expect(renderBuilder(badAge, { locale: "ar" }).getByRole("alert").textContent)
      .toContain("عددًا صحيحًا");
    cleanup();
    expect(renderBuilder(badAge, { locale: "zh" }).getByRole("alert").textContent)
      .toContain("整数");
  });
});
