import * as React from "react";
import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();
afterEach(cleanup);

mock.module("@/components/compositions/system/modal/modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  ModalContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { SongBountiesSheet } = await import("./song-bounties-sheet");
const capabilities = { canCreate: true, canFund: true };

test("renders ticket pool independently from stable Study and Karaoke slots", () => {
  const view = render(<SongBountiesSheet capabilities={capabilities} open showTicketPool slots={[]} />);

  expect(view.getByLabelText("Daily Megapot ticket pool")).toBeTruthy();
  expect(view.getByLabelText("Study bounty slot")).toBeTruthy();
  expect(view.getByLabelText("Karaoke bounty slot")).toBeTruthy();
  expect(view.getAllByText("No bounty yet.")).toHaveLength(2);
  expect(view.getByRole("button", { name: "Create ticket pool" })).toBeTruthy();
  expect(view.getAllByRole("button", { name: "Create" })).toHaveLength(2);
});

test("keeps the parked ticket pool hidden unless explicitly enabled", () => {
  const view = render(<SongBountiesSheet capabilities={capabilities} open slots={[]} />);

  expect(view.queryByLabelText("Daily Megapot ticket pool")).toBeNull();
  expect(view.getAllByRole("button", { name: "Create" })).toHaveLength(2);
});

test("cash-slot top-up remains independent from ticket-pool funding", () => {
  const slotActions: string[] = [];
  const poolActions: string[] = [];
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      onSlotAction={(objective, action) => slotActions.push(`${objective}:${action}`)}
      onTicketPoolAction={(action) => poolActions.push(action)}
      open
      showTicketPool
      slots={[{ canCreate: false, canFund: true, objective: "study", rewardLabel: "$0.40 USDC", status: "exhausted" }]}
      ticketPool={{
        beneficiaryCountLabel: "4 singers included",
        drawingLabel: "Drawing 7,710 · Base Sepolia",
        status: "entry_open",
        ticketCountLabel: "3 pool tickets",
      }}
    />,
  );

  expect(view.getByText("Out of funds. Add funding to reopen this slot.")).toBeTruthy();
  fireEvent.click(view.getByLabelText("Study bounty slot").querySelector("button")!);
  fireEvent.click(view.getByRole("button", { name: "Fund pool" }));
  expect(slotActions).toEqual(["study:fund"]);
  expect(poolActions).toEqual(["fund"]);
});

test("ticket pool explains shared winnings without claiming user ticket ownership", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      open
      showTicketPool
      slots={[
        { canCreate: false, canFund: true, objective: "study", rewardLabel: "25 $COMMUNITY", status: "active" },
        { canCreate: false, canFund: true, objective: "karaoke", rewardLabel: "$0.40 USDC", status: "active" },
      ]}
      ticketPool={{
        beneficiaryCountLabel: "1 singer included",
        cutoffLabel: "Entries close in 24 minutes",
        drawingLabel: "Drawing 7,710 · Base Sepolia",
        status: "entry_open",
        ticketCountLabel: "1 pool ticket",
        viewerEntered: true,
      }}
    />,
  );

  expect(view.getByText(/every verified singer today shares any USDC winnings/i)).toBeTruthy();
  expect(view.getByText("You're included once in today's beneficiary set.")).toBeTruthy();
  expect(view.queryByText(/your ticket/i)).toBeNull();
  expect(view.queryByRole("button", { name: /claim winnings/i })).toBeNull();
});

test("shows occupied cash states without offering cash-slot funding", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      open
      slots={[
        { canCreate: false, canFund: false, objective: "study", rewardLabel: "25 $COMMUNITY", status: "funding_confirming" },
        { canCreate: false, canFund: false, objective: "karaoke", rewardLabel: "$0.40 USDC", status: "operational_hold" },
      ]}
    />,
  );

  expect(view.getByRole("button", { name: "Confirming" }).hasAttribute("disabled")).toBe(true);
  expect(view.getByRole("button", { name: "On hold" }).hasAttribute("disabled")).toBe(true);
});

test("explains a paused bounty without collapsing it into an operational hold", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      open
      slots={[{ canCreate: false, canFund: false, objective: "study", rewardLabel: "$0.40 USDC", status: "paused" }]}
    />,
  );

  expect(view.getByText("Paused. Funding is unavailable until this bounty resumes.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Paused" }).hasAttribute("disabled")).toBe(true);
});

test("shows why an unavailable empty objective cannot be created", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={{ canCreate: true, canFund: false }}
      open
      slots={[{
        actionDisabledReason: "A Study bounty already occupies this song. A separate Karaoke bounty is not available yet.",
        canCreate: false,
        canFund: false,
        objective: "karaoke",
        status: "empty",
      }]}
    />,
  );

  expect(view.getByText("A Study bounty already occupies this song. A separate Karaoke bounty is not available yet.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Unavailable" }).hasAttribute("disabled")).toBe(true);
});

test("legacy Either bounty occupies both cash slots while the ticket pool remains visible", () => {
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      legacyEither={{ rewardLabel: "$1.00 USDC", status: "active" }}
      open
      showTicketPool
      slots={[]}
      ticketPool={{
        drawingLabel: "Drawing 7,710",
        status: "drawing_pending",
        ticketCountLabel: "2 pool tickets",
      }}
    />,
  );

  expect(view.getByLabelText("Daily Megapot ticket pool")).toBeTruthy();
  expect(view.getByLabelText("Study or Karaoke legacy bounty")).toBeTruthy();
  expect(view.getAllByText("Occupied")).toHaveLength(2);
  expect(view.getByRole("button", { name: "Fund" })).toBeTruthy();
});

test("resolved third-party capabilities disable all creation without blocking the owner view", () => {
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

  const ownerView = render(<SongBountiesSheet capabilities={capabilities} open showTicketPool slots={[]} />);
  expect(ownerView.getByRole("button", { name: "Create ticket pool" })).toBeTruthy();
  expect(ownerView.getAllByRole("button", { name: "Create" })).toHaveLength(2);
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

test("exhausted ticket pool keeps cash bounties active and offers only pool funding", () => {
  const actions: string[] = [];
  const view = render(
    <SongBountiesSheet
      capabilities={capabilities}
      onTicketPoolAction={(action) => actions.push(action)}
      open
      showTicketPool
      slots={[{ canCreate: false, canFund: true, objective: "study", rewardLabel: "$0.40 USDC", status: "active" }]}
      ticketPool={{
        drawingLabel: "Next eligible drawing",
        status: "exhausted",
        ticketCountLabel: "0 funded tickets remaining",
      }}
    />,
  );

  expect(view.getByText("No funded tickets remain. Add funding for a future drawing.")).toBeTruthy();
  expect(view.getByText("Open for claims.")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Fund pool" }));
  expect(actions).toEqual(["fund"]);
});
