"use client";

export type ChatTransport = "xmtp" | "assistant";

export interface ChatConversation {
  assistantKind?: "bedsheet" | "community";
  avatarSeed?: string;
  avatarUrl?: string;
  communityId?: string;
  id: string;
  peerAddress?: `0x${string}`;
  preview: string;
  profileHref?: string;
  targetLabel?: string;
  title: string;
  transport: ChatTransport;
  voiceMode?: "off" | "transcription_only" | "voice_replies";
  voiceRepliesEnabled?: boolean;
  voiceTranscriptionEnabled?: boolean;
  unreadCount: number;
  updatedAt: number;
}

export interface ChatMessageRecord {
  content: string;
  conversationId: string;
  createdAt: number;
  id: string;
  sender: "peer" | "user";
  source?: {
    kind: "voice";
    transcript: string;
    audioRetained: boolean;
  };
}

export type ChatRouteMode =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "conversation"; conversationId: string }
  | { kind: "target"; initialDraft?: string; target: string };
