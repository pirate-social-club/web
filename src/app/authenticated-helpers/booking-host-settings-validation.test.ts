import { describe, expect, test } from "bun:test";

import {
  centsToUsd,
  defaultExceptionEnd,
  defaultExceptionStart,
  epochSecondsToLocalInput,
  isDateTimeRange,
  isTimeRange,
  isValidMoneyInput,
  isValidPositiveMoneyInput,
  localInputToIsoUtc,
  usdToCents,
} from "@/app/authenticated-helpers/booking-host-settings-validation";

describe("booking host settings validation", () => {
  test("converts money inputs using integer cents", () => {
    expect(centsToUsd(1234)).toBe("12.34");
    expect(usdToCents("12.345")).toBe(1235);
    expect(isValidMoneyInput("0")).toBe(true);
    expect(isValidMoneyInput("-1")).toBe(false);
    expect(isValidMoneyInput("not-money")).toBe(false);
    expect(isValidPositiveMoneyInput("0")).toBe(false);
    expect(isValidPositiveMoneyInput("0.01")).toBe(true);
  });

  test("validates local HH:MM ranges without allowing equal or reversed ranges", () => {
    expect(isTimeRange("09:00", "17:00")).toBe(true);
    expect(isTimeRange("09:00", "09:00")).toBe(false);
    expect(isTimeRange("17:00", "09:00")).toBe(false);
    expect(isTimeRange("9:00", "17:00")).toBe(false);
  });

  test("formats and parses datetime-local values", () => {
    expect(epochSecondsToLocalInput(Date.UTC(2026, 0, 2, 3, 4) / 1000)).toMatch(/2026-01-0?2T/);
    expect(localInputToIsoUtc("2026-01-02T03:04")).toContain("2026-01-02T");
    expect(localInputToIsoUtc("not-a-date")).toBeNull();
  });

  test("interprets exceptions in the configured host timezone, not the device timezone", () => {
    expect(localInputToIsoUtc("2026-01-02T03:04", "America/New_York")).toBe("2026-01-02T08:04:00.000Z");
    expect(localInputToIsoUtc("2026-01-02T03:04", "Asia/Tbilisi")).toBe("2026-01-01T23:04:00.000Z");
  });

  test("rejects nonexistent local wall times during a DST jump", () => {
    expect(localInputToIsoUtc("2026-03-08T02:30", "America/New_York")).toBeNull();
  });

  test("builds default one-hour exception windows", () => {
    const start = defaultExceptionStart(Date.UTC(2026, 0, 1, 12, 34));
    const end = defaultExceptionEnd(start);
    expect(isDateTimeRange(start, end)).toBe(true);
    expect(Date.parse(end) - Date.parse(start)).toBe(60 * 60 * 1000);
  });

  test("validates datetime-local ranges", () => {
    expect(isDateTimeRange("2026-01-02T03:04", "2026-01-02T04:04")).toBe(true);
    expect(isDateTimeRange("2026-01-02T03:04", "2026-01-02T03:04")).toBe(false);
    expect(isDateTimeRange("bad", "2026-01-02T04:04")).toBe(false);
  });
});
