"use client";

export type ChatTransport = "xmtp" | "assistant";

export interface ChatConversation {
  assistantKind?: "bedsheet";
  avatarSeed?: string;
  avatarUrl?: string;
  id: string;
  peerAddress?: `0x${string}`;
  preview: string;
  profileHref?: string;
  targetLabel?: string;
  title: string;
  transport: ChatTransport;
  unreadCount: number;
  updatedAt: number;
}

export interface ChatMessageRecord {
  content: string;
  conversationId: string;
  createdAt: number;
  id: string;
  sender: "peer" | "user";
}

export type ChatRouteMode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "conversation"; conversationId: string }
  | { kind: "target"; initialDraft?: string; target: string };
