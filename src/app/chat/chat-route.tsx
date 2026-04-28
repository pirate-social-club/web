"use client";

import * as React from "react";

import { ChatPageView } from "@/app/chat/chat-page-view";
import { useChatController } from "@/app/chat/use-chat-controller";
import { RouteLoadingState } from "@/app/route-loading-states";
import { ChatSetupState } from "@/components/compositions/chat/chat-route-views";
import type { ChatNavigationAdapter, ChatSurface } from "@/lib/chat/chat-navigation";
import type { ChatRouteMode } from "@/lib/chat/chat-types";

export type { ChatNavigationAdapter, ChatSurface } from "@/lib/chat/chat-navigation";

export function ChatPage({
  mode,
  navigation,
  surface = "route",
}: {
  mode: ChatRouteMode;
  navigation?: ChatNavigationAdapter;
  surface?: ChatSurface;
}) {
  const controller = useChatController({ mode, navigation, surface });

  if (!controller.clientHydrated) {
    return <RouteLoadingState />;
  }

  if (!controller.session) {
    return <ChatSetupState {...controller.signInSetupProps} />;
  }

  return <ChatPageView {...controller.viewProps} />;
}

export function ChatListPage() {
  return <ChatPage mode={{ kind: "list" }} />;
}

export function ChatNewPage() {
  return <ChatPage mode={{ kind: "new" }} />;
}

export function ChatConversationPage({ conversationId }: { conversationId: string }) {
  return <ChatPage mode={{ kind: "conversation", conversationId }} />;
}

export function ChatTargetPage({ target }: { target: string }) {
  return <ChatPage mode={{ kind: "target", target }} />;
}
