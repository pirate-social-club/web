import { describe, expect, test } from "bun:test";

import { parseSlotsResponse } from "./bookings-types";

const VALID_RESPONSE = {
  host_timezone: "Europe/Vienna",
  viewer_timezone: "Asia/Tbilisi",
  slots: [{
    startUtc: "2099-01-05T10:00:00.000Z",
    endUtc: "2099-01-05T10:30:00.000Z",
    priceCents: 5000,
    available: true,
  }],
};

describe("parseSlotsResponse", () => {
  test("accepts the canonical availability payload", () => {
    expect(parseSlotsResponse(VALID_RESPONSE)).toEqual(VALID_RESPONSE);
  });

  test("rejects malformed slots before they reach booking UI", () => {
    expect(() => parseSlotsResponse({
      ...VALID_RESPONSE,
      slots: [{ ...VALID_RESPONSE.slots[0], priceCents: "5000" }],
    })).toThrow("Invalid booking slots response");
    expect(() => parseSlotsResponse({
      ...VALID_RESPONSE,
      slots: [{ ...VALID_RESPONSE.slots[0], endUtc: VALID_RESPONSE.slots[0].startUtc }],
    })).toThrow("Invalid booking slots response");
    expect(() => parseSlotsResponse({ ...VALID_RESPONSE, slots: null })).toThrow("Invalid booking slots response");
  });
});
