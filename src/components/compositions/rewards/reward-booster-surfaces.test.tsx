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

// The test DOM has no KeyboardEvent constructor and fireEvent cannot build one
// with a usable `key`, so arrow-key tests dispatch an initialized event directly.
function arrowKey(target: Element, key: "ArrowDown" | "ArrowUp") {
  const event = document.createEvent("Event");
  event.initEvent("keydown", true, true);
  Object.defineProperty(event, "key", { value: key });
  target.dispatchEvent(event);
}

mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { BoostCampaignSheet, SongRewardPolicySheet } = await import("./reward-booster-surfaces");
type SheetProps = import("./reward-booster-surfaces").BoostCampaignSheetProps;

function composeProps(overrides: Partial<SheetProps> = {}): SheetProps {
  return {
    budgetDisplayLabel: "$10.00",
    budgetLabel: "10.00",
    dailyRewardDisplayLabel: "$1.00",
    dailyRewardLabel: "1.00",
    eligibleActivity: "karaoke",
    onOpenChange: () => undefined,
    open: true,
    rewardCountLabel: "10 rewards",
    state: "compose",
    ...overrides,
  };
}

test("compose offers the exclusive activity enum as a radio group with explicit OR copy", () => {
  let selected = "";
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        onEligibleActivityChange: (activity: string) => { selected = activity; },
      })}
    />,
  );

  expect(view.getAllByRole("radio")).toHaveLength(3);
  expect(view.getByRole("radio", { name: "Karaoke" }).getAttribute("aria-checked")).toBe("true");
  expect(view.getByRole("radio", { name: "Study" }).getAttribute("aria-checked")).toBe("false");

  fireEvent.click(view.getByRole("radio", { name: "Karaoke or study" }));
  expect(selected).toBe("either");
});

test("compose radio group moves selection with arrow keys", () => {
  let selected = "";
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        onEligibleActivityChange: (activity: string) => { selected = activity; },
      })}
    />,
  );

  arrowKey(view.getByRole("radio", { name: "Karaoke" }), "ArrowDown");
  expect(selected).toBe("study");
  arrowKey(view.getByRole("radio", { name: "Karaoke" }), "ArrowUp");
  expect(selected).toBe("either");
});

test("compose states the funding terms once, without restating the inputs", () => {
  const view = render(<BoostCampaignSheet {...composeProps()} />);

  expect(view.getByText(/You pay \$10\.00 now\. The reward and budget lock after payment/)).toBeTruthy();
  expect(view.getByText(/can't be withdrawn/)).toBeTruthy();
  expect(view.getByText("Pays for")).toBeTruthy();
  expect(view.getByText("Up to 10 rewards")).toBeTruthy();
  expect(view.queryByText(/Qualifies by/)).toBeNull();
  expect(view.queryByText(/One reward per person/)).toBeNull();
  expect(view.queryByText(/Unused money cannot be withdrawn/)).toBeNull();
  expect(view.queryByText(/cannot be changed after you pay/)).toBeNull();
  expect(view.queryByText(/refund whatever is left/i)).toBeNull();
});

test("quote hides payment infrastructure, shows the formatted reward, and offers wallet recovery", () => {
  let connectCalls = 0;
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        fundingAmountLabel: "$10.00",
        onConnectWallet: () => { connectCalls += 1; },
        state: "quote",
        walletMismatch: true,
        walletMismatchReason: "different-wallet",
      })}
    />,
  );

  expect(view.queryByText(/0x2222/i)).toBeNull();
  expect(view.queryByText(/0x3333/i)).toBeNull();
  expect(view.getByText("$1.00")).toBeTruthy();
  expect(view.getByText(/A different wallet is connected/)).toBeTruthy();
  expect(view.getByText("Pay $10.00").closest("button")?.disabled).toBe(true);

  fireEvent.click(view.getByRole("button", { name: "Connect Pirate Wallet" }));
  expect(connectCalls).toBe(1);
});

test("quote explains a missing wallet without a dead-end warning", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        fundingAmountLabel: "$10.00",
        state: "quote",
        walletMismatch: true,
        walletMismatchReason: "no-wallet",
      })}
    />,
  );

  expect(view.getByText(/Connect your Pirate Wallet to pay/)).toBeTruthy();
  expect(view.queryByText(/Do not pay from a different wallet/)).toBeNull();
});

test("compose stays visually stable while funding is prepared", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ busy: true })} />);

  expect(view.queryByText("Preparing funding")).toBeNull();
  expect(view.getAllByText("Review funding").at(-1)?.closest("button")?.disabled).toBe(true);
});

test("confirming describes the wait in plain language", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ state: "confirming" })} />);

  expect(view.getByText(/once the network confirms the transfer/)).toBeTruthy();
  expect(view.queryByText(/safe block/)).toBeNull();
});

test("live boost labels metrics plainly", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        eligibleActivity: "either",
        endsAtLabel: "31 Jul",
        fundedLabel: "$10.00",
        remainingLabel: "$7.00",
        rewardsPaidLabel: "$3.00",
        state: "active",
      })}
    />,
  );

  expect(view.getByText(/People can now earn \$1\.00 for a study set or karaoke pass/)).toBeTruthy();
  expect(view.getByText("Paid out")).toBeTruthy();
  expect(view.getByText("Per day")).toBeTruthy();
  expect(view.queryByText("Earned")).toBeNull();
  expect(view.queryByText("Each")).toBeNull();
});

