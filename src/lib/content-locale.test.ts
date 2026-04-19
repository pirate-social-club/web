import { describe, expect, test } from "bun:test";

import { resolveViewerContentLocale } from "./content-locale";

describe("resolveViewerContentLocale", () => {
  test("prefers Arabic when the UI locale is Arabic", () => {
    expect(resolveViewerContentLocale({
      uiLocale: "ar",
      browserLocales: ["en-US", "en"],
    })).toBe("ar");
  });

  test("still uses browser locale aliases for non-Arabic UI locales", () => {
    expect(resolveViewerContentLocale({
      uiLocale: "en",
      browserLocales: ["pt"],
    })).toBe("pt-BR");
  });
});
