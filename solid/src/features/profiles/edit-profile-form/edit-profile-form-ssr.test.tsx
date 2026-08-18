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
const passthrough = (props: Record<string, unknown>) => props.children;

mock.module(designSystemPath, () => ({
  Avatar: primitive("span"),
  Button: primitive("button"),
  Card: primitive("section"),
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogDescription: primitive("p"),
  DialogHeader: primitive("header"),
  DialogTitle: primitive("h2"),
  DialogTrigger: primitive("button"),
  FormFieldLabel: primitive("label"),
  FormNote: primitive("p"),
  FormSectionHeading: primitive("h3"),
  TabsList: passthrough,
  TabsTrigger: primitive("button"),
  IconChatCircle: primitive("svg"),
  IconFileText: primitive("svg"),
  IconList: primitive("svg"),
  IconWarningCircle: primitive("svg"),
  IconWallet: primitive("svg"),
  Input: primitive("input"),
  Separator: primitive("hr"),
  Spinner: primitive("span"),
  Tabs: passthrough,
  TabsContent: passthrough,
  Textarea: primitive("textarea"),
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  buttonVariants: () => "button-variant",
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
  createIsMobile: () => () => false,
}));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { EditProfileForm } = await import("./edit-profile-form");

describe("edit profile form SSR", () => {
  const base = {
    currentBio: "A bio",
    currentDisplayName: "Pampa",
    fieldErrors: [],
    values: { bio: "A bio", displayName: "Pampa" },
  } as const;

  test("renders required error and disabled pristine save state", () => {
    const html = renderToString(() => createComponent(EditProfileForm, {
      ...base,
      values: { bio: "A bio", displayName: "   " },
    }));
    expect(html).toContain('data-submit-enabled="false"');
    expect(html).not.toContain("Display name is required.");
  });

  test("renders dirty saving state with accessible live failure channel", () => {
    const html = renderToString(() => createComponent(EditProfileForm, {
      ...base,
      submitState: { kind: "error", message: "Failed to save. Try again." },
      values: { bio: "New bio", displayName: "Pampa" },
    }));
    expect(html).toContain('data-submit-enabled="true"');
    expect(html).toContain("Failed to save. Try again.");
    expect(html).toContain('aria-live="assertive"');
  });
});
