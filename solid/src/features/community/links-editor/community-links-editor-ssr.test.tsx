import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const uiLocalePath = new URL("../../../lib/ui-locale.tsx", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

function element(tag: string, props: Record<string, unknown>) {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
}

const primitive = (tag: string) => (props: Record<string, unknown>) => element(tag, props);
mock.module(designSystemPath, () => ({
  Button: (props: Record<string, unknown>) => element("button", {
    ...props,
    "aria-busy": props.loading ? "true" : undefined,
  }),
  CommunityModerationSaveFooter: (props: Record<string, unknown>) => element("footer", {
    class: props.class,
    children: element("button", { disabled: props.disabled, children: props.children ?? "Save" }),
  }),
  FormFieldLabel: (props: Record<string, unknown>) => element("label", { for: props.htmlFor, children: props.label }),
  IconPlus: primitive("span"),
  IconTrash: primitive("span"),
  Input: primitive("input"),
  Select: (props: Record<string, unknown>) => element("select", { "aria-label": props["aria-label"] }),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));
mock.module(uiLocalePath, () => ({
  useUiLocale: () => ({ locale: () => "en" }),
}));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { CommunityLinksEditorPage } = await import("./community-links-editor-page");

describe("CommunityLinksEditorPage SSR", () => {
  test("renders localized labels, deterministic field ids, sticky footer, and no network surface", () => {
    const html = renderToString(() => createComponent(CommunityLinksEditorPage, {
      links: [{ id: "link-1", label: "Spotify", platform: "spotify", url: "https://example.com", verified: true }],
      saveDisabled: false,
    }));

    expect(html).toContain("Links");
    expect(html).toContain("Display name");
    expect(html).toContain('for="link-1-label"');
    expect(html).toContain('id="link-1-label"');
    expect(html).toContain('for="link-1-url"');
    expect(html).toContain('id="link-1-url"');
    expect(html).toContain("sticky bottom-0");
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).not.toContain("fetch(");
    expect(html).not.toContain("Math.random");
  });

  test("keeps blank links empty while exposing the host disabled state", () => {
    const html = renderToString(() => createComponent(CommunityLinksEditorPage, {
      links: [],
      saveDisabled: true,
    }));
    expect(html).toContain("No links yet.");
    expect(html).toContain("disabled");
  });

  test("announces a host-owned loading save without changing the controlled disabled contract", () => {
    const html = renderToString(() => createComponent(CommunityLinksEditorPage, {
      links: [{ id: "link-1", label: "Site", platform: "official_website", url: "https://example.com" }],
      saveDisabled: true,
      saveLoading: true,
    }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
  });
});
