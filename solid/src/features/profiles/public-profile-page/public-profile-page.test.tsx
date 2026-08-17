import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

import { fixtureImage } from "../../posts/post-card/fixtures";
import { publicProfileStoryProps } from "./story-fixtures";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const pageShellPath = new URL("../../shell/page-shell.tsx", import.meta.url).pathname;
const postCardPath = new URL("../../posts/post-card/post-card.tsx", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;
const element = (tag: string, props: Record<string, unknown>) => {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
};
const primitive = (tag: string) => (props: Record<string, unknown>) => element(tag, props);

mock.module(designSystemPath, () => ({
  Avatar: primitive("span"),
  AvatarBadge: primitive("span"),
  Card: primitive("section"),
  IconMusicNote: primitive("span"),
  IconRobot: primitive("span"),
  Separator: primitive("hr"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  buttonVariants: () => "button-variant",
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));
mock.module(pageShellPath, () => ({ PublicRoutePage: primitive("div") }));
mock.module(postCardPath, () => ({ PostCard: primitive("article") }));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { PublicProfilePage } = await import("./public-profile-page");

describe("public profile page", () => {
  test("renders an offline minimal About state without remote media", () => {
    const html = renderToString(() => createComponent(PublicProfilePage, {
      avatarBadgeCountryCode: "AR",
      avatarBadgeLabel: "Argentina",
      displayName: "new_user",
      flagUrlForCountryCode: () => fixtureImage("argentina-flag", 32, 32),
      handle: "u/new_user.pirate",
    }));

    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="profile-heading-about"');
    expect(html).toContain('aria-labelledby="profile-heading-about"');
    expect(html).toContain("new_user");
    expect(html).toContain("No info yet.");
    expect(html).not.toContain("No bio provided.");
    expect(html).not.toContain("No communities yet.");
    expect(html.indexOf('role="tabpanel"')).toBeLessThan(html.indexOf("Open in Pirate"));
    expect(html).not.toContain("https://");
  });

  test("derives populated tabs and preserves the reference post copy", () => {
    const html = renderToString(() => createComponent(PublicProfilePage, publicProfileStoryProps));

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(">126</span>");
    expect(html).toContain(">Posts</span>");
    expect(publicProfileStoryProps.communities?.map((community) => community.label)).toContain("c/interesting");
    expect(publicProfileStoryProps.posts?.[0].post.byline.author.label).toBe("u/Pampa_of_Argentina");
    expect(html).toContain("Buenos Aires holds the world record for bookstores per capita");
  });
});
