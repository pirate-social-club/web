"use client";

import * as React from "react";

import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import {
  ChatSetupState,
  ConversationList,
  EmptyThread,
  NewConversationView,
  ThreadView,
} from "@/components/compositions/chat/chat-route-views";
import type { ChatNavigationAdapter, ChatSurface } from "@/lib/chat/chat-navigation";
import type {
  ChatConversation,
  ChatMessageRecord,
  ChatRouteMode,
} from "@/lib/chat/chat-types";
import { cn } from "@/lib/utils";
import { useRouteMessages } from "@/hooks/use-route-messages";

export function ChatPageView({
  activeConversation,
  activeConversationId,
  chatNavigation,
  error,
  handleCloseMobileChat,
  handleSend,
  initialDraft,
  isMobile,
  isMobileStandalone,
  listLoadingState,
  listRefreshingState,
  listVisibleConversations,
  mode,
  openTarget,
  routeBusy,
  sending,
  shouldRenderXmtpSetupState,
  showList,
  showThread,
  surface,
  threadConversation,
  threadItems,
  threadLoading,
  xmtpThreadSetupState,
}: ChatPageViewProps) {
  const threadKey = mode.kind === "conversation"
    ? mode.conversationId
    : mode.kind === "target"
      ? mode.target
      : "new";

  const threadContent = (
    <>
      {showList ? (
        <div className={cn("h-full min-h-0 w-full md:w-80 lg:w-96", !isMobile && "shrink-0")}>
          <ConversationList
            activeConversationId={activeConversationId}
            className={isMobile ? "border-r-0 bg-background" : undefined}
            conversations={listVisibleConversations}
            hideHeader={isMobile && mode.kind === "list"}
            loading={listLoadingState}
            refreshing={listRefreshingState}
            onNew={chatNavigation.openNew}
            onSelect={chatNavigation.openConversation}
          />
        </div>
      ) : null}
      <div className={cn("min-h-0 min-w-0 flex-1", !showThread && "hidden md:block")}>
        {mode.kind === "new" ? (
          shouldRenderXmtpSetupState ? xmtpThreadSetupState : (
            <NewConversationView
              busy={routeBusy}
              error={error}
              hideHeader={isMobileStandalone}
              onBack={chatNavigation.openList}
              onClose={isMobileStandalone ? handleCloseMobileChat : undefined}
              onSubmit={openTarget}
            />
          )
        ) : shouldRenderXmtpSetupState ? (
          xmtpThreadSetupState
        ) : activeConversation || mode.kind === "conversation" || mode.kind === "target" ? (
          <ThreadView
            key={threadKey}
            conversation={threadConversation}
            error={error}
            hideHeader={isMobileStandalone}
            initialDraft={initialDraft}
            items={threadItems}
            loading={threadLoading}
            onBack={chatNavigation.openList}
            onClose={isMobileStandalone ? handleCloseMobileChat : undefined}
            onOpenProfile={chatNavigation.openProfile}
            onSend={handleSend}
            sending={sending}
          />
        ) : (
          <EmptyThread onNew={chatNavigation.openNew} />
        )}
      </div>
    </>
  );

  const { copy } = useRouteMessages();
  const chat = copy.chat;

  if (isMobileStandalone) {
    const headerTitle = shouldRenderXmtpSetupState
      ? chat.verifyWalletTitle
      : mode.kind === "new" ? chat.newMessageTitle : (activeConversation?.title ?? chat.conversationFallbackTitle);
    const headerProfileHref = mode.kind === "new" ? null : activeConversation?.profileHref ?? null;
    return (
      <div className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={handleCloseMobileChat}
          onTitleClick={headerProfileHref ? () => chatNavigation.openProfile(headerProfileHref) : undefined}
          title={headerTitle}
          titleAvatarFallback={activeConversation?.title}
          titleAvatarSeed={activeConversation?.avatarSeed ?? activeConversation?.peerAddress}
          titleAvatarSrc={activeConversation?.avatarUrl}
        />
        <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden bg-background pt-[calc(env(safe-area-inset-top)+4rem)] md:max-w-6xl">
          {threadContent}
        </div>
      </div>
    );
  }

  return (
    <section className={cn(
      "flex min-h-0 w-full flex-1 overflow-hidden bg-background",
      surface === "widget" && "h-full",
    )}>
      <div className={cn(
        "mx-auto flex min-h-0 w-full overflow-hidden border-border-soft bg-background",
        surface === "route" && "max-w-6xl md:rounded-[var(--radius-xl)] md:border md:shadow-sm",
        surface === "widget" && "h-full",
      )}>
        {threadContent}
      </div>
    </section>
  );
}

export type ChatPageViewProps = {
  activeConversation: ChatConversation | null;
  activeConversationId: string | null;
  chatNavigation: ChatNavigationAdapter;
  error: string | null;
  handleCloseMobileChat: () => void;
  handleSend: (content: string) => void;
  initialDraft?: string;
  isMobile: boolean;
  isMobileStandalone: boolean;
  listLoadingState: boolean;
  listRefreshingState: boolean;
  listVisibleConversations: ChatConversation[];
  mode: ChatRouteMode;
  openTarget: (target: string) => void;
  routeBusy: boolean;
  sending: boolean;
  shouldRenderXmtpSetupState: boolean;
  showList: boolean;
  showThread: boolean;
  surface: ChatSurface;
  threadConversation: ChatConversation | null;
  threadItems: ChatMessageRecord[];
  threadLoading: boolean;
  xmtpThreadSetupState: React.ReactElement<typeof ChatSetupState> | null;
};
