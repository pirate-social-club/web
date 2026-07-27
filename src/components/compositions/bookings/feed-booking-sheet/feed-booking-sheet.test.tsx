import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { FeedBookingSheetBody, formatFeedBookingTitle } from "./feed-booking-sheet";
import type { ResolvedSlot } from "@/components/compositions/bookings/view-models";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ addEventListener() {}, matches: false, removeEventListener() {} }),
  });
}

const slots = [
  { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
  { startUtc: "2026-09-21T11:00:00.000Z", endUtc: "2026-09-21T11:30:00.000Z", priceCents: 3500, available: false },
] as ResolvedSlot[];

const base = {
  startingPriceCents: 3500,
  onSelectSlot: () => {},
  slots,
  viewerTimezone: "Europe/Vienna" as never,
};

afterEach(() => {
  cleanup();
});

describe("FeedBookingSheet", () => {
  test("names the publisher being booked", () => {
    expect(formatFeedBookingTitle("Book {handle}", "mara.english")).toBe("Book mara.english");
  });

  test("leaves the template alone when it carries no handle placeholder", () => {
    expect(formatFeedBookingTitle("Book a class", "mara.english")).toBe("Book a class");
  });

  test("reports the chosen slot to the container once confirmed", () => {
    const chosen: ResolvedSlot[] = [];
    const view = render(<FeedBookingSheetBody {...base} onSelectSlot={(slot) => chosen.push(slot)} />);

    const available = view
      .getAllByRole("button", { name: /\d{2}:\d{2}/u })
      .find((node) => !(node as HTMLButtonElement).disabled);
    fireEvent.click(available!);
    // The tap only selects; onSelectSlot fires from the confirm footer's Continue.
    expect(chosen).toEqual([]);
    fireEvent.click(view.getByRole("button", { name: "Continue" }));

    expect(chosen).toEqual([slots[0]]);
  });

  test("does not offer slots the host has not opened", () => {
    const view = render(<FeedBookingSheetBody {...base} />);

    const disabled = view
      .getAllByRole("button", { name: /\d{2}:\d{2}/u })
      .filter((node) => (node as HTMLButtonElement).disabled);

    expect(disabled.length).toBe(1);
  });

  test("shows a loading hint instead of the empty state while availability resolves", () => {
    const view = render(<FeedBookingSheetBody {...base} loading slots={[]} />);

    expect(view.getByText("Loading availability…")).toBeTruthy();
  });

  test("states when the host has no open times", () => {
    const view = render(<FeedBookingSheetBody {...base} slots={[]} />);

    expect(view.getByText("No available times right now — check back soon.")).toBeTruthy();
  });

  test("distinguishes a load failure from empty availability and retries", () => {
    let retries = 0;
    const view = render(
      <FeedBookingSheetBody
        {...base}
        error
        onRetry={() => { retries += 1; }}
        slots={[]}
      />,
    );

    expect(view.getByRole("alert").textContent).toContain("We couldn't load available times.");
    expect(view.queryByText("No available times right now — check back soon.")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(retries).toBe(1);
  });

  test("states uniform duration/price/timezone once in the header, never per slot", () => {
    const view = render(<FeedBookingSheetBody {...base} />);

    expect(view.getByText("30 min · $35 · Times in Vienna")).toBeTruthy();
    // …and never as a standalone per-slot price element.
    expect(view.queryAllByText(/^\$35$/u)).toHaveLength(0);
    expect(view.queryByText("35.00 USDC")).toBeNull();
    expect(view.queryByText(/35(?:\.00)? USDC per session/u)).toBeNull();
  });

  test("mixed prices fall back to a starting price in the header and per-slot captions", () => {
    const mixed = [
      { startUtc: "2026-09-21T09:00:00.000Z", endUtc: "2026-09-21T09:30:00.000Z", priceCents: 3500, available: true },
      { startUtc: "2026-09-21T10:00:00.000Z", endUtc: "2026-09-21T10:30:00.000Z", priceCents: 5000, available: true },
    ] as ResolvedSlot[];
    const view = render(<FeedBookingSheetBody {...base} slots={mixed} startingPriceCents={3500} />);

    expect(view.getByText("30 min · $35+ · Times in Vienna")).toBeTruthy();
    expect(view.getByText("$35")).toBeTruthy();
    expect(view.getByText("$50")).toBeTruthy();
  });
});
