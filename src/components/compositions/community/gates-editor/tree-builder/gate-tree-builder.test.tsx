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
    expect(view.getByText("prove human with Self.xyz")).not.toBeNull();

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
