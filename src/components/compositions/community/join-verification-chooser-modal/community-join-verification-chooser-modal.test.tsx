import "@/test/setup-runtime";

import { afterEach, describe, expect, mock, test } from "bun:test";
import type * as React from "react";

mock.module("@/components/compositions/community/interaction-gate-modal/community-interaction-gate-modal", () => ({
  CommunityInteractionGateModal: ({ body }: { body?: React.ReactNode }) => <div>{body}</div>,
}));

const { cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");
const { CommunityJoinVerificationChooserModal } = await import("./community-join-verification-chooser-modal");

afterEach(() => {
  cleanup();
});

describe("CommunityJoinVerificationChooserModal", () => {
  test("lets the viewer choose each OR branch explicitly", async () => {
    const selected: string[] = [];
    const { getByRole } = render(
      <CommunityJoinVerificationChooserModal
        choices={[
          { gate_type: "wallet_score", minimum_score: 8 },
          { accepted_providers: ["self"], gate_type: "unique_human" },
          { accepted_providers: ["zkpassport"], gate_type: "unique_human" },
          { accepted_providers: ["very"], gate_type: "unique_human" },
          {
            asset_decimals: 18,
            asset_id: "eip155:1/slip44:60",
            asset_symbol: "ETH",
            gate_type: "asset_balance",
            min_amount_atomic: "500000000000000000",
          },
          { gate_type: "altcha_pow" },
        ]}
        locale="en"
        onChoose={(gate) => {
          selected.push(gate.gate_type);
        }}
        onOpenChange={() => undefined}
        open
      />,
    );

    expect(getByRole("button", { name: "Self.xyz ID proof" })).toBeTruthy();
    expect(getByRole("button", { name: "ZKPassport proof" })).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Palm scan" }));
    await waitFor(() => expect(selected).toEqual(["unique_human"]));
    fireEvent.click(getByRole("button", { name: "At least 0.5 ETH" }));
    await waitFor(() => expect(selected).toEqual(["unique_human", "asset_balance"]));
    fireEvent.click(getByRole("button", { name: "Browser anti-bot check" }));
    await waitFor(() => expect(selected).toEqual(["unique_human", "asset_balance", "altcha_pow"]));
  });
});
