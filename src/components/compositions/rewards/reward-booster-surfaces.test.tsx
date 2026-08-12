import * as React from "react";
import { expect, mock, test } from "bun:test";
import { act, fireEvent, render, within } from "@testing-library/react";

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
const TRANSACTION_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TRANSACTION_URL = `https://basescan.org/tx/${TRANSACTION_HASH}`;

function composeProps(overrides: Partial<SheetProps> = {}): SheetProps {
  return {
    budgetDisplayLabel: "$10.00",
    budgetLabel: "10.00",
    dailyRewardDisplayLabel: "$1.00",
    dailyRewardLabel: "1.00",
    eligibleActivity: "karaoke",
    identityProvider: "very",
    onOpenChange: () => undefined,
    open: true,
    rewardCountLabel: "10 completions",
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

  const activityGroup = view.getByRole("radiogroup", { name: "People earn by" });
  expect(within(activityGroup).getAllByRole("radio")).toHaveLength(3);
  expect(view.getByRole("radio", { name: "Karaoke" }).getAttribute("aria-checked")).toBe("true");
  expect(view.getByRole("radio", { name: "Study" }).getAttribute("aria-checked")).toBe("false");

  fireEvent.click(view.getByRole("radio", { name: "Either" }));
  expect(selected).toBe("either");
});

test("compose supports suffix token amounts without assuming two decimals", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        budgetDisplayLabel: "2500 $COMMUNITY",
        budgetInputAdornment: { label: "$COMMUNITY", placement: "suffix" },
        budgetLabel: "2500",
        dailyRewardDisplayLabel: "25.123456789012345678 $COMMUNITY",
        dailyRewardLabel: "25.123456789012345678",
        rewardInputAdornment: { label: "$COMMUNITY", placement: "suffix" },
      })}
    />,
  );

  expect(view.getAllByText("$COMMUNITY")).toHaveLength(2);
  expect((view.getByRole("textbox", { name: "Bounty per learner $COMMUNITY" }) as HTMLInputElement).value).toBe("25.123456789012345678");
  expect((view.getByRole("textbox", { name: "Total budget $COMMUNITY" }) as HTMLInputElement).value).toBe("2500");
});

test("top-up keeps objective, bounty, and end date immutable", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        budgetPresets: ["$10.00", "$25.00", "$50.00"],
        dailyRewardDisplayLabel: "$0.40 USDC",
        eligibleActivity: "study",
        endsAtLabel: "30 Sep",
        fundedLabel: "$20.00 USDC",
        remainingLabel: "$8.20 USDC",
        state: "top_up",
      })}
    />,
  );

  expect(view.getByText("Fund bounty")).toBeTruthy();
  expect(view.getByText("$0.40 USDC")).toBeTruthy();
  expect(view.getByText("$20.00 USDC")).toBeTruthy();
  expect(view.getByText("$8.20 USDC")).toBeTruthy();
  expect(view.getByText("30 Sep")).toBeTruthy();
  expect(view.getByRole("button", { name: "$10.00" })).toBeTruthy();
  expect(view.getByRole("button", { name: "$25.00" })).toBeTruthy();
  expect(view.getByRole("button", { name: "$50.00" })).toBeTruthy();
  expect(view.getByText("Funding adds rewards without changing the bounty terms or end date.")).toBeTruthy();
  expect(view.queryByRole("radiogroup", { name: "People earn by" })).toBeNull();
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

test("creator can select an allowed claimant verification provider", () => {
  let selected = "";
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        identityProvider: "very",
        identityProviderChoices: ["self", "zkpassport", "very"],
        onIdentityProviderChange: (provider) => { selected = provider; },
        payoutTiers: [],
      })}
    />,
  );
  expect(view.getByText("Claimant check")).toBeTruthy();
  expect(view.getByRole("radio", { name: "Very" }).getAttribute("aria-checked")).toBe("true");
  view.getByRole("radio", { name: "ZKPassport" }).click();
  expect(selected).toBe("zkpassport");

  view.rerender(
    <BoostCampaignSheet
      {...composeProps({
        identityProvider: "self",
        identityProviderChoices: [],
        payoutTiers: [{ id: "tier_vn", nationalities: ["VN"], amountLabel: "5.00" }],
        state: "quote",
      })}
    />,
  );
  expect(view.getByText("Passport check · Self")).toBeTruthy();
});

