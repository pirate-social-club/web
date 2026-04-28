import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConversationList } from "./chat-route-views";
import type { ChatConversation } from "@/lib/chat/chat-types";

const originalDateNow = Date.now;

function renderList(conversations: ChatConversation[]) {
  return renderToStaticMarkup(
    <ConversationList
      conversations={conversations}
      loading={false}
      onNew={() => undefined}
      onSelect={() => undefined}
    />,
  );
}

function conversation(overrides: Partial<ChatConversation>): ChatConversation {
  return {
    id: "bedsheet",
    preview: "Ask Bedsheet about Pirate",
    title: "Bedsheet",
    transport: "assistant",
    unreadCount: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("ConversationList timestamps", () => {
  test("does not render the Unix epoch for conversations without activity", () => {
    const markup = renderList([conversation({ updatedAt: 0 })]);

    expect(markup).toContain("Bedsheet");
    expect(markup.includes("Jan 1")).toBe(false);
    expect(markup.includes("1970")).toBe(false);
  });

  test("renders compact relative labels for recent conversations", () => {
    Date.now = () => Date.parse("2026-04-28T12:00:00.000Z");

    try {
      const markup = renderList([
        conversation({
          id: "recent",
          title: "Recent",
          updatedAt: Date.parse("2026-04-28T11:57:00.000Z"),
        }),
        conversation({
          id: "older",
          title: "Older",
          updatedAt: Date.parse("2026-04-26T12:00:00.000Z"),
        }),
      ]);

      expect(markup).toContain("3m");
      expect(markup).toContain("2d");
    } finally {
      Date.now = originalDateNow;
    }
  });
});
