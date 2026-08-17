import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

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
  IconMusicNote: (props: Record<string, unknown>) => element("span", props),
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

const { SongItem } = await import("./song-item");

describe("song item", () => {
  test("renders artwork fallback, metadata, and links with semantic text", () => {
    const html = renderToString(() => createComponent(SongItem, {
      metaItems: [{ href: "#", label: "c/argentina" }, { label: "418 plays" }],
      title: "Untitled Demo",
      titleHref: "#song",
    }));

    expect(html).toContain("Untitled Demo");
    expect(html).toContain("c/argentina");
    expect(html).toContain('href="#song"');
    expect(html).toContain('aria-hidden="true"');
  });
});
