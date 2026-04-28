"use client";

import { getErrorMessage } from "@/lib/error-utils";
import { getAssistantConversation } from "@/lib/chat/chat-assistant-client";
import type { ChatConversation } from "@/lib/chat/chat-types";

export function sortConversations(conversations: readonly ChatConversation[]): ChatConversation[] {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
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
  assistantConversation: ChatConversation | null,
  xmtpConversations: readonly ChatConversation[],
): ChatConversation[] {
  return sortConversations([
    ...(assistantConversation ? [assistantConversation] : []),
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
