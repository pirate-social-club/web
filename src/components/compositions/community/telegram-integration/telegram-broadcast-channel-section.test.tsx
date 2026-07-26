import "@/test/setup-runtime";

import * as React from "react";
import { afterEach, describe, expect, mock, test } from "bun:test";

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
for (const key of ["Event", "HTMLInputElement", "Node"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: window[key],
  });
}

// The real dialog primitive is Radix-based and needs more DOM than linkedom
// provides; a passthrough keeps the dialog copy and buttons testable.
mock.module("@/components/primitives/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <>{children}</> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const { cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");
const { TelegramBroadcastChannelSection } = await import("./telegram-broadcast-channel-section");
const { TELEGRAM_CHANNEL_BACKFILL_LIMIT } = await import("./community-telegram-integration.types");

afterEach(() => {
  cleanup();
});

const connectedChannel = {
  title: "Pirate News",
  username: "piratenews",
  publicationMode: "from_now" as const,
  linkedAt: 1_777_000_000,
};

function futureExpiry(): number {
  return Math.floor(Date.now() / 1000) + 600;
}

describe("TelegramBroadcastChannelSection", () => {
  test("renders a skeleton while loading instead of flashing Not connected", () => {
    const view = render(
      <TelegramBroadcastChannelSection botConnected state={{ kind: "loading" }} />,
    );

    expect(view.getByRole("heading", { name: "Broadcast channel" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Connect channel" })).toBeNull();
    expect(view.queryByText(/Not connected/)).toBeNull();
    view.unmount();
  });

  test("renders the disconnected state with a connect action", () => {
    const connects: string[] = [];
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onConnect={() => connects.push("connect")}
        state={{ kind: "unconnected" }}
      />,
    );

    expect(view.queryByText("Connect the community bot first.")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Connect channel" }));
    expect(connects).toEqual(["connect"]);
    view.unmount();
  });

  test("warns when the community bot is not connected yet", () => {
    const view = render(
      <TelegramBroadcastChannelSection botConnected={false} state={{ kind: "unconnected" }} />,
    );

    expect(view.getByText("Connect the community bot first.")).toBeTruthy();
    view.unmount();
  });

  test("renders the waiting state with open, check, and cancel actions", () => {
    const calls: string[] = [];
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onCancelSetup={() => calls.push("cancel")}
        onCheckConnection={() => calls.push("check")}
        onOpenTelegramAgain={() => calls.push("open")}
        state={{
          kind: "awaiting_telegram",
          checking: false,
          deepLink: "https://t.me/pirate_bot?start=tgchan_test",
          expiresAt: futureExpiry(),
        }}
      />,
    );

    expect(view.getByText("Complete the connection in Telegram.")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Open Telegram again" }));
    fireEvent.click(view.getByRole("button", { name: "Check connection" }));
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    expect(calls).toEqual(["open", "check", "cancel"]);
    view.unmount();
  });

  test("offers Start again once the intent expires", () => {
    const calls: string[] = [];
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onConnect={() => calls.push("connect")}
        state={{
          kind: "awaiting_telegram",
          checking: false,
          deepLink: "https://t.me/pirate_bot?start=tgchan_test",
          expiresAt: Math.floor(Date.now() / 1000) - 5,
        }}
      />,
    );

    expect(view.getByText("This connection request expired.")).toBeTruthy();
    expect(view.queryByRole("button", { name: "Open Telegram again" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Start again" }));
    expect(calls).toEqual(["connect"]);
    view.unmount();
  });

  test("flips to the expired state when the intent TTL elapses", async () => {
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        state={{
          kind: "awaiting_telegram",
          checking: false,
          deepLink: "https://t.me/pirate_bot?start=tgchan_test",
          expiresAt: Math.floor(Date.now() / 1000) + 1,
        }}
      />,
    );

    expect(view.getByText("Complete the connection in Telegram.")).toBeTruthy();
    await waitFor(() => expect(view.getByText("This connection request expired.")).toBeTruthy(), {
      timeout: 2500,
    });
    view.unmount();
  });

  test("renders the connected channel with username and publish on", () => {
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        state={{ kind: "connected", channel: connectedChannel }}
      />,
    );

    expect(view.getByRole("heading", { name: "Pirate News" })).toBeTruthy();
    expect(view.getByText("@piratenews")).toBeTruthy();
    expect(view.getByText("Automatically publish new posts")).toBeTruthy();
    expect(view.getByText("on")).toBeTruthy();
    expect(view.getByRole("button", { name: "Publish recent posts" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Disconnect" })).toBeTruthy();
    view.unmount();
  });

  test("renders the connected channel without a username and publish off", () => {
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        state={{
          kind: "connected",
          channel: { ...connectedChannel, publicationMode: "off", username: null },
        }}
      />,
    );

    expect(view.getByRole("heading", { name: "Pirate News" })).toBeTruthy();
    expect(view.queryByText(/^@/)).toBeNull();
    expect(view.getByText("off")).toBeTruthy();
    view.unmount();
  });

  test("asks for confirmation before publishing recent posts", () => {
    const calls: string[] = [];
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onCancelBackfill={() => calls.push("cancel")}
        onConfirmBackfill={() => calls.push("confirm")}
        state={{ kind: "backfill_confirm", channel: connectedChannel }}
      />,
    );

    expect(view.getByText("Publish recent posts to Telegram?")).toBeTruthy();
    expect(view.getByText(new RegExp(
      `Pirate will publish up to ${TELEGRAM_CHANNEL_BACKFILL_LIMIT} eligible posts.*oldest first.*Only public, non-adult posts are included.*Locked content uses its preview.`,
    ))).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Publish posts" }));
    expect(calls).toEqual(["confirm"]);
    view.unmount();
  });

  test("reports the backfill as queued, never published, and disables repeats", () => {
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        state={{ kind: "backfill_queued", channel: connectedChannel, enqueued: 20 }}
      />,
    );

    expect(view.getByText("20 posts queued for publication. They will appear gradually in Telegram.")).toBeTruthy();
    expect(view.queryByText(/published/i)).toBeNull();
    const publishButton = view.getByRole("button", { name: "Publish recent posts" });
    expect(publishButton.hasAttribute("disabled")).toBe(true);
    view.unmount();
  });

  test("asks for confirmation before disconnecting", () => {
    const calls: string[] = [];
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onConfirmDisconnect={() => calls.push("confirm")}
        state={{ kind: "disconnect_confirm", channel: connectedChannel }}
      />,
    );

    expect(view.getByText("Disconnect Telegram channel?")).toBeTruthy();
    expect(view.getByText(
      "Pirate will stop publishing new posts. Existing Telegram channel posts will remain visible.",
    )).toBeTruthy();

    // The connected panel also has a Disconnect button; the dialog's is the last one.
    const disconnectButtons = view.getAllByRole("button", { name: "Disconnect" });
    fireEvent.click(disconnectButtons[disconnectButtons.length - 1]!);
    expect(calls).toEqual(["confirm"]);
    view.unmount();
  });

  test("surfaces connect errors without losing the connect action", () => {
    const view = render(
      <TelegramBroadcastChannelSection
        botConnected
        onConnect={() => undefined}
        state={{ kind: "error", channel: null, message: "Select a Telegram broadcast channel." }}
      />,
    );

    expect(view.getByText("Select a Telegram broadcast channel.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Connect channel" })).toBeTruthy();
    view.unmount();
  });
});