test("owner policy toggles via a switch and only warns while blocking", () => {
  let next: boolean | undefined;
  const view = render(
    <SongRewardPolicySheet
      allowThirdPartyRewards
      onAllowThirdPartyRewardsChange={(allowed) => { next = allowed; }}
      onOpenChange={() => undefined}
      open
    />,
  );

  const toggle = view.getByRole("switch", { name: "Allow others to boost this song" });
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(view.queryByText(/Campaign funding is not returned/)).toBeNull();

  fireEvent.click(toggle);
  expect(next).toBe(false);

  view.rerender(
    <SongRewardPolicySheet
      allowThirdPartyRewards={false}
      onOpenChange={() => undefined}
      open
    />,
  );
  expect(view.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  expect(view.getByText(/Campaign funding is not returned/)).toBeTruthy();
});

test("terminal funding review exposes the transaction and support reference without a retry", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        errorMessage: "Funds were received, but the campaign was not activated.",
        explorerTxUrl: "https://sepolia.basescan.org/tx/0x1234",
        onRetry: () => { throw new Error("must not render"); },
        state: "funding-review",
        supportReference: "rfq_support",
      })}
    />,
  );
  expect(view.getByText("Campaign not activated")).toBeTruthy();
  expect(view.getByText("rfq_support")).toBeTruthy();
  expect(view.getByText("View funding transaction")).toBeTruthy();
  expect(view.queryByText("Retry confirmation")).toBeNull();
});

test("funding review falls back to plain-language copy", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ state: "funding-review" })} />);

  expect(view.getByText(/Funds arrived, but the boost didn't activate/)).toBeTruthy();
  expect(view.queryByText(/terminal funding state/)).toBeNull();
});

/* ── Nationality payout tiers (dark preview) ────────────────────────────── */

const TIER_VN = { amountLabel: "0.50", id: "tier-vn", nationalities: ["VNM"] };
const TIER_US = { amountLabel: "5.00", id: "tier-us", nationalities: ["USA"] };

test("without the payoutTiers prop the sheet renders exactly as before (dark default)", () => {
  const view = render(<BoostCampaignSheet {...composeProps()} />);

  expect(view.queryByText("Payout by nationality")).toBeNull();
  expect(view.queryByText(/publicly visible on-chain/)).toBeNull();
  expect(view.getByText("Daily reward per learner")).toBeTruthy();
  expect(view.getByText("Up to 10 rewards")).toBeTruthy();
});

test("an empty tier list shows the section with the privacy note and an add button", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ payoutTiers: [] })} />);

  expect(view.getByText("Payout by nationality")).toBeTruthy();
  expect(view.getByText(/Payout amounts are publicly visible on-chain and differ by tier/)).toBeTruthy();
  expect(view.getByText("Default daily reward")).toBeTruthy();
  expect(view.getByRole("button", { name: "Add a tier" })).toBeTruthy();
  // No rows yet: the count stays an untiered ceiling.
  expect(view.getByText("Up to 10 rewards")).toBeTruthy();
});

test("tiered compose shows the worst-case floor, never a blend", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        budgetDisplayLabel: "$25.00",
        budgetLabel: "25.00",
        maxClaimDisplayLabel: "$5.00",
        payoutTiers: [TIER_VN, TIER_US],
        rewardCountLabel: "5 rewards",
      })}
    />,
  );

  expect(view.getByText("At least 5 rewards")).toBeTruthy();
  expect(view.queryByText(/Up to 5 rewards/)).toBeNull();
  // The direction flip ("up to" → "at least") always carries its explanation.
  expect(view.getByText(/Worst case assumes the top tier \(\$5\.00\) on every claim/)).toBeTruthy();
  expect(view.getByText("Tier 1")).toBeTruthy();
  expect(view.getByText("Tier 2")).toBeTruthy();
});

test("add and remove tier emit intents; the owner mints and owns row ids", () => {
  let added = 0;
  let removedId: string | undefined;
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        onAddPayoutTier: () => { added += 1; },
        onRemovePayoutTier: (tierId: string) => { removedId = tierId; },
        payoutTiers: [TIER_VN, TIER_US],
      })}
    />,
  );

  fireEvent.click(view.getByRole("button", { name: "Add a tier" }));
  expect(added).toBe(1);

  fireEvent.click(view.getByRole("button", { name: "Remove tier 2" }));
  expect(removedId).toBe("tier-us");
});

test("add tier is disabled at the tier cap", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        maxPayoutTiers: 2,
        payoutTiers: [TIER_VN, TIER_US],
      })}
    />,
  );

  expect(view.getByRole("button", { name: "Add a tier" }).closest("button")?.disabled).toBe(true);
});

test("tiered quote shows the range and the guaranteed floor", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        fundingAmountLabel: "$25.00",
        payoutTiers: [TIER_VN, TIER_US],
        rewardCountLabel: "5 rewards",
        state: "quote",
        tierRangeLabel: "$0.50–$5.00 by nationality",
      })}
    />,
  );

  expect(view.getByText("$0.50–$5.00 by nationality")).toBeTruthy();
  expect(view.getByText("At least 5 rewards")).toBeTruthy();
});
