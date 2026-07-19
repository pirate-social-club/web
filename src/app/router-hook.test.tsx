import "@/test/setup-runtime";

import { afterEach, expect, test } from "bun:test";
import * as React from "react";

import { useRoute } from "./router";

const { cleanup, render, waitFor } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

test("canonicalizes the hydration URL after render", async () => {
  const originalHistory = window.history;
  const originalLocation = window.location;
  let replaceCount = 0;
  let replaceCountDuringRender = -1;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL("https://pirate.test/"),
  });
  Object.defineProperty(window, "history", {
    configurable: true,
    value: {
      replaceState: (_state: unknown, _unused: string, url?: string | URL | null) => {
        replaceCount += 1;
        if (url != null) {
          Object.defineProperty(window, "location", {
            configurable: true,
            value: new URL(String(url), window.location.origin),
          });
        }
      },
    } as History,
  });

  function Probe() {
    useRoute("/c/@🇵🇸", window.location.hostname);
    replaceCountDuringRender = replaceCount;
    return null;
  }

  try {
    render(<Probe />);

    expect(replaceCountDuringRender).toBe(0);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/c/@xn--t77hga");
    });
    expect(replaceCount).toBe(1);
  } finally {
    Object.defineProperty(window, "history", {
      configurable: true,
      value: originalHistory,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  }
});