test("persisted bounty provider remains visible without becoming selectable", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({ identityProvider: "zkpassport", state: "quote" })}
    />,
  );
  expect(view.getByText("Passport check · ZKPassport")).toBeTruthy();
  expect(view.queryByRole("radio", { name: "ZKPassport" })).toBeNull();
});

test("compose states the funding terms once, without restating the inputs", () => {
  const view = render(<BoostCampaignSheet {...composeProps()} />);

  expect(view.getByText(/You pay \$10\.00 now\. Bounty terms lock after payment/)).toBeTruthy();
  expect(view.getByText(/can't be withdrawn/)).toBeTruthy();
  expect(view.queryByText("Pays for")).toBeNull();
  expect(view.queryByText(/Qualifies by/)).toBeNull();
  expect(view.queryByText(/One bounty per person/)).toBeNull();
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
  expect(view.getByText("Approve payment").closest("button")?.disabled).toBe(true);

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

test("wallet approval is distinct from a submitted payment", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ state: "confirming" })} />);

  expect(view.getByText("Approve payment")).toBeTruthy();
  expect(view.getByText("Confirm the payment in your wallet.")).toBeTruthy();
  expect(view.queryByLabelText("Funding transaction")).toBeNull();
  expect(view.queryByText("Check status")).toBeNull();
});

test("a submitted payment exposes the full copyable hash and BaseScan link", async () => {
  const copied: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (value: string) => { copied.push(value); } },
  });
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        explorerTxUrl: TRANSACTION_URL,
        state: "confirming",
        transactionHash: TRANSACTION_HASH,
      })}
    />,
  );

  expect(view.getByText("Payment sent")).toBeTruthy();
  const hash = view.getByText(TRANSACTION_HASH);
  expect(hash.className).toContain("break-all");
  expect(hash.className).not.toContain("truncate");
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Copy transaction hash" }));
    await Promise.resolve();
  });
  expect(copied).toEqual([TRANSACTION_HASH]);
  expect(view.getByRole("link", { name: /View on BaseScan/ }).getAttribute("href")).toBe(TRANSACTION_URL);
});

test("activating keeps the transaction visible and makes status refresh secondary", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        busy: true,
        explorerTxUrl: TRANSACTION_URL,
        state: "awaiting-finality",
        transactionHash: TRANSACTION_HASH,
      })}
    />,
  );

  expect(view.getByText("Activating bounty…")).toBeTruthy();
  expect(view.getByText(/Your payment is on Base\. The bounty will activate automatically/)).toBeTruthy();
  expect(view.getByText(/Do not send again/)).toBeTruthy();
  expect(view.getByText("Check status").closest("button")?.disabled).toBe(true);
  expect(view.getByText(TRANSACTION_HASH)).toBeTruthy();
  expect(view.queryByText("Funding failed")).toBeNull();
});

test("live Study bounty keeps the transaction visible and uses Study activity copy", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        eligibleActivity: "study",
        endsAtLabel: "31 Jul",
        explorerTxUrl: TRANSACTION_URL,
        fundedLabel: "$10.00",
        remainingLabel: "$7.00",
        rewardsPaidLabel: "$3.00",
        state: "active",
        transactionHash: TRANSACTION_HASH,
      })}
    />,
  );

  expect(view.getByText(/People can earn \$1\.00 for a study set/)).toBeTruthy();
  expect(view.queryByText(/karaoke pass/)).toBeNull();
  expect(view.getByText(TRANSACTION_HASH)).toBeTruthy();
  expect(view.getByText("Earned")).toBeTruthy();
  expect(view.getByText("Each")).toBeTruthy();
  expect(view.queryByText("Paid out")).toBeNull();
  expect(view.queryByText("Per day")).toBeNull();
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

  const toggle = view.getByRole("switch", { name: "Allow others to fund bounties" });
  expect(toggle.getAttribute("aria-checked")).toBe("true");
  expect(view.queryByText(/Funding is not returned/)).toBeNull();

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
  expect(view.getByText(/Funding is not returned/)).toBeTruthy();
});

