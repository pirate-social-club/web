import { afterAll, describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
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
  Button: primitive("button"),
  FormNote: primitive("p"),
  IconMusicNote: primitive("svg"),
  IconVideoCamera: primitive("svg"),
  Modal: (props: Record<string, unknown>) => props.children,
  ModalContent: primitive("section"),
  ModalDescription: typePrimitive,
  ModalHeader: primitive("header"),
  ModalTitle: typePrimitive,
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

const { SongPurchaseModal } = await import("./song-purchase-modal");

describe("song purchase modal rendered and SSR states", () => {
  const base = {
    fundingAssetLabel: "USDC on Base Sepolia",
    onOpenChange: () => undefined,
    open: true,
    priceLabel: "$3.99",
    songTitle: "Midnight Waves",
  } as const;

  test("renders purchase summary and callback-only primary action", () => {
    const html = renderToString(() => createComponent(SongPurchaseModal, { ...base, state: "desktop" }));
    expect(html).toContain("Unlock song");
    expect(html).toContain("Buy full access to Midnight Waves.");
    expect(html).toContain("USDC on Base Sepolia");
    expect(html).toContain("Unlock for $3.99");
    expect(html).toContain("Save up to 20% with Self.xyz");
  });

  test("renders verified, vinyl, processing, and error states with accessible status", () => {
    const verified = renderToString(() => createComponent(SongPurchaseModal, { ...base, priceLabel: "$3.19", state: "verified" }));
    const vinyl = renderToString(() => createComponent(SongPurchaseModal, { ...base, state: "vinyl-available" }));
    const processing = renderToString(() => createComponent(SongPurchaseModal, { ...base, state: "processing" }));
    const error = renderToString(() => createComponent(SongPurchaseModal, { ...base, state: "error" }));
    expect(verified).toContain("Self.xyz discount");
    expect(verified).toContain("20% off");
    expect(vinyl).toContain("Vinyl available after unlock.");
    expect(processing).toContain('aria-busy="true"');
    expect(processing).toContain("Processing purchase");
    expect(error).toContain('role="alert"');
    expect(error).toContain("Checkout transaction was rejected.");
  });
});

afterAll(() => mock.restore());
