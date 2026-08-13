import * as React from "react";
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { installDomGlobals } from "@/test/setup-dom";
import { RewardTicketPoolLifecycle } from "./reward-ticket-fulfillment";

installDomGlobals();
afterEach(cleanup);

test("entry copy promises a share rather than ownership of a ticket", () => {
  const view = render(
    <RewardTicketPoolLifecycle
      beneficiaryCountLabel="4 singers entered"
      drawingLabel="Drawing 7,710"
      phase="entry_open"
      ticketCountLabel="3 pool tickets"
    />,
  );
  expect(view.getByText(/share any winnings/i)).toBeTruthy();
  expect(view.queryByText(/belongs to your connected wallet/i)).toBeNull();
});

test("price admission failures never imply a reservation or purchase", () => {
  const view = render(
    <RewardTicketPoolLifecycle
      drawingLabel="Drawing 7,710"
      issue="price_ceiling"
      phase="cutoff_frozen"
      priceCeilingLabel="$0.02 USDC"
    />,
  );
  expect(view.getByText(/No purchase was submitted/)).toBeTruthy();
  expect(view.getByText("Funding limit · $0.02 USDC")).toBeTruthy();
});

test("credited state exposes exact atomic share and balance action", () => {
  let calls = 0;
  const view = render(
    <RewardTicketPoolLifecycle
      amountLabel="0.003333 USDC credited"
      beneficiaryCountLabel="3 singers"
      drawingLabel="Drawing 7,709"
      onAction={() => { calls += 1; }}
      phase="credited"
      shareLabel="Equal allocation · 3,333 atomic USDC"
    />,
  );
  expect(view.getByText("0.003333 USDC credited")).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "View balance" }));
  expect(calls).toBe(1);
  expect(view.queryByRole("button", { name: /claim winnings/i })).toBeNull();
});

test("snapshot failure prevents spend for the drawing", () => {
  const view = render(
    <RewardTicketPoolLifecycle drawingLabel="Drawing 7,710" issue="snapshot_commit_failed" phase="cutoff_frozen" />,
  );
  expect(view.getByText(/will not spend pool funding/i)).toBeTruthy();
});

test("no-win state has no default action", () => {
  const view = render(
    <RewardTicketPoolLifecycle drawingLabel="Drawing 7,709" onAction={() => undefined} phase="no_win" />,
  );
  expect(view.getByText("No pool winnings")).toBeTruthy();
  expect(view.queryByRole("button")).toBeNull();
});

test("zero beneficiaries closes without implying a reservation or purchase", () => {
  const view = render(
    <RewardTicketPoolLifecycle
      beneficiaryCountLabel="0 verified singers"
      drawingLabel="Drawing 7,710"
      phase="closed_no_entries"
    />,
  );
  expect(view.getByText(/spent no funding/i)).toBeTruthy();
  expect(view.queryByText(/reserved/i)).toBeNull();
  expect(view.queryByText(/purchase submitted/i)).toBeNull();
});

test("delayed drawing preserves tickets and committed beneficiaries", () => {
  const view = render(
    <RewardTicketPoolLifecycle
      beneficiaryCountLabel="12 singers committed"
      drawingLabel="Drawing 7,710"
      issue="drawing_delayed"
      phase="drawing_pending"
      ticketCountLabel="3 pool tickets"
    />,
  );
  expect(view.getByText(/remain unchanged/i)).toBeTruthy();
});
