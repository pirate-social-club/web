import * as React from "react";
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { RewardWalletAssets } from "./reward-wallet-assets";

installDomGlobals();
afterEach(cleanup);

test("keeps fungible rewards separate and gives each asset its own cashout", () => {
  const actions: string[] = [];
  const view = render(
    <RewardWalletAssets
      holdings={[
        {
          actionLabel: "Cash out USDC",
          amountLabel: "12.403333 USDC",
          assetLabel: "USDC on Base",
          id: "usdc",
          kind: "fungible",
          onAction: () => actions.push("usdc"),
        },
        {
          actionLabel: "Cash out $COMMUNITY",
          amountLabel: "25 $COMMUNITY",
          assetLabel: "Community reward token",
          id: "community",
          kind: "fungible",
          onAction: () => actions.push("community"),
        },
      ]}
    />,
  );

  expect(view.queryByText(/total/i)).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Cash out USDC" }));
  fireEvent.click(view.getByRole("button", { name: "Cash out $COMMUNITY" }));
  expect(actions).toEqual(["usdc", "community"]);
});

test("pool win is credited as USDC evidence and never exposes a ticket claim", () => {
  const view = render(
    <RewardWalletAssets
      holdings={[{
        actionLabel: "Cash out",
        amountLabel: "12.403333 USDC",
        assetLabel: "USDC on Base",
        id: "usdc",
        kind: "fungible",
      }]}
      poolCredits={[{
        allocationLabel: "Equal allocation · 3,333 atomic USDC",
        amountLabel: "0.003333 USDC",
        drawingLabel: "Drawing 7,709",
        id: "credit-7709",
        songLabel: "Under-sung song",
        state: "credited",
      }]}
    />,
  );

  expect(view.getByText("Drawing 7,709 · 0.003333 USDC credited")).toBeTruthy();
  expect(view.queryByRole("button", { name: /claim winnings/i })).toBeNull();
  expect(view.queryByText(/ticket #/i)).toBeNull();
});

test("long 18-decimal community-token amount remains complete", () => {
  const amount = "25.123456789012345678 $INTERNATIONALCOMMUNITYTOKEN";
  const view = render(
    <RewardWalletAssets
      holdings={[{
        actionLabel: "Cash out",
        amountLabel: amount,
        assetLabel: "Community reward token",
        id: "community",
        kind: "fungible",
      }]}
    />,
  );
  expect(view.getByText(amount)).toBeTruthy();
});

test("pending custody claim does not inflate the available USDC balance", () => {
  const view = render(
    <RewardWalletAssets
      holdings={[{
        actionLabel: "Cash out",
        amountLabel: "12.40 USDC",
        assetLabel: "USDC on Base",
        id: "usdc",
        kind: "fungible",
      }]}
      poolCredits={[{
        allocationLabel: "12 committed singers",
        amountLabel: "5.00 USDC gross",
        drawingLabel: "Drawing 7,709",
        id: "credit-pending",
        songLabel: "Under-sung song",
        state: "claim_pending",
      }]}
    />,
  );
  expect(view.getByText("12.40 USDC")).toBeTruthy();
  expect(view.getByText("Drawing 7,709 · 5.00 USDC gross awaiting claim")).toBeTruthy();
});

test("wallet rows expose named groups", () => {
  const view = render(
    <RewardWalletAssets holdings={[{
      actionLabel: "Cash out",
      amountLabel: "12.40 USDC",
      assetLabel: "USDC on Base",
      id: "usdc",
      kind: "fungible",
    }]} />,
  );
  expect(view.getByRole("group", { name: "USDC on Base bounty balance" })).toBeTruthy();
});
