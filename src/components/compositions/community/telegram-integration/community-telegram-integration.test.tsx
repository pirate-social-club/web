import "@/test/setup-runtime";

import { afterEach, describe, expect, test } from "bun:test";
import * as React from "react";

import { CommunityTelegramIntegrationPage } from "./community-telegram-integration";
import { createDefaultTelegramIntegrationSettings } from "./community-telegram-integration.types";

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
for (const key of ["Event", "HTMLInputElement", "HTMLTextAreaElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}

const { cleanup, render } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

describe("CommunityTelegramIntegrationPage", () => {
  test("renders the durable join link and QR code when available", () => {
    const settings = createDefaultTelegramIntegrationSettings();
    const joinUrl = "https://pirate.sc/tg/join/com_cmt_test";
    const view = render(
      <CommunityTelegramIntegrationPage
        joinUrl={joinUrl}
        settings={{
          ...settings,
          linkedChat: {
            ...settings.linkedChat,
            status: "connected",
            chatTitle: "Test Telegram",
            chatUsername: "testtelegram",
            chatType: "supergroup",
            botAdminStatus: "ready",
          },
        }}
        submitState={{ kind: "idle" }}
      />,
    );

    expect(view.getByText(joinUrl)).not.toBeNull();
    expect(view.getByRole("img", { name: "Telegram join QR code" })).not.toBeNull();
    view.unmount();
  });

  test("renders welcome intro fields before a chat is connected", () => {
    const settings = createDefaultTelegramIntegrationSettings();
    const view = render(
      <CommunityTelegramIntegrationPage
        settings={settings}
        submitState={{ kind: "idle" }}
      />,
    );

    expect(view.getByLabelText("English welcome intro")).not.toBeNull();
    expect(view.getByLabelText("Georgian welcome intro")).not.toBeNull();
    expect(view.queryByText("Join link")).toBeNull();
    view.unmount();
  });
});
