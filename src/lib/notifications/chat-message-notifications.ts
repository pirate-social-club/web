"use client";

import type { NotificationFeedItem } from "@pirate/api-contracts";

const LEGACY_STORAGE_KEY = "pirate.web.xmtp.notifications.v1";
const STORAGE_KEY = "pirate.web.chat.notifications.v1";
const MAX_ITEMS = 50;

type StoredChatNotification = {
  conversationId: string;
  createdAt: string;
  eventId: string;
  senderLabel: string;
  targetPath: string;
  transport: "assistant" | "xmtp";
};

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readItems(): StoredChatNotification[] {
  const store = storage();
  const raw = store?.getItem(STORAGE_KEY) ?? store?.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredChatNotification[];
    const items = Array.isArray(parsed)
      ? parsed.filter((item) => item.eventId && item.conversationId)
      : [];
    if (store?.getItem(STORAGE_KEY) == null && items.length > 0) {
      writeItems(items.map((item) => ({
        ...item,
        transport: item.transport === "assistant" ? "assistant" : "xmtp",
      })));
      store?.removeItem(LEGACY_STORAGE_KEY);
    }
    return items.map((item) => ({
      ...item,
      transport: item.transport === "assistant" ? "assistant" : "xmtp",
    }));
  } catch {
    return [];
  }
}

function writeItems(items: StoredChatNotification[]): void {
  const store = storage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function addLocalChatNotification(input: {
  conversationId: string;
  messageId: string;
  senderLabel?: string | null;
  targetPath: string;
  transport: "assistant" | "xmtp";
}): void {
  const eventId = `${input.transport}:${input.messageId}`;
  const current = readItems().filter((item) => item.eventId !== eventId);
  writeItems([{
    conversationId: input.conversationId,
    createdAt: new Date().toISOString(),
    eventId,
    senderLabel: input.senderLabel?.trim() || "New message",
    targetPath: input.targetPath,
    transport: input.transport,
  }, ...current]);
}

export function listLocalChatNotificationItems(): NotificationFeedItem[] {
  return readItems().map((item) => ({
    event: {
      actor_user_id: null,
      created_at: item.createdAt,
      event_id: item.eventId,
      object_id: item.conversationId,
      object_type: item.transport === "assistant" ? "assistant_conversation" : "xmtp_conversation",
      payload: {
        actor_display_name: item.senderLabel,
        target_path: item.targetPath,
      },
      subject_id: item.conversationId,
      subject_type: item.transport === "assistant" ? "assistant_conversation" : "xmtp_conversation",
      type: item.transport === "assistant" ? "assistant_message" : "xmtp_message",
    },
    receipt: {
      created_at: item.createdAt,
      event_id: item.eventId,
      recipient_user_id: "local",
      read_at: null,
      seen_at: null,
    },
  }) as NotificationFeedItem);
}
