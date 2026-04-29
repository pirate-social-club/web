import "@/test/setup-runtime";

import { describe, expect, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConversationList, ThreadView } from "./chat-route-views";
import type { ChatConversation, ChatMessageRecord } from "@/lib/chat/chat-types";

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

  test("renders unread count badges without letting previews collide with the badge", () => {
    const markup = renderList([
      conversation({
        id: "unread",
        preview: "A very long preview that needs to truncate before the unread message count badge",
        title: "Unread",
        unreadCount: 128,
        updatedAt: Date.parse("2026-04-28T11:57:00.000Z"),
      }),
    ]);

    expect(markup).toContain("99+");
    expect(markup).toContain("128 unread messages");
    expect(markup).toContain("notification-count-badge");
    expect(markup).toContain("min-w-0 flex-1 truncate");
    expect(markup).toContain("shrink-0");
  });
});

function renderThread(items: ChatMessageRecord[]) {
  return renderToStaticMarkup(
    <ThreadView
      conversation={conversation({ id: "thread", title: "Thread" })}
      items={items}
      onBack={() => undefined}
      onSend={() => undefined}
      sending={false}
    />,
  );
}

function threadDividerCount(markup: string): number {
  return (markup.match(/text-center text-muted-foreground/g) ?? []).length;
}

describe("ThreadView timestamps", () => {
  test("renders sparse time dividers instead of a timestamp in every message", () => {
    Date.now = () => Date.parse("2026-04-28T12:00:00.000Z");

    try {
      const markup = renderThread([
        {
          content: "First",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 28, 11, 0).getTime(),
          id: "1",
          sender: "peer",
        },
        {
          content: "Second",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 28, 11, 3).getTime(),
          id: "2",
          sender: "user",
        },
        {
          content: "Later",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 28, 11, 25).getTime(),
          id: "3",
          sender: "peer",
        },
      ]);

      expect(markup).toContain("First");
      expect(markup).toContain("Second");
      expect(markup).toContain("Later");
      expect(threadDividerCount(markup)).toBe(2);
      expect(markup).toContain("sr-only");
    } finally {
      Date.now = originalDateNow;
    }
  });

  test("shows a divider when the calendar day changes even under the gap threshold", () => {
    Date.now = () => new Date(2026, 3, 29, 0, 10).getTime();

    try {
      const markup = renderThread([
        {
          content: "Before midnight",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 28, 23, 55).getTime(),
          id: "1",
          sender: "peer",
        },
        {
          content: "After midnight",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 29, 0, 5).getTime(),
          id: "2",
          sender: "user",
        },
      ]);

      expect(markup).toContain("Before midnight");
      expect(markup).toContain("After midnight");
      expect(threadDividerCount(markup)).toBe(2);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test("skips invalid timestamps without rendering epoch labels", () => {
    Date.now = () => new Date(2026, 3, 28, 12, 0).getTime();

    try {
      const markup = renderThread([
        {
          content: "Missing timestamp",
          conversationId: "thread",
          createdAt: 0,
          id: "1",
          sender: "peer",
        },
        {
          content: "Valid timestamp",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 28, 12, 5).getTime(),
          id: "2",
          sender: "user",
        },
      ]);

      expect(markup).toContain("Missing timestamp");
      expect(markup).toContain("Valid timestamp");
      expect(threadDividerCount(markup)).toBe(1);
      expect(markup.includes("Jan 1")).toBe(false);
      expect(markup.includes("1970")).toBe(false);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test("labels yesterday and cross-year dividers with date context", () => {
    Date.now = () => new Date(2026, 3, 28, 12, 0).getTime();

    try {
      const markup = renderThread([
        {
          content: "Yesterday message",
          conversationId: "thread",
          createdAt: new Date(2026, 3, 27, 12, 0).getTime(),
          id: "1",
          sender: "peer",
        },
        {
          content: "Last year message",
          conversationId: "thread",
          createdAt: new Date(2025, 11, 31, 23, 0).getTime(),
          id: "2",
          sender: "user",
        },
      ]);

      expect(markup).toContain("Yesterday");
      expect(markup).toContain("2025");
    } finally {
      Date.now = originalDateNow;
    }
  });

  test("formats common assistant markdown instead of showing raw markers", () => {
    const markup = renderThread([
      {
        content: "**Important**\n- Use `Pirate` chat",
        conversationId: "thread",
        createdAt: new Date(2026, 3, 28, 11, 0).getTime(),
        id: "markdown",
        sender: "peer",
      },
    ]);

    expect(markup).toContain("<strong");
    expect(markup).toContain("Important</strong>");
    expect(markup).toContain("<code");
    expect(markup).toContain("Pirate</code>");
    expect(markup.includes("**Important**")).toBe(false);
    expect(markup.includes("`Pirate`")).toBe(false);
  });
});
