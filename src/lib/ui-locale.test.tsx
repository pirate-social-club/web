import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import * as React from "react";

import { UiLocaleProvider, useUiLocale } from "./ui-locale";

const { document } = installDomGlobals();

const originalLocalStorage = globalThis.localStorage;

function installMockLocalStorage(seed: Record<string, string> = {}) {
  const storage = new Map(Object.entries(seed));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key) ?? null : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
    },
  });
  return storage;
}

function restoreLocalStorage(value: Storage | undefined = originalLocalStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value,
  });
}

describe("UiLocaleProvider", () => {
  test("keeps explicit locale changes instead of restoring stale storage", async () => {
    const storage = installMockLocalStorage({ pirate_ui_locale: "en" });

    try {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UiLocaleProvider dir="ltr" locale="en">
          {children}
        </UiLocaleProvider>
      );
      const { result } = renderHook(() => useUiLocale(), { wrapper });

      expect(result.current.locale).toBe("en");

      act(() => {
        result.current.setLocale("ar");
      });

      await waitFor(() => {
        expect(result.current.locale).toBe("ar");
        expect(storage.get("pirate_ui_locale")).toBe("ar");
        expect(document.documentElement.dir).toBe("rtl");
      });
    } finally {
      restoreLocalStorage();
    }
  });
});
