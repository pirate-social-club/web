import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { AvailabilityCalendar } from "./availability-calendar";
import type { ResolvedSlot } from "../view-models";

const TZ = "Europe/Vienna" as never;

function slot(startUtc: string, endUtc: string, priceCents = 5000, available = true): ResolvedSlot {
  return { startUtc, endUtc, priceCents, available } as ResolvedSlot;
}

/** Two days, uniform 30-min $50 slots. */
const UNIFORM: ResolvedSlot[] = [
  slot("2026-09-21T09:00:00.000Z", "2026-09-21T09:30:00.000Z"),
  slot("2026-09-21T10:00:00.000Z", "2026-09-21T10:30:00.000Z"),
  slot("2026-09-22T14:00:00.000Z", "2026-09-22T14:30:00.000Z"),
];

/** Same day, genuinely different prices/durations → per-chip captions. */
const MIXED: ResolvedSlot[] = [
  slot("2026-09-21T09:00:00.000Z", "2026-09-21T09:30:00.000Z", 3500),
  slot("2026-09-21T10:00:00.000Z", "2026-09-21T11:00:00.000Z", 7500),
];

/** Day 1 has only a taken slot; day 2 is bookable. */
const FIRST_DAY_TAKEN: ResolvedSlot[] = [
  slot("2026-09-21T09:00:00.000Z", "2026-09-21T09:30:00.000Z", 5000, false),
  slot("2026-09-22T09:00:00.000Z", "2026-09-22T09:30:00.000Z"),
];

/** DST fall-back 2026-10-25 in Vienna: "02:00 AM" happens twice (00:00Z CEST, 01:00Z CET). */
const DST_FALL_BACK: ResolvedSlot[] = [
  slot("2026-10-25T00:00:00.000Z", "2026-10-25T00:30:00.000Z"),
  slot("2026-10-25T01:00:00.000Z", "2026-10-25T01:30:00.000Z"),
];

const TIME_CHIP_NAME = /\d{2}:\d{2}/u;

afterEach(() => {
  cleanup();
});

describe("AvailabilityCalendar", () => {
  test("uniform slots render time-only chips — price/duration are not repeated per slot", () => {
    const view = render(
      <AvailabilityCalendar slots={UNIFORM} viewerTimezone={TZ} onSelectSlot={() => {}} />,
    );

    const chips = view.getAllByRole("button", { name: TIME_CHIP_NAME });
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.textContent).not.toContain("$");
      expect(chip.textContent).not.toContain("min");
    }
    // The calendar states no price at all — the shared facts line lives in the panel.
    expect(view.queryByText("$50")).toBeNull();
  });

  test("mixed slots keep per-chip duration and price captions", () => {
    const view = render(
      <AvailabilityCalendar slots={MIXED} viewerTimezone={TZ} onSelectSlot={() => {}} />,
    );

    expect(view.getByText("$35")).toBeTruthy();
    expect(view.getByText("$75")).toBeTruthy();
    expect(view.getByText("30 min")).toBeTruthy();
    expect(view.getByText("1 hr")).toBeTruthy();
  });

  test("default-selects the first day with an available slot", () => {
    const view = render(
      <AvailabilityCalendar slots={FIRST_DAY_TAKEN} viewerTimezone={TZ} onSelectSlot={() => {}} />,
    );

    expect(view.getByRole("button", { name: /21/u }).getAttribute("aria-pressed")).toBe("false");
    expect(view.getByRole("button", { name: /22/u }).getAttribute("aria-pressed")).toBe("true");
    // Day 2's single bookable chip is shown; the taken day-1 chip is not.
    expect(view.getAllByRole("button", { name: TIME_CHIP_NAME })).toHaveLength(1);
  });

  test("switching to a day without open times shows a small inline note, not the panel empty card", () => {
    const view = render(
      <AvailabilityCalendar slots={FIRST_DAY_TAKEN} viewerTimezone={TZ} onSelectSlot={() => {}} />,
    );

    fireEvent.click(view.getByRole("button", { name: /21/u }));

    expect(view.getByText("No open times this day.")).toBeTruthy();
    expect(view.queryAllByRole("button", { name: TIME_CHIP_NAME })).toHaveLength(0);
    expect(view.queryByText("No open slots in this window.")).toBeNull();
  });

  test("a chip tap selects; the confirm footer's Continue carries the href and reports the slot", () => {
    const chosen: Array<{ slot: ResolvedSlot; event: unknown }> = [];
    const view = render(
      <AvailabilityCalendar
        slots={UNIFORM}
        viewerTimezone={TZ}
        getSlotHref={(s) => `/checkout?start=${encodeURIComponent(s.startUtc)}`}
        onSelectSlot={(s, event) => chosen.push({ slot: s, event })}
      />,
    );

    // No footer before a selection — SSR/initial paint carries no checkout href.
    expect(view.queryByRole("link", { name: "Continue" })).toBeNull();

    const [firstChip] = view.getAllByRole("button", { name: TIME_CHIP_NAME });
    fireEvent.click(firstChip);

    expect(view.getByText(/\w{3}, \w{3} \d+ · \d{2}:\d{2}/u)).toBeTruthy();
    expect(view.getByText("30 min · $50")).toBeTruthy();

    const confirm = view.getByRole("link", { name: "Continue" });
    expect(confirm.getAttribute("href")).toBe("/checkout?start=2026-09-21T09%3A00%3A00.000Z");
    fireEvent.click(confirm);

    expect(chosen).toHaveLength(1);
    expect(chosen[0].slot).toEqual(UNIFORM[0]);
    // The event pass-through survives so containers can preventDefault (sign-in gate).
    expect(chosen[0].event).toBeTruthy();
  });

  test("without a selection handler chips are inert and no footer renders (owner preview)", () => {
    const view = render(<AvailabilityCalendar slots={UNIFORM} viewerTimezone={TZ} />);

    expect(view.queryAllByRole("button", { name: TIME_CHIP_NAME })).toHaveLength(0);
    // Day pills still switch days.
    expect(view.getAllByRole("button", { name: /2[12]/u }).length).toBe(2);
    expect(view.queryByText("Continue")).toBeNull();
  });

  test("DST fall-back repeated hour keeps distinct timezone abbreviations", () => {
    const view = render(
      <AvailabilityCalendar slots={DST_FALL_BACK} viewerTimezone={TZ} onSelectSlot={() => {}} />,
    );

    const repeated = view
      .getAllByRole("button", { name: TIME_CHIP_NAME })
      .map((chip) => chip.textContent ?? "")
      .filter((label) => label.startsWith("02:00 AM"));
    expect(repeated).toHaveLength(2);
    expect(repeated[0]).not.toBe(repeated[1]);
  });
});
