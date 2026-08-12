import * as React from "react";
import { expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { RewardTicketFulfillment } from "./reward-ticket-fulfillment";

installDomGlobals();

test("stale price does not imply that funding was reserved", () => {
  const view = render(<RewardTicketFulfillment state="price_stale" />);
  expect(view.getByText("The current ticket price is unavailable. No reward was reserved.")).toBeTruthy();
});

test("price ceiling breach is distinct from budget exhaustion", () => {
  const view = render(<RewardTicketFulfillment priceCeilingLabel="$1.10 USDC" state="price_blocked" />);
  expect(view.getByText("Bounty cannot cover a ticket")).toBeTruthy();
  expect(view.getByText("Funding limit · $1.10 USDC")).toBeTruthy();
  expect(view.queryByText(/out of funds/i)).toBeNull();
});

test("confirmed purchase exposes the delivered ticket and released reserve", () => {
  let calls = 0;
  const view = render(
    <RewardTicketFulfillment
      fundingAdjustmentLabel="$0.10 USDC returned to this bounty's available funding."
      onAction={() => { calls += 1; }}
      state="confirmed"
      ticketLabel="Megapot ticket #1042"
    />,
  );
  expect(view.getByText("Megapot ticket #1042")).toBeTruthy();
  expect(view.getByText(/returned to this bounty/)).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "View ticket" }));
  expect(calls).toBe(1);
});

test("terminal failure releases funding while review keeps it reserved", () => {
  const failedView = render(<RewardTicketFulfillment state="failed" />);
  expect(failedView.getByText("No ticket was delivered. Reserved funding was released back to the bounty.")).toBeTruthy();
  failedView.unmount();

  const reviewView = render(<RewardTicketFulfillment state="needs_review" />);
  expect(reviewView.getByText("Funding remains reserved while the transaction is checked.")).toBeTruthy();
});

test("expired reservation is retryable and reports released funding", () => {
  const view = render(<RewardTicketFulfillment onAction={() => undefined} state="reservation_expired" />);
  expect(view.getByText("Ticket reservation expired")).toBeTruthy();
  expect(view.getByText(/Funding was released back to the bounty/)).toBeTruthy();
  expect(view.getByRole("button", { name: "Try again" })).toBeTruthy();
});
