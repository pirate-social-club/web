import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { navigateOrReload } from "./router";
import { installDomGlobals } from "@/test/setup-dom";

installDomGlobals();

const navigationEventName = "pirate:navigate";
const testOrigin = "https://pirate.test";

let reloadCount = 0;

function setTestLocation(path: string = "/current"): void {
  const location = new URL(path, testOrigin) as URL & { reload: () => void };
  location.reload = () => {
    reloadCount += 1;
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
}

const testHistory = {
  forward: () => undefined,
  pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocationKeepingReload(String(url));
    }
  },
  replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
    if (url != null) {
      setTestLocationKeepingReload(String(url));
    }
  },
} as History;

// pushState moves the location without resetting the reload spy, so assertions
// can still see whether a reload happened before the navigation.
function setTestLocationKeepingReload(path: string): void {
  const previousReload = (window.location as unknown as { reload?: () => void }).reload;
  setTestLocation(path);
  if (previousReload) {
    (window.location as unknown as { reload: () => void }).reload = previousReload;
  }
}

const originalEvent = globalThis.Event;
const originalHistory = window.history;
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  reloadCount = 0;
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

describe("navigateOrReload", () => {
  test("reloads instead of navigating when the target is the current href", () => {
    const navigation = collectNavigationEvents();

    navigateOrReload("/current");

    expect(reloadCount).toBe(1);
    expect(window.location.pathname).toBe("/current");
    expect(navigation.events).toEqual([]);
    navigation.remove();
  });

  test("matches the current href including search and hash", () => {
    setTestLocation("/current?filter=songs#karaoke");
    const navigation = collectNavigationEvents();

    navigateOrReload("/current?filter=songs#karaoke");

    expect(reloadCount).toBe(1);
    expect(navigation.events).toEqual([]);
    navigation.remove();
  });

  test("navigates without reloading when the path changes", () => {
    const navigation = collectNavigationEvents();

    navigateOrReload("/next");

    expect(reloadCount).toBe(0);
    expect(window.location.pathname).toBe("/next");
    expect(navigation.events).toEqual(["/next"]);
    navigation.remove();
  });

  test("navigates without reloading when only the query changes", () => {
    const navigation = collectNavigationEvents();

    navigateOrReload("/current?filter=posts");

    expect(reloadCount).toBe(0);
    expect(window.location.search).toBe("?filter=posts");
    expect(navigation.events).toEqual(["/current?filter=posts"]);
    navigation.remove();
  });
});
