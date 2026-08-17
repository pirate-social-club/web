import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

import { fixtureImage } from "../../posts/post-card/fixtures";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
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
  IconRobot: primitive("svg"),
  Separator: primitive("hr"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  buttonVariants: () => "button-variant",
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { IdentityHero } = await import("./identity-hero");

describe("identity hero", () => {
  test("renders image, badge, title, and accessible action content without network fixtures", () => {
    const html = renderToString(() => createComponent(IdentityHero, {
      actions: "Follow",
      avatarBadgeCountryCode: "AR",
      avatarBadgeLabel: "Argentina",
      avatarFallback: "PA",
      avatarSrc: fixtureImage("avatar", 100, 100),
      coverSrc: fixtureImage("cover", 600, 200),
      flagUrlForCountryCode: (code) => fixtureImage(`flag-${code}`, 32, 32),
      subtitle: "u/pampa.pirate",
      title: "Pampa",
    }));

    expect(html).toContain("Pampa");
    expect(html).toContain('badgeLabel="Argentina"');
    expect(html).toContain("data:image/svg+xml");
    expect(html).not.toContain("https://");
  });
});
