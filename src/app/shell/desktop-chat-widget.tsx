"use client";

import * as React from "react";
import { ChatCircleText, X } from "@phosphor-icons/react";

import { navigate } from "@/app/router";
import { ChatPage, type ChatNavigationAdapter } from "@/app/chat/chat-route";
import { IconButton } from "@/components/primitives/icon-button";
import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatRouteMode } from "@/lib/chat/chat-types";
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

export function useDesktopChatWidget() {
  return React.useContext(DesktopChatWidgetContext);
}

export const DesktopChatWidgetFrame = React.forwardRef<HTMLElement, {
  children: React.ReactNode;
  className?: string;
  onClose: () => void;
  title?: string;
}>(({
  children,
  className,
  onClose,
  title = "Chats",
}, ref) => {
  return (
    <section
      aria-label={title}
      className={cn(
        "fixed bottom-4 end-4 z-50 flex h-[calc(100dvh-6rem)] max-h-[42rem] min-h-96 w-[calc(100vw-2rem)] max-w-4xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-background shadow-xl",
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
});
DesktopChatWidgetFrame.displayName = "DesktopChatWidgetFrame";

export function DesktopChatWidgetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<ChatRouteMode>({ kind: "list" });
  const isMobile = useIsMobile();

  const close = React.useCallback(() => setOpen(false), []);
  const openMode = React.useCallback((nextMode: ChatRouteMode) => {
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
      setMode({ kind: "list" });
      setOpen((current) => !current);
    },
  }), [close, openMode]);
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

  React.useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  return (
    <DesktopChatWidgetContext.Provider value={api}>
      {children}
      {open && !isMobile ? (
        <DesktopChatWidgetFrame onClose={close}>
          <ChatPage mode={mode} navigation={navigation} surface="widget" />
        </DesktopChatWidgetFrame>
      ) : null}
    </DesktopChatWidgetContext.Provider>
  );
}
