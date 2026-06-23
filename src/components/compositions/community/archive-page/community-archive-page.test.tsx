import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import { CommunityArchivePage } from "./community-archive-page";

Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: globalThis.getComputedStyle,
});
Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: function DocumentFragment() {
    return document.createDocumentFragment();
  },
});
for (const key of ["Event", "HTMLInputElement", "HTMLTextAreaElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}
Object.defineProperty(globalThis, "InputEvent", {
  configurable: true,
  value: window.InputEvent ?? window.Event,
});

const { cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

describe("CommunityArchivePage", () => {
  test("active state requires a confirm step before archiving", () => {
    let archiveCalls = 0;
    const { getByText, queryByText } = render(
      <CommunityArchivePage status="active" submitState={{ kind: "idle" }} onArchive={() => { archiveCalls += 1; }} />,
    );

    // Not confirmed yet — the destructive confirm action is not shown.
    expect(queryByText("Yes, archive")).toBeNull();
    expect(archiveCalls).toBe(0);

    fireEvent.click(getByText("Archive community"));
    // Confirm affordance now visible (getByText throws if absent); still not archived.
    expect(queryByText("Yes, archive") === null).toBe(false);
    expect(archiveCalls).toBe(0);

    fireEvent.click(getByText("Yes, archive"));
    expect(archiveCalls).toBe(1);
  });

  test("cancel backs out of the confirm step without archiving", () => {
    let archiveCalls = 0;
    const { getByText, queryByText } = render(
      <CommunityArchivePage status="active" submitState={{ kind: "idle" }} onArchive={() => { archiveCalls += 1; }} />,
    );

    fireEvent.click(getByText("Archive community"));
    fireEvent.click(getByText("Cancel"));
    expect(queryByText("Yes, archive")).toBeNull();
    expect(archiveCalls).toBe(0);
  });

  test("archived state offers unarchive", () => {
    let unarchiveCalls = 0;
    const { getByText, queryByText } = render(
      <CommunityArchivePage status="archived" submitState={{ kind: "idle" }} onUnarchive={() => { unarchiveCalls += 1; }} />,
    );

    expect(queryByText("Archive community")).toBeNull();
    fireEvent.click(getByText("Unarchive community"));
    expect(unarchiveCalls).toBe(1);
  });

  test("renders the submit error message", () => {
    const { queryByText } = render(
      <CommunityArchivePage status="active" submitState={{ kind: "error", message: "Couldn't archive." }} />,
    );
    expect(queryByText("Couldn't archive.") === null).toBe(false);
  });
});
