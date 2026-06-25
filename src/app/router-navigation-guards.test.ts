import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { addNavigationGuard, navigate, replaceRoute } from "./router";
import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const navigationEventName = "pirate:navigate";
const testOrigin = "https://pirate.test";
const guardCleanups: Array<() => void> = [];

function setTestLocation(path: string = "/current"): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(path, testOrigin),
  });
}

function addTestNavigationGuard(
  guard: Parameters<typeof addNavigationGuard>[0],
): () => void {
  const cleanup = addNavigationGuard(guard);
  guardCleanups.push(cleanup);
  return cleanup;
}

const testHistory = {
  forward: () => undefined,
  pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocation(String(url));
    }
  },
  replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocation(String(url));
    }
  },
} as History;

const originalEvent = globalThis.Event;
const originalHistory = window.history;
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  setTestLocation();
  Object.defineProperty(window, "history", {
    configurable: true,
    value: testHistory,
  });
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: window.Event,
  });
  window.scrollTo = () => undefined;
});

afterEach(() => {
  for (const cleanup of guardCleanups.splice(0)) {
    cleanup();
  }
  setTestLocation();
  Object.defineProperty(window, "history", {
    configurable: true,
    value: originalHistory,
  });
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: originalEvent,
  });
  window.scrollTo = originalScrollTo;
});

function collectNavigationEvents(): { events: string[]; remove: () => void } {
  const events: string[] = [];
  const handleNavigation = () => {
    events.push(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  };

  window.addEventListener(navigationEventName, handleNavigation);

  return {
    events,
    remove: () => window.removeEventListener(navigationEventName, handleNavigation),
  };
}

describe("router navigation guards", () => {
  test("blocks navigate before mutating the URL or dispatching navigation events", () => {
    const calls: Array<{ currentHref: string; nextHref: string }> = [];
    const navigation = collectNavigationEvents();
    addTestNavigationGuard((attempt) => {
      calls.push(attempt);
      return false;
    });

    navigate("/next?filter=songs#karaoke");

    expect(calls).toEqual([{ currentHref: "/current", nextHref: "/next?filter=songs#karaoke" }]);
    expect(window.location.pathname).toBe("/current");
    expect(navigation.events).toEqual([]);
    navigation.remove();
  });

  test("blocks replaceRoute before mutating the URL or dispatching navigation events", () => {
    const calls: string[] = [];
    const navigation = collectNavigationEvents();
    addTestNavigationGuard(() => {
      calls.push("guard");
      return false;
    });

    replaceRoute("/replacement");

    expect(calls).toEqual(["guard"]);
    expect(window.location.pathname).toBe("/current");
    expect(navigation.events).toEqual([]);
    navigation.remove();
  });

  test("same-href navigation bypasses guards", () => {
    const calls: string[] = [];
    addTestNavigationGuard(() => {
      calls.push("guard");
      return false;
    });

    navigate("/current");
    replaceRoute("/current");

    expect(calls).toEqual([]);
    expect(window.location.pathname).toBe("/current");
  });

  test("stops at the first blocking guard", () => {
    const calls: string[] = [];
    addTestNavigationGuard(() => {
      calls.push("first");
      return false;
    });
    addTestNavigationGuard(() => {
      calls.push("second");
      return true;
    });

    navigate("/blocked");

    expect(calls).toEqual(["first"]);
    expect(window.location.pathname).toBe("/current");
  });

  test("cleanup removes the guard and allows later navigation", () => {
    const navigation = collectNavigationEvents();
    const cleanup = addTestNavigationGuard(() => false);

    navigate("/blocked");
    expect(window.location.pathname).toBe("/current");
    expect(navigation.events).toEqual([]);

    cleanup();
    navigate("/allowed");

    expect(window.location.pathname).toBe("/allowed");
    expect(navigation.events).toEqual(["/allowed"]);
    navigation.remove();
  });
});
