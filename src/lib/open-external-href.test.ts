import { afterEach, describe, expect, test } from "bun:test";

import { installDomGlobals } from "@/test/setup-dom";
import { openExternalHref } from "./open-external-href";

afterEach(() => {
  Object.defineProperty(window, "Telegram", {
    configurable: true,
    value: undefined,
  });
});

describe("openExternalHref", () => {
  test("uses Telegram openLink when running inside a Mini App", () => {
    const { window } = installDomGlobals();
    const opened: Array<{ options?: Record<string, unknown>; url: string }> = [];

    Object.defineProperty(window, "Telegram", {
      configurable: true,
      value: {
        WebApp: {
          openLink: (url: string, options?: Record<string, unknown>) => {
            opened.push({ options, url });
          },
        },
      },
    });

    openExternalHref("https://redirect.self.xyz/?selfApp=test");

    expect(opened).toEqual([{
      options: { try_instant_view: false },
      url: "https://redirect.self.xyz/?selfApp=test",
    }]);
  });

  test("falls back to opening a new browser window", () => {
    const { window } = installDomGlobals();
    const opened: string[] = [];

    Object.defineProperty(window, "open", {
      configurable: true,
      value: (url: string) => {
        opened.push(url);
        return {};
      },
    });

    openExternalHref("https://example.test/verify");

    expect(opened).toEqual(["https://example.test/verify"]);
  });
});
