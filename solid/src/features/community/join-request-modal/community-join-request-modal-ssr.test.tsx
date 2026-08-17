import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const uiLocalePath = new URL("../../../lib/ui-locale.tsx", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

function primitive(tag: string) {
  return (props: Record<string, unknown>) => {
    const { children, class: className, ...rest } = props;
    return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
  };
}

const typePrimitive = (props: Record<string, unknown>) => {
  const { as = "span", children, class: className, ...rest } = props;
  return ssrElement(String(as), { ...rest, ...(className ? { class: className } : {}) }, children, false);
};

mock.module(designSystemPath, () => ({
  Button: (props: Record<string, unknown>) => {
    const { children, loading, ...rest } = props;
    return primitive("button")({
      ...rest,
      "aria-busy": loading ? "true" : undefined,
      children,
      disabled: Boolean(props.disabled) || Boolean(loading),
    });
  },
  FormNote: primitive("p"),
  IconCheckCircle: primitive("svg"),
  IconUsersThree: primitive("svg"),
  Modal: (props: Record<string, unknown>) => props.children,
  ModalContent: primitive("section"),
  ModalDescription: typePrimitive,
  ModalHeader: primitive("header"),
  ModalTitle: typePrimitive,
  Textarea: primitive("textarea"),
  Type: typePrimitive,
}));

mock.module(uiLocalePath, () => ({
  useUiLocale: () => ({ dir: () => "ltr", locale: () => "en" }),
}));

const jsxRuntime = () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
});

mock.module(jsxRuntimePath, jsxRuntime);
mock.module("@solidjs/web/jsx-runtime", jsxRuntime);
mock.module("@solidjs/web/jsx-dev-runtime", jsxRuntime);

const { CommunityJoinRequestModal } = await import("./community-join-request-modal");

describe("CommunityJoinRequestModal SSR", () => {
  const base = {
    communityName: "Signal Room",
    onOpenChange: () => undefined,
    onSubmit: () => undefined,
    open: true,
  } as const;

  test("renders the localized form with deterministic field, placeholder, and counter", () => {
    const html = renderToString(() => createComponent(CommunityJoinRequestModal, {
      ...base,
      initialNote: "seed",
    }));

    expect(html).toContain("Request to join");
    expect(html).toContain("Tell the moderators why you want to join.");
    const noteId = html.match(/id="(community-join-request-note-[^"]+)"/)?.[1];
    expect(noteId).toBeTruthy();
    expect(html).toContain(`for="${noteId}"`);
    expect(html).toContain("Why Signal Room?");
    expect(html).toContain("4/500");
    expect(html).toContain("Submit");
    expect(html).not.toContain("Math.random");
    expect(html).not.toContain("fetch(");
  });

  test("renders submitting, error, and submitted semantics", () => {
    const submitting = renderToString(() => createComponent(CommunityJoinRequestModal, {
      ...base,
      error: "Try again.",
      submitting: true,
    }));
    expect(submitting).toContain("Try again.");
    expect(submitting).toContain('role="alert"');
    expect(submitting).toContain('aria-busy="true"');
    expect(submitting).toContain("disabled");

    const submitted = renderToString(() => createComponent(CommunityJoinRequestModal, {
      ...base,
      submitted: true,
    }));
    expect(submitted).toContain("Request submitted");
    expect(submitted).toContain("The moderators will review your request.");
    expect(submitted).toContain("Done");
    expect(submitted).not.toContain("community-join-request-note");
  });
});

afterAll(() => mock.restore());
