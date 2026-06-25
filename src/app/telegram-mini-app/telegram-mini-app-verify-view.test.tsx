import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import { TelegramMiniAppVerifyView } from "./telegram-mini-app-verify-view";

Object.defineProperty(globalThis, "DocumentFragment", {
  configurable: true,
  value: function DocumentFragment() {
    return document.createDocumentFragment();
  },
});
Object.defineProperty(globalThis, "getComputedStyle", {
  configurable: true,
  value: () => ({
    getPropertyValue: () => "",
  }),
});
Object.defineProperty(window, "getComputedStyle", {
  configurable: true,
  value: globalThis.getComputedStyle,
});
for (const key of ["Event", "HTMLButtonElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}

const { cleanup, fireEvent, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

describe("TelegramMiniAppVerifyView", () => {
  test("renders the existing-account link action for Self verification", () => {
    let clicked = false;
    const view = render(
      <TelegramMiniAppVerifyView
        onLinkExistingAccount={() => {
          clicked = true;
        }}
        screen={{
          href: "https://self.xyz/verify",
          kind: "ready",
          message: "Use Self.",
          provider: "self",
        }}
      />,
    );

    const button = view.getByRole("button", {
      name: "Already verified on Pirate? Link Telegram to your existing account",
    });
    fireEvent.click(button);

    expect(clicked).toBe(true);
  });

  test("does not render the existing-account link action for ZKPassport verification", () => {
    const view = render(
      <TelegramMiniAppVerifyView
        screen={{
          href: "https://zkpassport.example/verify",
          kind: "ready",
          message: "Use ZKPassport.",
          provider: "zkpassport",
        }}
      />,
    );

    expect(view.queryByRole("button", {
      name: "Already verified on Pirate? Link Telegram to your existing account",
    })).toBeNull();
  });
});
