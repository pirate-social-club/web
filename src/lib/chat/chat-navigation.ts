"use client";

export interface ChatNavigationAdapter {
  closeMobileChat?: () => void;
  openConversation: (conversationId: string) => void;
  openList: () => void;
  openNew: () => void;
  openProfile: (href: string) => void;
}

export type ChatSurface = "route" | "widget";
