import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

import { fiveChainSections } from "./wallet-flow-fixtures";

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
  CopyField: primitive("div"),
  IconCaretLeft: primitive("svg"),
  IconCaretRight: primitive("svg"),
  IconCheckCircle: primitive("svg"),
  IconCopy: primitive("svg"),
  IconMagnifyingGlass: primitive("svg"),
  IconWarningCircle: primitive("svg"),
  Input: primitive("input"),
  Modal: primitive("div"),
  ModalContent: primitive("section"),
  ModalDescription: typePrimitive,
  ModalFooter: primitive("footer"),
  ModalHeader: primitive("header"),
  ModalTitle: typePrimitive,
  MobilePageHeader: primitive("header"),
  PageContainer: primitive("main"),
  ResponsiveOptionSelect: (props: Record<string, unknown>) => ssrElement("button", { "aria-label": props.ariaLabel }, props.value, false),
  Spinner: primitive("span"),
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

const { WalletSendSheet } = await import("./wallet-send-sheet");

describe("wallet send sheet rendered states", () => {
  test("renders invalid recipient semantics and exact validation copy", () => {
    const html = renderToString(() => WalletSendSheet({
      chainSections: fiveChainSections,
      defaultAssetId: "base:base-usdc",
      defaultRecipient: "0x123",
      onOpenChange: () => undefined,
      open: true,
      step: "recipient",
    }));
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Enter a valid EVM address.");
    expect(html).toContain("Continue to amount");
  });

  test("renders live terminal status branches without network dependencies", () => {
    const pending = renderToString(() => WalletSendSheet({ chainSections: fiveChainSections, onOpenChange: () => undefined, open: true, step: "pending" }));
    const success = renderToString(() => WalletSendSheet({ chainSections: fiveChainSections, onOpenChange: () => undefined, open: true, step: "success" }));
    const error = renderToString(() => WalletSendSheet({ chainSections: fiveChainSections, onOpenChange: () => undefined, open: true, step: "error" }));
    expect(pending).toContain('role="status"');
    expect(pending).toContain("Submitting transaction");
    expect(success).toContain("Transaction confirmed");
    expect(success).toContain("0x4b6c");
    expect(error).toContain('role="alert"');
    expect(error).toContain("Transaction failed. Check the network and try again.");
  });
});

afterAll(() => mock.restore());
