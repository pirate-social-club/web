import * as React from "react";
import { expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
installDomGlobals();
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    matches: false,
    removeEventListener: () => undefined,
  }),
});
class MutationObserverStub {
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
}
Object.defineProperty(globalThis, "MutationObserver", { configurable: true, value: MutationObserverStub });

mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { BoostCampaignSheet, SongRewardPolicySheet } = await import("./reward-booster-surfaces");

test("compose selects karaoke, study, or either and explains upfront funding", () => {
  let selected = "";
  const view = render(
    <BoostCampaignSheet
      budgetDisplayLabel="$10.00"
      budgetLabel="10.00"
      dailyRewardLabel="1.00"
      eligibleActivity="karaoke"
      onEligibleActivityChange={(activity) => { selected = activity; }}
      onOpenChange={() => undefined}
      open
      rewardCountLabel="10 rewards"
      state="compose"
    />,
  );

  fireEvent.click(view.getByText("Either"));
  expect(selected).toBe("either");
  expect(view.getByText(/You pay \$10\.00 now/i)).toBeTruthy();
  expect(view.getByText(/Unused money cannot be withdrawn yet/i)).toBeTruthy();
  expect(view.queryByText(/refund whatever is left/i)).toBeNull();
});

test("quote hides payment infrastructure and blocks when the pinned wallet is unavailable", () => {
  const view = render(
    <BoostCampaignSheet
      budgetDisplayLabel="$10.00"
      budgetLabel="10.00"
      dailyRewardLabel="1.00"
      eligibleActivity="karaoke"
      fundingAmountLabel="$10.00"
      onOpenChange={() => undefined}
      open
      rewardCountLabel="10 rewards"
      state="quote"
      walletMismatch
    />,
  );

  expect(view.queryByText(/0x2222/i)).toBeNull();
  expect(view.queryByText(/0x3333/i)).toBeNull();
  expect(view.getByText("Pay $10.00").closest("button")?.disabled).toBe(true);
  expect(view.getByText(/Connect your Pirate Wallet/i)).toBeTruthy();
});

test("preparing hides quote-expiry recovery details", () => {
  const view = render(
    <BoostCampaignSheet
      budgetDisplayLabel="$10.00"
      budgetLabel="10.00"
      dailyRewardLabel="1.00"
      eligibleActivity="karaoke"
      onOpenChange={() => undefined}
      open
      rewardCountLabel="10 rewards"
      state="preparing"
    />,
  );

  expect(view.getByText("Preparing funding")).toBeTruthy();
  expect(view.queryByText(/quote expired/i)).toBeNull();
  expect(view.queryByText(/start again/i)).toBeNull();
});

test("owner policy explains that blocking does not return funding", () => {
  const view = render(
    <SongRewardPolicySheet
      allowThirdPartyRewards
      onOpenChange={() => undefined}
      open
    />,
  );
  expect(view.getByText(/Campaign funding is not returned/i)).toBeTruthy();
});

test("terminal funding review exposes the transaction and support reference without a retry", () => {
  const view = render(
    <BoostCampaignSheet
      budgetDisplayLabel="$10.00"
      budgetLabel="10.00"
      dailyRewardLabel="1.00"
      eligibleActivity="karaoke"
      errorMessage="Funds were received, but the campaign was not activated."
      explorerTxUrl="https://sepolia.basescan.org/tx/0x1234"
      onOpenChange={() => undefined}
      onRetry={() => { throw new Error("must not render"); }}
      open
      rewardCountLabel="10 rewards"
      state="funding-review"
      supportReference="rfq_support"
    />,
  );
  expect(view.getByText("Campaign not activated")).toBeTruthy();
  expect(view.getByText("rfq_support")).toBeTruthy();
  expect(view.getByText("View funding transaction")).toBeTruthy();
  expect(view.queryByText("Retry confirmation")).toBeNull();
});
