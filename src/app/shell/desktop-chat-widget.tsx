"use client";

import * as React from "react";
import { ChatCircleText, X } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import type { ChatNavigationAdapter } from "@/app/chat/chat-route";
import { IconButton } from "@/components/primitives/icon-button";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatRouteMode } from "@/lib/chat/chat-types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

type DesktopChatWidgetApi = {
  close: () => void;
  openConversation: (conversationId: string) => void;
  openList: () => void;
  openNew: () => void;
  openTarget: (target: string, options?: { initialDraft?: string }) => void;
  toggleList: () => void;
};

const DesktopChatWidgetContext = React.createContext<DesktopChatWidgetApi | null>(null);
const LazyChatPage = React.lazy(async () => {
  const mod = await import("@/app/chat/chat-route");
  return { default: mod.ChatPage };
});

function summarizeMode(mode: ChatRouteMode): Record<string, unknown> {
  switch (mode.kind) {
    case "conversation":
      return { conversationId: mode.conversationId, kind: mode.kind };
    case "target":
      return {
        hasInitialDraft: typeof mode.initialDraft === "string" && mode.initialDraft.length > 0,
        kind: mode.kind,
        target: mode.target,
      };
    default:
      return { kind: mode.kind };
  }
}

export function useDesktopChatWidget() {
  return React.use(DesktopChatWidgetContext);
}

type DesktopChatWidgetFrameProps = {
  children: React.ReactNode;
  className?: string;
  onClose: () => void;
  ref?: React.Ref<HTMLElement>;
  title?: string;
};

export function DesktopChatWidgetFrame({
  children,
  className,
  onClose,
  ref,
  title = "Chats",
}: DesktopChatWidgetFrameProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "fixed bottom-0 end-4 z-50 flex h-[calc(100dvh-6rem)] max-h-[42rem] min-h-96 w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-border bg-background shadow-xl",
        className,
      )}
      ref={ref}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-soft bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <ChatCircleText aria-hidden className="size-6 shrink-0 text-muted-foreground" />
          <Type as="h2" className="truncate" variant="h4">
            {title}
          </Type>
        </div>
        <IconButton aria-label="Close chats" onClick={onClose} size="sm" variant="ghost">
          <X aria-hidden className="size-5" weight="bold" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function DesktopChatWidgetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<ChatRouteMode>({ kind: "list" });
  const isMobile = useIsMobile();

  const close = React.useCallback(() => {
    logger.info("[chat:desktop-widget] close", { mode: summarizeMode(mode) });
    setOpen(false);
  }, [mode]);
  const openMode = React.useCallback((nextMode: ChatRouteMode) => {
    logger.info("[chat:desktop-widget] open-mode", { mode: summarizeMode(nextMode) });
    setMode(nextMode);
    setOpen(true);
  }, []);
  const api = React.useMemo<DesktopChatWidgetApi>(() => ({
    close,
    openConversation: (conversationId) => openMode({ kind: "conversation", conversationId }),
    openList: () => openMode({ kind: "list" }),
    openNew: () => openMode({ kind: "new" }),
    openTarget: (target, options) => openMode({ kind: "target", initialDraft: options?.initialDraft, target }),
    toggleList: () => {
      logger.info("[chat:desktop-widget] toggle-list", { currentlyOpen: open });
      setMode({ kind: "list" });
      setOpen((current) => !current);
    },
  }), [close, open, openMode]);
  const navigation = React.useMemo<ChatNavigationAdapter>(() => ({
    closeMobileChat: close,
    openConversation: api.openConversation,
    openList: api.openList,
    openNew: api.openNew,
    openProfile: (href) => {
      close();
      navigate(href);
    },
  }), [api.openConversation, api.openList, api.openNew, close]);
  const closeFromKeydown = React.useEffectEvent(close);

  React.useEffect(() => {
    if (isMobile && open) {
      logger.info("[chat:desktop-widget] close-mobile-viewport", { wasOpen: open });
      setOpen(false);
    }
  }, [isMobile, open]);

  React.useEffect(() => {
    logger.info("[chat:desktop-widget] state", {
      isMobile,
      mode: summarizeMode(mode),
      open,
    });
  }, [isMobile, mode, open]);

  React.useEffect(() => {
    if (!open || isMobile) return;
    logger.info("[chat:desktop-widget] mount-chat-page", { mode: summarizeMode(mode), surface: "widget" });
    return () => {
      logger.info("[chat:desktop-widget] unmount-chat-page", { mode: summarizeMode(mode), surface: "widget" });
    };
  }, [isMobile, mode, open]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFromKeydown();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <DesktopChatWidgetContext.Provider value={api}>
      {children}
      {open && !isMobile ? (
        <DesktopChatWidgetFrame onClose={close}>
          <React.Suspense fallback={(
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-6" />
            </div>
          )}>
            <LazyChatPage mode={mode} navigation={navigation} surface="widget" />
          </React.Suspense>
        </DesktopChatWidgetFrame>
      ) : null}
    </DesktopChatWidgetContext.Provider>
  );
}
