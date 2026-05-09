"use client";

import * as React from "react";

import {
  buildChatConversationPath,
  buildChatListPath,
  buildChatTargetPath,
} from "@/lib/chat/chat-addressing";
import { navigate } from "@/app/router";
import { useIsMobile } from "@/hooks/use-mobile";
import { MOBILE_BREAKPOINT_QUERY } from "@/lib/breakpoints";
import { logger } from "@/lib/logger";

import { useDesktopChatWidget } from "./desktop-chat-widget";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
}

export function useChatLauncher() {
  const desktopChatWidget = useDesktopChatWidget();
  const isMobile = useIsMobile();

  return React.useMemo(() => ({
    openConversation: (conversationId: string) => {
      const usingWidget = !isMobile && !isMobileViewport() && !!desktopChatWidget;
      logger.info("[chat:launcher] open-conversation", { conversationId, usingWidget });
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openConversation(conversationId);
        return;
      }

      navigate(buildChatConversationPath(conversationId));
    },
    openList: () => {
      const usingWidget = !isMobile && !isMobileViewport() && !!desktopChatWidget;
      logger.info("[chat:launcher] open-list", { usingWidget });
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openList();
        return;
      }

      navigate(buildChatListPath());
    },
    openTarget: (target: string, options: { initialMessage?: string } = {}) => {
      const usingWidget = !isMobile && !isMobileViewport() && !!desktopChatWidget;
      logger.info("[chat:launcher] open-target", {
        hasInitialMessage: typeof options.initialMessage === "string" && options.initialMessage.length > 0,
        target,
        usingWidget,
      });
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.openTarget(target, { initialDraft: options.initialMessage });
        return;
      }

      navigate(buildChatTargetPath(target, options));
    },
    toggleList: () => {
      const usingWidget = !isMobile && !isMobileViewport() && !!desktopChatWidget;
      logger.info("[chat:launcher] toggle-list", { usingWidget });
      if (!isMobile && !isMobileViewport() && desktopChatWidget) {
        desktopChatWidget.toggleList();
        return;
      }

      navigate(buildChatListPath());
    },
  }), [desktopChatWidget, isMobile]);
}
