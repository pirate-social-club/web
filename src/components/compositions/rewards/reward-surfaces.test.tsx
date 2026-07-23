import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import * as React from "react";

import { installDomGlobals } from "@/test/setup-dom";

import {
  CashoutSheet,
  RewardQualificationNotice,
  rewardAmountLabel,
  rewardCtaAmountLabel,
  SongRewardOffer,
  VerifyHumanSheet,
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
      </div>,
    );

    expect(view.getAllByText("Earn $0.40 USDC today").length).toBe(2);
    expect(view.getAllByText("Reward").length).toBe(2);
    expect(view.getByText(/Complete a study set or score at least 72.5% in Karaoke/u)).toBeTruthy();
    expect(view.getByText(/Score at least 70% in Karaoke/u)).toBeTruthy();
    expect(view.getByText("Checking your $0.10 reward…")).toBeTruthy();
    expect(view.getByText("+$0.10 🎉")).toBeTruthy();
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

  test("exports verification and cashout sheet elements", () => {
    expect(React.isValidElement(<VerifyHumanSheet open providers={["self"]} state="provider-selection" />)).toBe(true);
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
    expect(RewardStories.Offer).toBeTruthy();
    expect(RewardStories.QualificationStates).toBeTruthy();
    expect(RewardStories.VerificationPending).toBeTruthy();
    expect(RewardStories.CashoutPending).toBeTruthy();
  });
});
