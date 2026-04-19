import { describe, expect, test } from "bun:test";

import { resolveCommunityLocalizedText } from "./community-localization";

describe("resolveCommunityLocalizedText", () => {
  test("returns translated text when the localized field is ready", () => {
    expect(resolveCommunityLocalizedText({
      localized_text: {
        resolved_locale: "es",
        items: [
          {
            field_key: "community.description",
            translated_value: "Descripcion traducida",
            translation_state: "ready",
          },
        ],
      },
    }, "community.description", "Canonical")).toBe("Descripcion traducida");
  });

  test("falls back to canonical text when translation is pending", () => {
    expect(resolveCommunityLocalizedText({
      localized_text: {
        resolved_locale: "es",
        items: [
          {
            field_key: "community.description",
            translated_value: null,
            translation_state: "pending",
          },
        ],
      },
    }, "community.description", "Canonical")).toBe("Canonical");
  });

  test("falls back to canonical text when translation is same_language", () => {
    expect(resolveCommunityLocalizedText({
      localized_text: {
        resolved_locale: "en",
        items: [
          {
            field_key: "community.description",
            translated_value: null,
            translation_state: "same_language",
          },
        ],
      },
    }, "community.description", "Canonical")).toBe("Canonical");
  });

  test("falls back to canonical text when translation is policy_blocked", () => {
    expect(resolveCommunityLocalizedText({
      localized_text: {
        resolved_locale: "es",
        items: [
          {
            field_key: "community.description",
            translated_value: null,
            translation_state: "policy_blocked",
          },
        ],
      },
    }, "community.description", "Canonical")).toBe("Canonical");
  });

  test("falls back to canonical text when localized_text is missing", () => {
    expect(resolveCommunityLocalizedText({}, "community.description", "Canonical")).toBe("Canonical");
  });

  test("returns empty string when canonical text is undefined", () => {
    expect(resolveCommunityLocalizedText(null, "community.description", undefined)).toBe("");
  });

  test("falls back to canonical text when translated value is empty", () => {
    expect(resolveCommunityLocalizedText({
      localized_text: {
        resolved_locale: "es",
        items: [
          {
            field_key: "community.description",
            translated_value: "   ",
            translation_state: "ready",
          },
        ],
      },
    }, "community.description", "Canonical")).toBe("Canonical");
  });
});
