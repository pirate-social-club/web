import { describe, expect, test } from "bun:test";

import type { ChatConversation } from "./chat-types";
import { mergeTransportConversations, sortConversations } from "./chat-conversation-state";

function conversation(overrides: Partial<ChatConversation>): ChatConversation {
  return {
    id: "conversation",
    preview: "Preview",
    title: "Conversation",
    transport: "xmtp",
    unreadCount: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("chat conversation state", () => {
  test("keeps assistant conversations grouped before XMTP conversations", () => {
    const bedsheet = conversation({
      assistantKind: "bedsheet",
      id: "bedsheet",
      title: "Bedsheet",
      transport: "assistant",
      updatedAt: 100,
    });
    const communityAssistant = conversation({
      assistantKind: "community",
      communityId: "com_test",
      id: "community-assistant:com_test",
      title: "Community",
      transport: "assistant",
      updatedAt: 50,
    });
    const activeXmtp = conversation({
      id: "xmtp-active",
      title: "Active XMTP",
      transport: "xmtp",
      updatedAt: 500,
    });

    expect(sortConversations([activeXmtp, communityAssistant, bedsheet]).map((item) => item.id)).toEqual([
      "bedsheet",
      "community-assistant:com_test",
      "xmtp-active",
    ]);
  });

  test("merges multiple assistant conversations with transport conversations", () => {
    const merged = mergeTransportConversations([
      conversation({ id: "bedsheet", transport: "assistant", updatedAt: 100 }),
      conversation({ id: "community-assistant:com_test", transport: "assistant", updatedAt: 80 }),
    ], [
      conversation({ id: "xmtp-1", transport: "xmtp", updatedAt: 200 }),
      conversation({ id: "ignored-assistant", transport: "assistant", updatedAt: 300 }),
    ]);

    expect(merged.map((item) => item.id)).toEqual([
      "bedsheet",
      "community-assistant:com_test",
      "xmtp-1",
    ]);
  });
});
