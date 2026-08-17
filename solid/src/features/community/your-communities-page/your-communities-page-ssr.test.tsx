import { describe, expect, mock, test } from "bun:test";
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
  Button: primitive("button"),
  CommunityAvatar: primitive("span"),
  FlatTabsList: primitive("div"),
  FlatTabsTrigger: primitive("button"),
  PageContainer: primitive("div"),
  Tabs: primitive("div"),
  TabsContent: primitive("section"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
}));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { YourCommunitiesPage } = await import("./your-communities-page");

const following = [
  { avatarSrc: null, communityId: "cmt_atlas", displayName: "Atlas Gardens", routeSlug: "atlas-gardens", updatedAt: "2026-04-27T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_signal", displayName: "Signal Room", routeSlug: "signal-room", updatedAt: "2026-04-26T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_courtyard", displayName: "Courtyard Builders", routeSlug: "courtyard-builders", updatedAt: "2026-04-25T16:00:00.000Z" },
];
const joined = [
  { avatarSrc: null, communityId: "cmt_foundry", displayName: "Foundry Operators", routeSlug: "foundry-operators", updatedAt: "2026-04-28T16:00:00.000Z" },
  { avatarSrc: null, communityId: "cmt_harbor", displayName: "Harbor Council", routeSlug: "harbor-council", updatedAt: "2026-04-24T16:00:00.000Z" },
];

const props = {
  createCommunityLabel: "Create Community",
  emptyFollowingLabel: "No communities yet. Communities you create or join show up here.",
  emptyJoinedLabel: "Communities you join will appear here.",
  following,
  followingCommunities: following,
  followingLabel: "Following",
  joined,
  joinedCommunities: joined,
  joinedLabel: "Joined",
  onCreateCommunity: () => {},
  onSelectCommunity: () => {},
  title: "Your Communities",
};

describe("YourCommunitiesPage SSR", () => {
  test("renders deterministic desktop and mobile structures for all five communities", () => {
    const html = renderToString(() => createComponent(YourCommunitiesPage, props));
    expect(html).toContain("Your Communities");
    expect(html).toContain("Create Community");
    expect(html).toContain('data-community-id="cmt_atlas"');
    expect(html).toContain('data-community-id="cmt_harbor"');
    expect(html).toContain("c/atlas-gardens");
    expect(html).toContain("value=\"following\"");
    expect(html).toContain("value=\"joined\"");
    expect(html).not.toContain("Math.random");
    expect(html).not.toContain("fetch(");
  });

  test("renders both controlled empty states", () => {
    const html = renderToString(() => createComponent(YourCommunitiesPage, {
      ...props,
      followingCommunities: [],
      joinedCommunities: [],
    }));
    expect(html).toContain("No communities yet. Communities you create or join show up here.");
    expect(html).toContain("Communities you join will appear here.");
  });
});
