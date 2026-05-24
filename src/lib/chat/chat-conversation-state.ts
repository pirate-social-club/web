"use client";

import { getErrorMessage } from "@/lib/error-utils";
import { getAssistantConversation } from "@/lib/chat/chat-assistant-client";
import type { ChatConversation } from "@/lib/chat/chat-types";

export function sortConversations(conversations: readonly ChatConversation[]): ChatConversation[] {
  return conversations.toSorted((left, right) => {
    if (left.transport === "assistant" && right.transport !== "assistant") return -1;
    if (left.transport !== "assistant" && right.transport === "assistant") return 1;
    return right.updatedAt - left.updatedAt;
  });
}

export function upsertConversation(
  conversations: readonly ChatConversation[],
  conversation: ChatConversation,
): ChatConversation[] {
  return sortConversations([
    conversation,
    ...conversations.filter((item) => item.id !== conversation.id),
  ]);
}

export function mergeTransportConversations(
  assistantConversation: ChatConversation | readonly ChatConversation[] | null,
  xmtpConversations: readonly ChatConversation[],
): ChatConversation[] {
  const assistantConversations = Array.isArray(assistantConversation)
    ? assistantConversation
    : assistantConversation
      ? [assistantConversation]
      : [];
  return sortConversations([
    ...assistantConversations,
    ...xmtpConversations.filter((item) => item.transport === "xmtp"),
  ]);
}

export function buildVisibleConversations({
  conversations,
}: {
  conversations: readonly ChatConversation[];
}): ChatConversation[] {
  return [...conversations];
}

export function assistantConversationForAvailability(): ChatConversation {
  return getAssistantConversation();
}
