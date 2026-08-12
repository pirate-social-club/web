import * as React from "react";
import { expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { RewardWalletAssets } from "./reward-wallet-assets";

installDomGlobals();

test("keeps fungible rewards separate and gives each asset its own claim", () => {
  const actions: string[] = [];
  const view = render(
    <RewardWalletAssets
      holdings={[
        {
          actionLabel: "Claim USDC",
          amountLabel: "12.40 USDC",
          assetLabel: "USDC on Base",
          id: "usdc",
          kind: "fungible",
          onAction: () => actions.push("usdc"),
        },
        {
          actionLabel: "Claim $COMMUNITY",
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
  fireEvent.click(view.getByRole("button", { name: "Claim USDC" }));
  fireEvent.click(view.getByRole("button", { name: "Claim $COMMUNITY" }));
  expect(actions).toEqual(["usdc", "community"]);
});

test("winning ticket exposes claimWinnings action independently", () => {
  let calls = 0;
  const view = render(
    <RewardWalletAssets
      holdings={[
        {
          drawingLabel: "Drawing 140",
          id: "ticket-1099",
          kind: "megapot_ticket",
          onAction: () => { calls += 1; },
          state: "winner",
          ticketLabel: "Megapot ticket #1099",
          winningsLabel: "5.00 USDC",
        },
      ]}
    />,
  );

  expect(view.getByText("Drawing 140 · Won 5.00 USDC")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Claim winnings" }));
  expect(calls).toBe(1);
});

test("long 18-decimal community-token amount remains complete", () => {
  const amount = "25.123456789012345678 $INTERNATIONALCOMMUNITYTOKEN";
  const view = render(
    <RewardWalletAssets
      holdings={[{
        actionLabel: "Claim",
        amountLabel: amount,
        assetLabel: "Community reward token",
        id: "community",
        kind: "fungible",
      }]}
    />,
  );

  expect(view.getByText(amount)).toBeTruthy();
});

test("winner without a known amount does not render a malformed currency claim", () => {
  const view = render(
    <RewardWalletAssets
      holdings={[{
        drawingLabel: "Drawing 140",
        id: "ticket-1099",
        kind: "megapot_ticket",
        state: "winner",
        ticketLabel: "Megapot ticket #1099",
      }]}
    />,
  );

  expect(view.getByText("Drawing 140 · Winning amount pending")).toBeTruthy();
  expect(view.queryByText("Won USDC")).toBeNull();
});

test("closed losing ticket is terminal and has no action", () => {
  const view = render(
    <RewardWalletAssets
      holdings={[{
        drawingLabel: "Drawing 139",
        id: "ticket-1001",
        kind: "megapot_ticket",
        state: "no_win",
        ticketLabel: "Megapot ticket #1001",
      }]}
    />,
  );

  expect(view.getByText("Drawing 139 · Drawing closed · No winnings")).toBeTruthy();
  expect(view.queryByRole("button")).toBeNull();
});

test("wallet rows expose their labels as named groups", () => {
  const view = render(
    <RewardWalletAssets
      holdings={[{
        actionLabel: "Claim",
        amountLabel: "12.40 USDC",
        assetLabel: "USDC on Base",
        id: "usdc",
        kind: "fungible",
      }]}
    />,
  );

  expect(view.getByRole("group", { name: "USDC on Base bounty balance" })).toBeTruthy();
});
