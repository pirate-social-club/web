import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

import { fiveChainSections, sharedWalletAddress } from "./wallet-flow-fixtures";

const designSystemPath = new URL("../../design-system.ts", import.meta.url).pathname;
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
  BadgedCircle: primitive("span"),
  Button: primitive("button"),
  Card: primitive("section"),
  CopyField: (props: Record<string, unknown>) => ssrElement("div", { "aria-label": `Copy ${props.copyLabel ?? "value"}` }, props.value, false),
  IconCaretRight: primitive("svg"),
  Modal: primitive("div"),
  ModalContent: primitive("section"),
  ModalDescription: typePrimitive,
  ModalHeader: primitive("header"),
  ModalTitle: typePrimitive,
  MobilePageHeader: primitive("header"),
  PageContainer: primitive("main"),
  ResponsiveOptionSelect: (props: Record<string, unknown>) => ssrElement("button", { "aria-label": props.ariaLabel }, props.value, false),
  Type: typePrimitive,
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
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

const { WalletReceiveSheet } = await import("./wallet-receive-sheet");

describe("wallet receive sheet rendered states", () => {
  test("renders the selected chain, full copy value, and accessible deterministic QR", () => {
    const html = renderToString(() => WalletReceiveSheet({
      chainSections: fiveChainSections,
      defaultChainId: "story",
      onOpenChange: () => undefined,
      open: true,
      walletAddress: sharedWalletAddress,
    }));
    expect(html).toContain("Story Aeneid");
    expect(html).toContain(sharedWalletAddress);
    expect(html).toContain(`role="img"`);
    expect(html).toContain(`aria-label="QR code for story:${sharedWalletAddress}"`);
  });

  test("renders the explicit no-wallet branch and close action", () => {
    const html = renderToString(() => WalletReceiveSheet({
      chainSections: fiveChainSections.map((section) => ({ ...section, walletAddress: null })),
      onOpenChange: () => undefined,
      open: true,
      walletAddress: null,
    }));
    expect(html).toContain("No wallet connected");
    expect(html).toContain("Connect a wallet before receiving assets.");
    expect(html).toContain("Close receive sheet");
    expect(html).not.toContain('role="img"');
  });
});

afterAll(() => mock.restore());
