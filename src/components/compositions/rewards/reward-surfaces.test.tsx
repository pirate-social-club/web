import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";

const { window } = installDomGlobals();

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

// The assertions exercise settlement content and links. Render the shell inline
// because Radix portals dispatch custom events that linkedom cannot deliver.
mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const {
  CashoutSheet,
  displayedRewardQualificationStatus,
  RewardQualificationNotice,
  REWARD_NATIONALITY_DISCLOSURE,
  rewardAmountLabel,
  rewardCtaAmountLabel,
  SongRewardOffer,
  VerifyHumanSheet,
} = await import("./reward-surfaces");
const RewardStories = await import("./stories/reward-surfaces.stories");

Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: () => ({ getPropertyValue: () => "" }),
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    matches: false,
    removeEventListener: () => undefined,
  }),
});

describe("reward surfaces", () => {
  test("renders offer and server-owned qualification states", () => {
    const view = render(
      <div>
        <SongRewardOffer
          amountLabel="$0.40 USDC"
          eligibleActivity="either"
          minScoreBps={7250}
        />
        <SongRewardOffer
          amountLabel="$0.40 USDC"
          eligibleActivity="karaoke"
          minScoreBps={7000}
        />
        <RewardQualificationNotice amountLabel="$0.10" status="checking" />
        <RewardQualificationNotice amountLabel="$0.10" status="credited" />
        <RewardQualificationNotice amountLabel="$0.10" status="delayed" testMode />
        <RewardQualificationNotice amountLabel="$0.10" outcomeReason="score" status="unavailable" />
      </div>,
    );

    expect(view.getAllByText("Earn $0.40 USDC today").length).toBe(2);
    expect(view.getAllByText("Reward").length).toBe(2);
    expect(view.getByText(/Complete a study set or score at least 72.5% in Karaoke/u)).toBeTruthy();
    expect(view.getByText(/Score at least 70% in Karaoke/u)).toBeTruthy();
    expect(view.getByText("Checking your $0.10 reward…")).toBeTruthy();
    expect(view.getByText("+$0.10 🎉")).toBeTruthy();
    expect(view.getByText("Still checking your reward")).toBeTruthy();
    expect(view.getByText("Test reward — no cash value.")).toBeTruthy();
    expect(view.getByText("Your score was below the reward target.")).toBeTruthy();
  });

  test("uses plain dollar labels on every settlement chain", () => {
    expect(rewardAmountLabel(100, 8453)).toBe("$1");
    expect(rewardAmountLabel(100, 84532)).toBe("$1");
    expect(rewardAmountLabel(100, 1)).toBe("$1");
  });

  test("formats compact reward amounts for action labels", () => {
    expect(rewardCtaAmountLabel(100)).toBe("$1");
    expect(rewardCtaAmountLabel(10)).toBe("$0.10");
  });

  test("degrades a missing or stuck checking projection after polling times out", () => {
    expect(displayedRewardQualificationStatus(null, true)).toBe("delayed");
    expect(displayedRewardQualificationStatus("checking", true)).toBe("delayed");
    expect(displayedRewardQualificationStatus("pending_verification", true)).toBe("pending_verification");
    expect(displayedRewardQualificationStatus("credited", true)).toBe("credited");
  });

  test("exports verification and cashout sheet elements", () => {
    expect(React.isValidElement(<VerifyHumanSheet open providers={["self"]} state="provider-selection" />)).toBe(true);
    expect(React.isValidElement(
      <CashoutSheet
        amountLabel="$1.40"
        open
        state="reserved"
      />,
    )).toBe(true);
  });

  test("shows a signed hash under the user-facing sending state", () => {
    const hash = "0x4b6c9f0a8d3e2c1b7a6d5e4f3c2b1a0987654321abcdef1234567890abcdef12";
    const view = render(
      <CashoutSheet amountLabel="$1.00" forceMobile={false} open state="signed" txHashLabel={hash} />,
    );

    expect(view.getByText("Sending…")).toBeTruthy();
    expect(view.getByText(hash)).toBeTruthy();
    expect(view.getByText("Not yet visible on Base.")).toBeTruthy();
    expect(view.queryByText("Transaction signed")).toBeNull();
    expect(view.queryByText("It has not been observed on Base yet.")).toBeNull();
    expect(view.queryByText("View on Basescan")).toBeNull();
    view.unmount();
  });

  test("links a broadcast transaction to Basescan", () => {
    const hash = "0x4b6c9f0a8d3e2c1b7a6d5e4f3c2b1a0987654321abcdef1234567890abcdef12";
    const basescanUrl = `https://basescan.org/tx/${hash}`;
    const view = render(
      <CashoutSheet
        amountLabel="$1.00"
        basescanUrl={basescanUrl}
        forceMobile={false}
        open
        state="broadcast"
        txHashLabel={hash}
      />,
    );

    expect(view.getByText("Sent — waiting for confirmation")).toBeTruthy();
    expect(view.getByRole("link", { name: /View on Basescan/u }).getAttribute("href")).toBe(basescanUrl);
    view.unmount();
  });

  test("defines the passport-nationality and public-chain disclosure shown before verification", () => {
    expect(REWARD_NATIONALITY_DISCLOSURE).toContain("passport nationality");
    expect(REWARD_NATIONALITY_DISCLOSURE).toContain("public on-chain");
  });

  test("storybook file exports the required reward states", () => {
    expect(RewardStories.Offer).toBeTruthy();
    expect(RewardStories.QualificationStates).toBeTruthy();
    expect(RewardStories.VerificationPending).toBeTruthy();
    expect(RewardStories.CashoutPending).toBeTruthy();
  });
});
