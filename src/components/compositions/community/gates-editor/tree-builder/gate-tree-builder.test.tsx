import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import type { GateBuilderGroupDraft } from "@/app/authenticated-helpers/community-gate-tree-draft";
import { GateTreeBuilder } from "./gate-tree-builder";

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

function renderBuilder(initialValue: GateBuilderGroupDraft = { kind: "group", op: "and", children: [] }) {
  let latestValue = initialValue;

  function Harness() {
    const [value, setValue] = React.useState(initialValue);
    return (
      <GateTreeBuilder
        onChange={(nextValue) => {
          latestValue = nextValue;
          setValue(nextValue);
        }}
        value={value}
      />
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
    // No capability source is wired in the real app, so this rule takes the read-only branch.
    // It must still explain why it blocks saving, rather than failing silently.
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

    expect(renderBuilder(unknown).queryByRole("alert")).toBeNull();
  });

  test("shows an inline error on an out-of-range age", () => {
    const badAge = {
      kind: "group",
      op: "and",
      children: [{ kind: "rule", gate: { type: "minimum_age", provider: "self", minimum_age: 5 } }],
    } as unknown as GateBuilderGroupDraft;

    expect(renderBuilder(badAge).getByRole("alert").textContent).toContain("18 to 125");
  });
});

