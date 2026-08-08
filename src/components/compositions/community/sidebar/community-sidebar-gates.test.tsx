import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";

const { cleanup, render } = await import("@testing-library/react");
const { CommunitySidebarGates } = await import("./community-sidebar-gates");

afterEach(() => {
  cleanup();
});

const items = [
  { gateType: "wallet_score", label: "Passport Score 8+", status: "unmet" as const },
  { gateType: "unique_human", label: "Palm scan", provider: "very", status: "unmet" as const },
  { gateType: "altcha_pow", label: "Browser anti-bot check", status: "unmet" as const },
];

describe("CommunitySidebarGates", () => {
  test("renders right-side OR markers for a guarded flat OR", () => {
    const { getAllByText } = render(
      <CommunitySidebarGates
        expressionLabel="Passport Score 8+, Palm scan, or Proof of work"
        items={items}
        mode="any"
        showFlatOrMarkers
      />,
    );

    expect(getAllByText("OR")).toHaveLength(2);
  });

  test("leaves nested expressions to the expression sentence", () => {
    const { queryByText, getByText } = render(
      <CommunitySidebarGates
        expressionLabel="Self.xyz ID proof and (Palm scan or Proof of work)"
        items={items}
        mode="any"
      />,
    );

    expect(getByText("Self.xyz ID proof and (Palm scan or Proof of work)")).toBeTruthy();
    expect(queryByText("OR")).toBeNull();
  });
});
