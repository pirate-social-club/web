import * as React from "react";
import { expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { SongBountiesSheet } = await import("./song-bounties-sheet");
const capabilities = { canCreate: true, canFund: true };

test("renders stable Study and Karaoke slots when no bounties exist", () => {
  const view = render(<SongBountiesSheet capabilities={capabilities} open slots={[]} />);

  expect(view.getByLabelText("Study bounty slot")).toBeTruthy();
  expect(view.getByLabelText("Karaoke bounty slot")).toBeTruthy();
  expect(view.getAllByText("No bounty yet.")).toHaveLength(2);
  expect(view.getAllByRole("button", { name: "Create" })).toHaveLength(2);
});

test("treats exhausted funding as the only recovery action", () => {
  const actions: string[] = [];
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      onSlotAction={(objective, action) => actions.push(`${objective}:${action}`)}
      open
      slots={[{ objective: "study", rewardLabel: "$0.40 USDC", status: "exhausted" }]}
    />,
  );

  expect(view.getByText("Out of funds. Add funding to reopen this slot.")).toBeTruthy();
  fireEvent.click(view.getByLabelText("Study bounty slot").querySelector("button")!);
  expect(actions).toEqual(["study:fund"]);
});

test("shows occupied non-payable states without offering funding", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      open
      slots={[
        { objective: "study", rewardLabel: "25 $COMMUNITY", status: "funding_confirming" },
        { objective: "karaoke", rewardLabel: "1 Megapot ticket", status: "operational_hold" },
      ]}
    />,
  );

  expect(view.getByRole("button", { name: "Confirming" }).hasAttribute("disabled")).toBe(true);
  expect(view.getByRole("button", { name: "On hold" }).hasAttribute("disabled")).toBe(true);
  expect(view.queryByRole("button", { name: "Fund" })).toBeNull();
});

test("legacy Either bounty occupies both objective slots", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      legacyEither={{ rewardLabel: "$1.00 USDC", status: "active" }}
      open
      slots={[]}
    />,
  );

  expect(view.getByLabelText("Study or Karaoke legacy bounty")).toBeTruthy();
  expect(view.getAllByText("Occupied")).toHaveLength(2);
  expect(view.queryByRole("button", { name: "Create" })).toBeNull();
  expect(view.getByRole("button", { name: "Fund" })).toBeTruthy();
});

test("resolved third-party capabilities disable actions without blocking the owner view", () => {
  const thirdPartyView = render(
    <SongBountiesSheet
      capabilities={{
        canCreate: false,
        canFund: false,
        reason: "The song owner is not accepting third-party funding.",
      }}
      open
      slots={[]}
    />,
  );

  expect(thirdPartyView.getByText("The song owner is not accepting third-party funding.")).toBeTruthy();
  expect(thirdPartyView.getAllByRole("button", { name: "Unavailable" })).toHaveLength(2);
  thirdPartyView.unmount();

  const ownerView = render(<SongBountiesSheet capabilities={capabilities} open slots={[]} />);
  expect(ownerView.getAllByRole("button", { name: "Create" })).toHaveLength(2);
  expect(ownerView.queryByText("The song owner is not accepting third-party funding.")).toBeNull();
});

test("legacy Either bounty can be revived through the same funding action", () => {
  const actions: string[] = [];
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      legacyEither={{ rewardLabel: "$1.00 USDC", status: "exhausted" }}
      onSlotAction={(objective, action) => actions.push(`${objective}:${action}`)}
      open
      slots={[]}
    />,
  );

  expect(view.getByText("Out of funds. Add funding to reopen these slots.")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Fund" }));
  expect(actions).toEqual(["either:fund"]);
});

test("claim pause reasons remain independent from lifecycle", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      open
      slots={[
        {
          claimsPausedReason: "price_stale",
          objective: "karaoke",
          rewardLabel: "1 Megapot ticket",
          status: "exhausted",
        },
      ]}
    />,
  );

  expect(view.getByText("Out of funds. Add funding to reopen this slot.")).toBeTruthy();
  expect(view.getByText("Ticket price unavailable. New claims are paused.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Fund" })).toBeTruthy();
});
