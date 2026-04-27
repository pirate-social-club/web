"use client";

import * as React from "react";

import {
  buildChatConversationPath,
  buildChatListPath,
  buildChatTargetPath,
} from "@/app/authenticated-routes/chat/chat-addressing";
import { navigate } from "@/app/router";
import { useIsMobile } from "@/hooks/use-mobile";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";

import { useDesktopChatWidget } from "./desktop-chat-widget";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export function useChatLauncher() {
  const desktopChatWidget = useDesktopChatWidget();
  const isMobile = useIsMobile();

  return React.useMemo(() => ({
    openConversation: (conversationId: string) => {
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openConversation(conversationId);
        return;
      }

      navigate(buildChatConversationPath(conversationId));
    },
    openList: () => {
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openList();
        return;
      }

      navigate(buildChatListPath());
    },
    openTarget: (target: string, options: { initialMessage?: string } = {}) => {
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openTarget(target, { initialDraft: options.initialMessage });
        return;
      }

      navigate(buildChatTargetPath(target, options));
    },
    toggleList: () => {
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.toggleList();
        return;
      }

      navigate(buildChatListPath());
    },
  }), [desktopChatWidget, isMobile]);
}
