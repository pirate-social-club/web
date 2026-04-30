"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChatCircleText,
  Check,
  PaperPlaneRight,
  Plus,
  Signature,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import { Avatar } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { StandardModalIconBadge } from "@/components/compositions/system/modal/standard-modal-layout";
import { Input } from "@/components/primitives/input";
import { AutoResizeTextarea } from "@/components/primitives/auto-resize-textarea";
import { Spinner } from "@/components/primitives/spinner";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import { isChatTarget } from "@/lib/chat/chat-addressing";
import type { ChatConversation, ChatMessageRecord } from "@/lib/chat/chat-types";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import {
  ChatMessageContent,
  formatListTime,
  formatThreadTimeDivider,
  formatUnreadCount,
  normalizeUnreadCount,
  shouldShowThreadTimeDivider,
} from "./chat-route-formatting";

export function ChatSetupState({
  busy = false,
  compact = false,
  description,
  error,
  onRetry,
  presentation = "default",
  retryLabel = "Retry",
  title,
}: {
  busy?: boolean;
  compact?: boolean;
  description: string;
  error?: string | null;
  onRetry: () => void;
  presentation?: "default" | "signature";
  retryLabel?: string;
  title: string;
}) {
  if (presentation !== "signature") {
    return (
      <section className="grid h-full min-h-0 w-full flex-1 place-items-center bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex flex-col gap-8 px-5 pb-5 pt-5 text-start sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-8 sm:pb-8 sm:pt-8">
            <div className="space-y-5 pe-10 text-start">
              <div className="flex items-center gap-4">
                <StandardModalIconBadge>
                  <ChatCircleText className="size-8" weight="duotone" />
                </StandardModalIconBadge>
                <Type
                  as="h2"
                  className="min-w-0 text-2xl leading-8 sm:text-3xl sm:leading-tight"
                  variant="h1"
                >
                  {title}
                </Type>
              </div>
              <Type
                as="p"
                className="w-full leading-7 text-foreground sm:leading-8"
                variant="body"
              >
                {description}
              </Type>
            </div>

            <div className="flex flex-col gap-5">
              {error ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <WarningCircle
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    weight="fill"
                  />
                  <Type as="p" className="text-foreground" variant="body">
                    {error}
                  </Type>
                </div>
              ) : null}
              <Button className="h-14 w-full" loading={busy} onClick={onRetry}>
                {retryLabel}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col bg-background sm:grid sm:place-items-center sm:px-4 sm:py-6">
      <div className={cn("mx-auto flex min-h-0 w-full flex-1 flex-col sm:block sm:min-h-0 sm:flex-none", compact ? "max-w-md" : "max-w-2xl")}>
        <div className={cn(
          "flex min-h-0 flex-1 flex-col px-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 text-center sm:min-h-0 sm:flex-none sm:rounded-lg sm:border sm:border-border sm:bg-card sm:text-start",
          compact ? "sm:gap-6 sm:px-6 sm:pb-6 sm:pt-6" : "sm:gap-8 sm:px-8 sm:pb-8 sm:pt-8",
        )}>
          <div className={cn(
            "flex min-h-0 flex-1 flex-col items-center justify-center gap-6 pb-8 sm:min-h-0 sm:flex-none sm:items-start sm:justify-start sm:gap-5 sm:pb-0 sm:pe-10 sm:text-start",
            compact && "sm:pe-0",
          )}>
            <div className="flex flex-col items-center gap-7 sm:flex-row sm:gap-4">
              <div className="relative grid size-32 place-items-center rounded-full border border-foreground/10 bg-card/70 text-primary shadow-[inset_0_1px_24px_rgb(255_255_255_/_0.04)] sm:hidden">
                <Signature className="size-16" weight="duotone" />
                <span className="absolute -bottom-1 -right-1 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Check aria-hidden className="size-7" weight="bold" />
                </span>
              </div>
              <StandardModalIconBadge className={cn("hidden sm:inline-grid", compact && "sm:size-12")}>
                <Signature className="size-8" weight="duotone" />
              </StandardModalIconBadge>
              <Type
                as="h2"
                className={cn(
                  "min-w-0 text-5xl font-bold leading-tight tracking-normal sm:leading-tight",
                  compact ? "sm:text-2xl" : "sm:text-3xl",
                )}
                variant="h1"
              >
                {title}
              </Type>
            </div>
            <Type
              as="p"
              className="mx-auto max-w-72 whitespace-pre-line text-xl leading-9 text-muted-foreground sm:mx-0 sm:max-w-none sm:text-base sm:leading-8 sm:text-foreground"
              variant="body"
            >
              {description}
            </Type>
          </div>

          <div className={cn("flex shrink-0 flex-col gap-5 border-t border-border-soft/60 pt-5 sm:border-t-0 sm:pt-0", compact && "sm:gap-4")}>
            {error ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-start">
                <WarningCircle
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  weight="fill"
                />
                <Type as="p" className="text-foreground" variant="body">
                  {error}
                </Type>
              </div>
            ) : null}
            <Button className={cn("h-16 w-full text-xl sm:text-base", compact ? "sm:h-12" : "sm:h-14")} loading={busy} onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ConversationList({
  activeConversationId,
  className,
  conversations,
  hideHeader,
  loading,
  refreshing = false,
  onNew,
  onSelect,
}: {
  activeConversationId?: string | null;
  className?: string;
  conversations: ChatConversation[];
  hideHeader?: boolean;
  loading: boolean;
  refreshing?: boolean;
  onNew: () => void;
  onSelect: (conversationId: string) => void;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  return (
    <aside className={cn("flex h-full min-h-0 flex-col border-e border-border-soft bg-background md:bg-card", className)}>
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-background px-4 py-4 md:bg-card">
          <Type as="h1" variant="h3">{chat.messagesHeading}</Type>
          <IconButton aria-label={chat.newConversationAriaLabel} onClick={onNew} variant="ghost">
            <Plus aria-hidden className="size-6" weight="bold" />
          </IconButton>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="grid gap-3 px-4 py-8 text-center">
            <ChatCircleText aria-hidden className="mx-auto size-9 text-muted-foreground" />
            <Type as="p" variant="body" className="text-muted-foreground">{chat.noMessagesYet}</Type>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conversation) => {
              const timestampLabel = formatListTime(conversation.updatedAt, chat.now);
              const unreadCount = normalizeUnreadCount(conversation.unreadCount);
              const hasUnread = unreadCount > 0;
              const unreadLabel = unreadCount === 1
                ? chat.unreadMessageCountOne.replace("{count}", String(unreadCount))
                : chat.unreadMessageCount.replace("{count}", String(unreadCount));
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted active:bg-muted",
                    activeConversationId === conversation.id && "bg-muted",
                  )}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  type="button"
                >
                  <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="lg" src={conversation.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Type as="span" variant="body-strong" className={cn("truncate", hasUnread && "font-bold")}>
                        {conversation.title}
                      </Type>
                      {timestampLabel ? (
                        <Type as="span" variant="caption" className="shrink-0 whitespace-nowrap">
                          {timestampLabel}
                        </Type>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <Type as="span" variant="caption" className={cn("block min-w-0 flex-1 truncate", hasUnread && "font-medium text-foreground/90")}>
                        {conversation.preview}
                      </Type>
                      {hasUnread ? (
                        <>
                          <span className="sr-only">{unreadLabel}</span>
                          <span
                            aria-hidden="true"
                            className="notification-count-badge h-5 min-w-5 shrink-0 px-1.5 tabular-nums"
                          >
                            {formatUnreadCount(unreadCount)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
            {refreshing ? (
              <div className="grid place-items-center px-4 py-6">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

export function NewConversationView({
  busy,
  error,
  hideHeader,
  onBack,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  error?: string | null;
  hideHeader?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onSubmit: (target: string) => void;
}) {
  const [target, setTarget] = React.useState("");
  const { isRtl, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {!hideHeader ? (
        <div className="flex items-center gap-3 border-b border-border-soft bg-background px-4 py-4 md:bg-card">
          {onClose ? (
            <Button aria-label={copy.common.close} onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label={copy.common.backHome} onClick={onBack} size="icon" variant="ghost">
              {isRtl ? <ArrowRight aria-hidden className="size-5" /> : <ArrowLeft aria-hidden className="size-5" />}
            </Button>
          )}
          <Type as="h1" variant="h3">{chat.newMessageTitle}</Type>
        </div>
      ) : null}
      <form
        className="mx-auto grid w-full max-w-2xl gap-4 px-4 py-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(target);
        }}
      >
        <label className="grid gap-2">
          <Type as="span" variant="label">{chat.toLabel}</Type>
          <Input
            autoCapitalize="none"
            autoComplete="off"
            onChange={(event) => setTarget(event.target.value)}
            placeholder={chat.recipientPlaceholder}
            value={target}
          />
        </label>
        {error ? (
          <Type as="p" variant="body" className="text-destructive">{error}</Type>
        ) : null}
        <Button disabled={!isChatTarget(target)} loading={busy} type="submit">
          {chat.openChatAction}
        </Button>
      </form>
    </section>
  );
}

export function ThreadView({
  conversation,
  error,
  hideHeader,
  initialDraft,
  items,
  loading,
  onBack,
  onClose,
  onOpenProfile,
  onSend,
  sending,
}: {
  conversation: ChatConversation | null;
  error?: string | null;
  hideHeader?: boolean;
  initialDraft?: string;
  items: ChatMessageRecord[];
  loading?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onOpenProfile?: (href: string) => void;
  onSend: (message: string) => void;
  sending: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const { isRtl, locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  const seededInitialDraftRef = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [renderedAt] = React.useState(() => Date.now());
  const profileHref = conversation?.profileHref;
  const submitDraft = React.useCallback(() => {
    const next = draft.trim();
    if (!next || !conversation || sending) return;
    setDraft("");
    onSend(next);
  }, [conversation, draft, onSend, sending]);

  React.useEffect(() => {
    const nextDraft = initialDraft?.trim();
    if (!nextDraft || draft.trim() || seededInitialDraftRef.current === nextDraft) return;
    seededInitialDraftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [draft, initialDraft]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [items.length, conversation?.id]);

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {!hideHeader ? (
        <div className="flex items-center gap-3 border-b border-border-soft bg-background px-4 py-3 md:bg-card">
          {onClose ? (
            <Button aria-label={copy.common.close} className="md:hidden" onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label={copy.common.backHome} className="md:hidden" onClick={onBack} size="icon" variant="ghost">
              {isRtl ? <ArrowRight aria-hidden className="size-5" /> : <ArrowLeft aria-hidden className="size-5" />}
            </Button>
          )}
          {profileHref && onOpenProfile ? (
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-start"
              onClick={() => onOpenProfile(profileHref)}
              type="button"
            >
              {conversation ? <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? chat.conversationFallbackTitle}
                </Type>
                {conversation?.targetLabel ? (
                  <Type as="p" variant="caption" className="truncate">{conversation.targetLabel}</Type>
                ) : null}
              </div>
            </button>
          ) : (
            <>
              {conversation ? <Avatar fallback={conversation.title} fallbackSeed={conversation.avatarSeed ?? conversation.peerAddress} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? chat.conversationFallbackTitle}
                </Type>
                {conversation?.targetLabel ? (
                  <Type as="p" variant="caption" className="truncate">{conversation.targetLabel}</Type>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
      {error && items.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-border-soft bg-background px-4 py-3 text-destructive md:bg-card">
          <WarningCircle aria-hidden className="size-5 shrink-0" />
          <Type as="p" variant="body" className="text-destructive">{error}</Type>
        </div>
      ) : null}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="grid max-w-sm gap-3">
              <WarningCircle aria-hidden className="mx-auto size-8 text-destructive" />
              <Type as="p" variant="body" className="text-foreground">{error}</Type>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <Type as="p" variant="body" className="text-muted-foreground">{chat.startConversation}</Type>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {items.map((message, index) => {
              const timestampLabel = formatThreadTimeDivider(message.createdAt, renderedAt, undefined, chat.yesterday);
              const showTimeDivider = shouldShowThreadTimeDivider(message, items[index - 1]);
              const sentTimeLabel = timestampLabel ? `Sent ${timestampLabel}.` : "";
              return (
                <React.Fragment key={message.id}>
                  {showTimeDivider && timestampLabel ? (
                    <Type as="div" variant="caption" className="py-1 text-center text-muted-foreground">
                      {timestampLabel}
                    </Type>
                  ) : null}
                  <div
                    className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "relative min-w-0 max-w-[78%] rounded-[var(--radius-lg)] px-4 py-3",
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground",
                      )}
                      title={timestampLabel}
                    >
                      {sentTimeLabel ? <span className="sr-only">{sentTimeLabel}</span> : null}
                      <Type
                        as="div"
                        variant="body"
                        className={cn(
                          message.sender === "user" ? "text-primary-foreground" : undefined,
                        )}
                      >
                        <ChatMessageContent content={message.content} />
                      </Type>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
      <form
        className="flex items-end gap-3 border-t border-border-soft bg-background px-4 py-4 md:bg-card"
        onSubmit={(event) => {
          event.preventDefault();
          submitDraft();
        }}
      >
        <AutoResizeTextarea
          aria-label={chat.messageLabel}
          className="min-h-11 rounded-[var(--radius-2_5xl)] py-2.5 leading-5"
          disabled={!conversation || sending}
          maxRows={5}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }
            event.preventDefault();
            submitDraft();
          }}
          placeholder={chat.messagePlaceholder}
          rows={1}
          value={draft}
        />
        <Button aria-label={chat.sendMessageAriaLabel} className="shrink-0" disabled={!draft.trim() || !conversation} loading={sending} size="icon" type="submit">
          <PaperPlaneRight aria-hidden className="size-5" weight="fill" />
        </Button>
      </form>
    </section>
  );
}

export function EmptyThread({ onNew }: { onNew: () => void }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");
  const chat = copy.chat;
  return (
    <section className="hidden h-full min-h-0 place-items-center bg-background px-4 text-center md:grid">
      <div className="grid max-w-md gap-4">
        <ChatCircleText aria-hidden className="mx-auto size-12 text-muted-foreground" />
        <Type as="h1" variant="h2">{chat.selectConversationTitle}</Type>
        <Button onClick={onNew} variant="secondary">{chat.newConversationAction}</Button>
      </div>
    </section>
  );
}
