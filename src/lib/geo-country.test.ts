import { describe, expect, test } from "bun:test";

import {
  normalizeCommunityCountryCode,
  normalizeGeoCountryFilter,
} from "./geo-country";

describe("geo country helpers", () => {
  test("normalizes valid two-letter values for API filters", () => {
    expect(normalizeGeoCountryFilter(" GE ")).toBe("ge");
    expect(normalizeGeoCountryFilter("us")).toBe("us");
  });

  test("rejects missing and malformed values", () => {
    expect(normalizeGeoCountryFilter(null)).toBeUndefined();
    expect(normalizeGeoCountryFilter("")).toBeUndefined();
    expect(normalizeGeoCountryFilter("g")).toBeUndefined();
    expect(normalizeGeoCountryFilter("geo")).toBeUndefined();
    expect(normalizeGeoCountryFilter("g3")).toBeUndefined();
  });

  test("returns a form input safe value", () => {
    expect(normalizeCommunityCountryCode(" GE ")).toBe("ge");
    expect(normalizeCommunityCountryCode("Georgia")).toBe("");
  });
});
