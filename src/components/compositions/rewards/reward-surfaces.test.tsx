import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";

import {
  CashoutSheet,
  SongRewardBadge,
  SongRewardOffer,
  StreakRewardEarned,
  VerifyHumanSheet,
  WalletRewardsCard,
} from "./reward-surfaces";
import * as RewardStories from "./stories/reward-surfaces.stories";

const { window } = installDomGlobals();

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
  test("renders song and streak reward copy", () => {
    const view = render(
      <div>
        <SongRewardBadge amountLabel="$0.10" />
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
        <StreakRewardEarned amountLabel="$0.10" state="earned-today" />
        <StreakRewardEarned activityKind="karaoke" amountLabel="$0.10" state="earned-today" />
      </div>,
    );

    expect(view.getByText("Earn $0.10/day")).toBeTruthy();
    expect(view.getAllByText("Earn $0.40 USDC per day").length).toBe(2);
    expect(view.getAllByText("Reward").length).toBe(2);
    expect(view.getByText("Complete a study set or score at least 72.5% in Karaoke")).toBeTruthy();
    expect(view.getByText("Score at least 70% in Karaoke")).toBeTruthy();
    expect(view.getAllByText("$0.10 reward pending").length).toBe(2);
    expect(view.getByText("Today's karaoke pass qualified. Reward credit updates after confirmation.")).toBeTruthy();
  });

  test("renders wallet cashout and verification states", () => {
    const view = render(
      <WalletRewardsCard
        availableLabel="$1.40"
        balanceLabel="$1.70"
        earnedTodayLabel="$0.30"
        minimumCashoutLabel="$1.00"
        onVerify={() => {}}
        state="verify-required"
      />,
    );

    expect(view.getByText("Rewards")).toBeTruthy();
    expect(view.getByRole("button", { name: "Verify" })).toBeTruthy();
  });

  test("exports verification and cashout sheet elements", () => {
    expect(React.isValidElement(<VerifyHumanSheet open state="provider-selection" />)).toBe(true);
    expect(React.isValidElement(
      <CashoutSheet
        amountLabel="$1.40"
        availableLabel="$1.40"
        minimumCashoutLabel="$1.00"
        open
        recipientLabel="0xc74e...7abc"
        state="confirm"
      />,
    )).toBe(true);
  });

  test("storybook file exports the required reward states", () => {
    expect(RewardStories.SongRewardBadgeDefault).toBeTruthy();
    expect(RewardStories.SongRewardOfferEither).toBeTruthy();
    expect(RewardStories.SongRewardOfferDaily).toBeTruthy();
    expect(RewardStories.WalletRewardsCashoutReady).toBeTruthy();
    expect(RewardStories.VerifyHumanConflict).toBeTruthy();
    expect(RewardStories.CashoutSuccess).toBeTruthy();
    expect(Object.values(RewardStories).filter((story) => typeof story === "object" && story !== null && "render" in story).length).toBe(33);
  });
});
