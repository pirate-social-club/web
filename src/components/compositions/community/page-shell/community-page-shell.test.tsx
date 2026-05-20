import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";

const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { configurable: true, value: document });
Object.defineProperty(globalThis, "window", { configurable: true, value: window });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: window.navigator });
Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: document.createDocumentFragment().constructor,
});
Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: window.HTMLElement });
Object.defineProperty(globalThis, "Node", { configurable: true, value: window.Node });
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

const { mock } = await import("bun:test") as unknown as {
  mock: {
    module: (specifier: string, factory: () => unknown) => void;
  };
};

let mockedIsMobile = true;

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockedIsMobile,
}));

const { CommunityPageShell } = await import("./community-page-shell");

describe("CommunityPageShell", () => {
  test("places the mobile feed sort control in the top-right header slot", () => {
    mockedIsMobile = true;
    const markup = renderToStaticMarkup(
      <CommunityPageShell
        activeSort="best"
        availableSorts={[
          { label: "Best", value: "best" },
          { label: "New", value: "new" },
        ]}
        communityId="cmt_test"
        items={[]}
        sidebar={{
          createdAt: "2026-04-28T00:00:00.000Z",
          displayName: "Test community",
          membershipMode: "request",
          moderators: [],
        }}
        title="Test community"
      />,
    );
    const rendered = parseHTML(markup).document;
    const buttons = Array.from(rendered.querySelectorAll("button"));
    const feedTab = buttons.find((button) => button.textContent?.trim() === "Feed");
    const aboutTab = buttons.find((button) => button.textContent?.trim() === "About");
    const sortButton = buttons.find((button) => button.getAttribute("aria-label") === "Sort feed");

    expect(feedTab === undefined).toBe(false);
    expect(aboutTab === undefined).toBe(false);
    expect(sortButton === undefined).toBe(false);
    const tabRow = feedTab!.parentElement;
    let sortSlot = sortButton!.parentElement;
    while (sortSlot instanceof HTMLElement && !sortSlot.classList.contains("fixed")) {
      sortSlot = sortSlot.parentElement;
    }

    expect(tabRow).toBe(aboutTab?.parentElement);
    expect(tabRow?.contains(sortButton!)).toBe(false);
    expect(sortSlot?.className).toContain("fixed");
    expect(sortSlot?.className).toContain("end-3");
  });

  test("renders one desktop feed sort selector", () => {
    mockedIsMobile = false;
    const markup = renderToStaticMarkup(
      <CommunityPageShell
        activeSort="best"
        availableSorts={[
          { label: "Best", value: "best" },
          { label: "New", value: "new" },
        ]}
        communityId="cmt_test"
        items={[]}
        sidebar={{
          createdAt: "2026-04-28T00:00:00.000Z",
          displayName: "Test community",
          membershipMode: "request",
          moderators: [],
        }}
        title="Test community"
      />,
    );
    const rendered = parseHTML(markup).document;
    const sortButtons = Array.from(rendered.querySelectorAll("button"))
      .filter((button) => button.getAttribute("aria-label") === "Sort feed");

    expect(sortButtons).toHaveLength(2);
  });

  test("does not make the desktop sidebar independently scrollable", () => {
    mockedIsMobile = false;
    const markup = renderToStaticMarkup(
      <CommunityPageShell
        communityId="cmt_test"
        items={[]}
        sidebar={{
          createdAt: "2026-04-28T00:00:00.000Z",
          displayName: "Test community",
          membershipMode: "request",
          moderators: [],
          rules: [
            { body: "Rule one", title: "One" },
            { body: "Rule two", title: "Two" },
          ],
        }}
        title="Test community"
      />,
    );
    const rendered = parseHTML(markup).document;
    const sidebars = Array.from(rendered.querySelectorAll("aside"));
    const communitySidebar = sidebars.find((sidebar) => sidebar.className.includes("sticky"));

    expect(communitySidebar === undefined).toBe(false);
    expect(communitySidebar!.className).not.toContain("overflow-y-auto");
    expect(communitySidebar!.className).not.toContain("max-h-");
  });

  test("renders the community store link in the desktop sidebar", () => {
    mockedIsMobile = false;
    const markup = renderToStaticMarkup(
      <CommunityPageShell
        communityId="cmt_test"
        items={[]}
        sidebar={{
          createdAt: "2026-04-28T00:00:00.000Z",
          displayName: "Test community",
          membershipMode: "request",
          moderators: [],
          store: {
            label: "Merch",
            url: "https://store.example.com/test",
          },
        }}
        title="Test community"
      />,
    );
    const rendered = parseHTML(markup).document;
    const storeLink = Array.from(rendered.querySelectorAll("a"))
      .find((link) => link.getAttribute("href") === "https://store.example.com/test");

    expect(storeLink === undefined).toBe(false);
    expect(storeLink?.textContent).toContain("Merch");
    expect(storeLink?.getAttribute("target")).toBe("_blank");
    expect(storeLink?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