test("terminal funding review exposes the transaction and support reference without a retry", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        errorMessage: "Funds were received, but the campaign was not activated.",
        explorerTxUrl: TRANSACTION_URL,
        onRetry: () => { throw new Error("must not render"); },
        state: "funding-review",
        supportReference: "rfq_support",
        transactionHash: TRANSACTION_HASH,
      })}
    />,
  );
  expect(view.getByText("Campaign not activated")).toBeTruthy();
  expect(view.getByText("rfq_support")).toBeTruthy();
  expect(view.getByText(TRANSACTION_HASH)).toBeTruthy();
  expect(view.getByText("View on BaseScan")).toBeTruthy();
  expect(view.queryByText("Retry confirmation")).toBeNull();
});

test("funding review falls back to plain-language copy", () => {
  const view = render(<BoostCampaignSheet {...composeProps({ state: "funding-review" })} />);

  expect(view.getByText(/Funds arrived, but the bounty didn't activate/)).toBeTruthy();
  expect(view.queryByText(/terminal funding state/)).toBeNull();
});

/* ── Nationality payout tiers (dark preview) ────────────────────────────── */

const TIER_VN = { amountLabel: "0.50", id: "tier-vn", nationalities: ["VNM"] };
const TIER_US = { amountLabel: "5.00", id: "tier-us", nationalities: ["USA"] };

test("without the payoutTiers prop the sheet renders exactly as before (dark default)", () => {
  const view = render(<BoostCampaignSheet {...composeProps()} />);

  expect(view.queryByText("Countries")).toBeNull();
  expect(view.queryByText(/public on-chain/)).toBeNull();
  expect(view.getByText("Bounty per learner")).toBeTruthy();
});

test("nationality pricing starts with a schedule and no invalid blank country row", () => {
  const view = render(
    <BoostCampaignSheet {...composeProps({ nationalityPricingEnabled: true, payoutTiers: [] })} />,
  );

  expect(view.getByText("A passport is required.")).toBeTruthy();
  expect(view.queryByText("Countries")).toBeNull();
  expect(view.queryByText("Amount")).toBeNull();
  expect(view.getByText("Everyone else")).toBeTruthy();
  expect(view.getByRole("button", { name: "Add countries" })).toBeTruthy();
  expect(view.queryByRole("combobox")).toBeNull();
  expect(view.queryByText(/public on Base/)).toBeNull();
});

test("tiered compose shows the payout schedule and live budget range", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        budgetDisplayLabel: "$25.00",
        budgetLabel: "25.00",
        completionRangeLabel: "5–50 completions",
        maxClaimDisplayLabel: "$5.00",
        payoutTiers: [TIER_VN, TIER_US],
        rewardCountLabel: "5 completions",
      })}
    />,
  );

  expect(view.getByText(/\$25\.00 funds about 5–50 completions/)).toBeTruthy();
  expect(view.getByText("Countries")).toBeTruthy();
  expect(view.getByText("Amount")).toBeTruthy();
  expect(view.getByRole("textbox", { name: "Country group 1 bounty $" })).toBeTruthy();
  expect(view.getByRole("textbox", { name: "Country group 2 bounty $" })).toBeTruthy();
  expect(view.queryByText(/Tier 1/)).toBeNull();
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

  fireEvent.click(view.getByRole("button", { name: "Add countries" }));
  expect(added).toBe(1);

  fireEvent.click(view.getByRole("button", { name: "Remove country group 2" }));
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

  expect(
    view.getByRole("button", { name: "Add countries" }).closest("button")?.disabled,
  ).toBe(true);
});

test("tiered quote shows the range and the guaranteed floor", () => {
  const view = render(
    <BoostCampaignSheet
      {...composeProps({
        fundingAmountLabel: "$25.00",
        payoutTiers: [TIER_VN, TIER_US],
        rewardCountLabel: "5 completions",
        state: "quote",
        tierRangeLabel: "$0.50–$5.00 by nationality",
      })}
    />,
  );

  expect(view.getByText("$0.50–$5.00 by nationality")).toBeTruthy();
  expect(view.getByText("At least 5 completions")).toBeTruthy();
});

test("draft preview confirms persistence without offering payment", () => {
  const view = render(
    <BoostCampaignSheet {...composeProps({ state: "draft-preview" })} />,
  );

  expect(view.getByText("Tiered draft saved")).toBeTruthy();
  expect(view.getByText(/No payment was requested/)).toBeTruthy();
  expect(view.queryByText(/^Pay /)).toBeNull();
  expect(view.getByRole("button", { name: "Done" })).toBeTruthy();
});
