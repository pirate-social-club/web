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

mock.module(designSystemPath, () => ({
  BadgedCircle: primitive("span"),
  Button: primitive("button"),
  Card: primitive("section"),
  IconCaretRight: primitive("svg"),
  MobilePageHeader: primitive("header"),
  PageContainer: primitive("main"),
  Type: (props: Record<string, unknown>) => {
    const { as = "span", children, class: className, ...rest } = props;
    return ssrElement(String(as), { ...rest, ...(className ? { class: className } : {}) }, children, false);
  },
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

const { WalletHub } = await import("./wallet-hub");

describe("wallet hub rendered and SSR states", () => {
  test("renders the no-wallet branch without browser dependencies", () => {
    const html = renderToString(() => WalletHub({ chainSections: [] }));
    expect(html).toContain("No wallet connected");
  });

  test("renders deterministic balance and asset labels on the server", () => {
    const html = renderToString(() => WalletHub({
      chainSections: fiveChainSections,
      totalBalanceUsd: "$27,910.97",
      walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873abc",
    }));
    expect(html).toContain("$27,910.97");
    expect(html).toContain("pathUSD");
    expect(html).toContain("Ethereum Sepolia chain");
  });
});

afterAll(() => mock.restore());
