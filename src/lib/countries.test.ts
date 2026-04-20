import { describe, expect, test } from "bun:test";

import { findCountry, getCountryDisplayName, getCountryName, isCountryCode } from "./countries";

describe("countries", () => {
  test("looks up a country by alpha-2 code", () => {
    expect(findCountry("us")).toEqual({ code: "US", name: "United States" });
    expect(getCountryName("DE")).toBe("Germany");
  });

  test("localizes special-case country names for supported locales", () => {
    expect(getCountryDisplayName("PS", "ar")).toBe("فلسطين");
    expect(getCountryDisplayName("PS", "zh")).toBe("巴勒斯坦");
    expect(getCountryDisplayName("PS", "en")).toBe("Palestine");
  });

  test("rejects unknown country codes", () => {
    expect(findCountry("ZZ")).toBeNull();
    expect(isCountryCode("ZZ")).toBe(false);
  });
});
