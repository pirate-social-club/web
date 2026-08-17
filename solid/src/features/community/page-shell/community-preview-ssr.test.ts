import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

function element(tag: string, props: Record<string, unknown>) {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
}

const primitive = (tag: string) => (props: Record<string, unknown>) => element(tag, props);

mock.module(designSystemPath, () => ({
  Avatar: primitive("span"),
  Button: primitive("button"),
  Card: primitive("section"),
  CardContent: primitive("div"),
  CommunityAvatar: primitive("span"),
  Separator: primitive("hr"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  buttonVariants: () => "button-variant",
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));

mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) =>
    typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) =>
    typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) =>
    typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { ActionCalloutPanel } = await import("../action-callout-panel/action-callout-panel.stories");
const { CommunityPageShell } = await import("./page-shell");
const { PopularCommunitiesRail } = await import("../popular-communities-rail/popular-communities-rail.stories");
const { CommunitySidebar } = await import("../sidebar/sidebar.stories");
const { FeedBoard } = await import("../../posts/feed/feed.stories");

describe("community preview story SSR", () => {
  test("renders the owned community states without browser-only APIs", () => {
    const callout = renderToString(() => createComponent(ActionCalloutPanel, {
      actionLabel: "Verify to Join",
      description: "Complete the ID check.",
      title: "Verify your identity to join",
    }));
    const shell = renderToString(() => createComponent(CommunityPageShell, {
      community: {
        description: "A deterministic community.",
        followers: 12,
        handle: "c/example",
        members: 4,
        name: "Example",
        posts: [{ body: "Hello body", id: "p1", publishedAt: "2026-08-01", score: 5, title: "Hello" }],
        referenceLinks: [{ href: "https://example.com", label: "Reference", position: 1 }],
        rules: [{ body: "Keep it kind.", position: 1, title: "Be kind" }],
      },
      following: false,
      joined: false,
    }));
    const rail = renderToString(() => createComponent(PopularCommunitiesRail, {
      items: [{ communityId: "example", followers: 12, href: "/c/example", label: "c/example" }],
    }));
    const sidebar = renderToString(() => createComponent(CommunitySidebar, {
      description: "A deterministic community.", displayName: "Example", followers: 12, members: 4,
      gates: [{ label: "Palm scan", status: "unmet", type: "unique_human" }], hasActionTimeCheck: true, mode: "any",
    }));
    const feed = renderToString(() => createComponent(FeedBoard, {
      items: [{ author: "ana", body: "Hello", community: "example", id: "p1", publishedAt: "2026-08-01", score: 2, title: "A post" }],
    }));
    const feedError = renderToString(() => createComponent(FeedBoard, {
      items: [], state: "error",
    }));
    const feedInitialLoading = renderToString(() => createComponent(FeedBoard, {
      items: [{ author: "ana", body: "Should not render yet", community: "example", id: "p2", publishedAt: "2026-08-01", score: 2, title: "Initial" }], state: "loading",
    }));
    const feedLoadingMore = renderToString(() => createComponent(FeedBoard, {
      items: [
        { author: "ana", body: "Existing content", community: "example", id: "p3", publishedAt: "2026-08-01", score: 2, title: "Existing" },
        { author: "bo", body: "Second content", community: "example", id: "p4", publishedAt: "2026-07-31", score: 1, title: "Second" },
        { author: "cy", body: "Third content", community: "example", id: "p5", publishedAt: "2026-07-30", score: 1, title: "Third" },
        { author: "di", body: "Fourth content", community: "example", id: "p6", publishedAt: "2026-07-29", score: 1, title: "Fourth" },
      ], loadingMore: true,
    }));

    expect(callout).toContain("Verify your identity to join");
    expect(shell).toContain("data-community-page");
    expect(shell).toContain("Community rules");
    expect(shell).toContain("Reference");
    expect(rail).toContain("data-popular-communities");
    expect(sidebar).toContain("Palm scan");
    expect(sidebar).toContain("Action-time browser check");
    expect(feed).toContain("data-feed-state=\"ready\"");
    expect(feedError).toContain("could not load the next page");
    expect(feedError).toContain('role="alert"');
    expect(feedInitialLoading).not.toContain("Should not render yet");
    expect(feedInitialLoading).toContain("Loading feed");
    expect(feedLoadingMore).toContain("Existing content");
    expect(feedLoadingMore).toContain("aria-live=\"polite\"");
  });
});

afterAll(() => {
  mock.restore();
});
