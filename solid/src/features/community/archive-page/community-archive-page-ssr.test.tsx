import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

function element(tag: string, props: Record<string, unknown>) {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
}

mock.module(designSystemPath, () => ({
  Button: (props: Record<string, unknown>) => element("button", {
    ...props,
    disabled: props.disabled || props.loading,
    "aria-busy": props.loading ? "true" : undefined,
  }),
  FormNote: (props: Record<string, unknown>) => element("p", props),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
}));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { CommunityArchivePage } = await import("./community-archive-page");

describe("CommunityArchivePage SSR", () => {
  test("renders active danger copy and deterministic controls", () => {
    const html = renderToString(() => createComponent(CommunityArchivePage, {
      status: "active",
      submitState: { kind: "idle" },
    }));
    expect(html).toContain("Danger zone");
    expect(html).toContain("What archiving does");
    expect(html).toContain("Archive community");
    expect(html).toContain("Hides the community from discovery and search.");
    expect(html).not.toContain("Math.random");
    expect(html).not.toContain("fetch(");
  });

  test("exposes controlled saving and error semantics", () => {
    const html = renderToString(() => createComponent(CommunityArchivePage, {
      status: "archived",
      submitState: { kind: "saving" },
    }));
    expect(html).toContain("This community is archived");
    expect(html).toContain("Unarchive community");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");

    const error = renderToString(() => createComponent(CommunityArchivePage, {
      status: "active",
      submitState: { kind: "error", message: "Couldn't archive the community. Try again." },
    }));
    expect(error).toContain('role="alert"');
    expect(error).toContain("Couldn't archive the community. Try again.");
  });
});
