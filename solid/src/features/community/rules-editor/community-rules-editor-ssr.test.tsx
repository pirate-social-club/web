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
    children: element("button", { disabled: props.disabled, children: "Save" }),
  }),
  FormFieldLabel: (props: Record<string, unknown>) => element("label", { for: props.htmlFor, children: props.label }),
  IconPencil: primitive("span"),
  IconPlus: primitive("span"),
  IconTrash: primitive("span"),
  Input: primitive("input"),
  Select: (props: Record<string, unknown>) => element("select", { "aria-label": props["aria-label"] }),
  Textarea: primitive("textarea"),
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

const { CommunityRulesEditorPage } = await import("./community-rules-editor-page");

describe("CommunityRulesEditorPage SSR", () => {
  test("renders localized rule content, accessible edit/delete actions, and sticky footer", () => {
    const html = renderToString(() => createComponent(CommunityRulesEditorPage, {
      rules: [{
        id: "rule-1",
        existingRuleId: "rule-1",
        title: "Be constructive",
        body: "Keep feedback useful.",
        reportReason: "Constructive feedback",
      }],
    }));

    expect(html).toContain("Rules");
    expect(html).toContain("Be constructive");
    expect(html).toContain('aria-label="Edit rule"');
    expect(html).toContain('aria-label="Delete rule"');
    expect(html).toContain("sticky bottom-0");
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).not.toContain("fetch(");
    expect(html).not.toContain("Math.random");
  });

  test("renders the localized empty state and leaves the footer host-controlled", () => {
    const html = renderToString(() => createComponent(CommunityRulesEditorPage, {
      rules: [],
      saveDisabled: false,
    }));
    expect(html).toContain("No rules yet.");
    expect(html).not.toContain("disabled");
  });

  test("announces a host-owned loading save while retaining disabled semantics", () => {
    const html = renderToString(() => createComponent(CommunityRulesEditorPage, {
      rules: [],
      saveDisabled: true,
      saveLoading: true,
    }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
  });
});
