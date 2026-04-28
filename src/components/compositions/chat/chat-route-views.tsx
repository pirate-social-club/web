"use client";

import * as React from "react";
import {
  ArrowLeft,
  ChatCircleText,
  PaperPlaneRight,
  Plus,
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

function isValidTimestamp(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp > 0;
}

function formatTime(timestamp: number): string {
  if (!isValidTimestamp(timestamp)) return "";

  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern = /(\*\*([^*\n]+)\*\*|`([^`\n]+)`)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    if (match[2]) {
      nodes.push(<strong key={`strong-${match.index}`} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.92em]"
        >
          {match[3]}
        </code>,
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.length > 0 ? nodes : [text];
}

function ChatMessageContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);

  return (
    <div className="grid gap-2 break-words [overflow-wrap:anywhere]">
      {lines.map((line, index) => {
        const bullet = line.match(/^\s*[-*]\s+(.+)$/);

        if (bullet) {
          return (
            <div className="flex gap-2" key={`${index}-${line}`}>
              <span aria-hidden className="select-none">•</span>
              <span className="min-w-0">{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        return (
          <p key={`${index}-${line}`} className="min-w-0">
            {line ? renderInlineMarkdown(line) : "\u00a0"}
          </p>
        );
      })}
    </div>
  );
}

function formatListTime(timestamp: number): string {
  if (!isValidTimestamp(timestamp)) return "";

  const now = Date.now();
  const diff = now - timestamp;
  const oneMinute = 1000 * 60;
  const oneHour = oneMinute * 60;
  const oneDay = 1000 * 60 * 60 * 24;

  if (diff < oneMinute) {
    return "now";
  }

  if (diff < oneHour) {
    return `${Math.floor(diff / oneMinute)}m`;
  }

  if (diff < oneDay) {
    return `${Math.floor(diff / oneHour)}h`;
  }

  if (diff < oneDay * 7) {
    return `${Math.floor(diff / oneDay)}d`;
  }

  if (diff < oneDay * 365) {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatSetupState({
  busy = false,
  description,
  error,
  onRetry,
  retryLabel = "Retry",
  title,
}: {
  busy?: boolean;
  description: string;
  error?: string | null;
  onRetry: () => void;
  retryLabel?: string;
  title: string;
}) {
  return (
    <section className="grid h-full min-h-0 w-full flex-1 place-items-center bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-8 px-5 pb-5 pt-5 text-start sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-8 sm:pb-8 sm:pt-8">
          <div className="space-y-5 pr-10 text-start">
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
  return (
    <aside className={cn("flex h-full min-h-0 flex-col border-r border-border-soft bg-background md:bg-card", className)}>
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-background px-4 py-4 md:bg-card">
          <Type as="h1" variant="h3">Messages</Type>
          <IconButton aria-label="New conversation" onClick={onNew} variant="ghost">
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
            <Type as="p" variant="body" className="text-muted-foreground">No messages yet.</Type>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conversation) => {
              const timestampLabel = formatListTime(conversation.updatedAt);
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted active:bg-muted",
                    activeConversationId === conversation.id && "bg-muted",
                  )}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  type="button"
                >
                  <Avatar fallback={conversation.title} size="lg" src={conversation.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Type as="span" variant="body-strong" className={cn("truncate", conversation.unreadCount > 0 && "font-bold")}>
                        {conversation.title}
                      </Type>
                      {timestampLabel ? (
                        <Type as="span" variant="caption" className="shrink-0 whitespace-nowrap">
                          {timestampLabel}
                        </Type>
                      ) : null}
                    </div>
                    <Type as="span" variant="caption" className={cn("block truncate", conversation.unreadCount > 0 && "font-medium text-foreground/90")}>
                      {conversation.preview}
                    </Type>
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

  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {!hideHeader ? (
        <div className="flex items-center gap-3 border-b border-border-soft bg-background px-4 py-4 md:bg-card">
          {onClose ? (
            <Button aria-label="Close" onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label="Back" onClick={onBack} size="icon" variant="ghost">
              <ArrowLeft aria-hidden className="size-5" />
            </Button>
          )}
          <Type as="h1" variant="h3">New message</Type>
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
          <Type as="span" variant="label">To</Type>
          <Input
            autoCapitalize="none"
            autoComplete="off"
            onChange={(event) => setTarget(event.target.value)}
            placeholder="name.pirate, name.eth, or 0x..."
            value={target}
          />
        </label>
        {error ? (
          <Type as="p" variant="body" className="text-destructive">{error}</Type>
        ) : null}
        <Button disabled={!isChatTarget(target)} loading={busy} type="submit">
          Open chat
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
  const seededInitialDraftRef = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
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
            <Button aria-label="Close" className="md:hidden" onClick={onClose} size="icon" variant="ghost">
              <X aria-hidden className="size-5" />
            </Button>
          ) : (
            <Button aria-label="Back" className="md:hidden" onClick={onBack} size="icon" variant="ghost">
              <ArrowLeft aria-hidden className="size-5" />
            </Button>
          )}
          {profileHref && onOpenProfile ? (
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => onOpenProfile(profileHref)}
              type="button"
            >
              {conversation ? <Avatar fallback={conversation.title} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? "Conversation"}
                </Type>
                {conversation?.targetLabel ? (
                  <Type as="p" variant="caption" className="truncate">{conversation.targetLabel}</Type>
                ) : null}
              </div>
            </button>
          ) : (
            <>
              {conversation ? <Avatar fallback={conversation.title} size="sm" src={conversation.avatarUrl} /> : null}
              <div className="min-w-0 flex-1">
                <Type as="h1" variant="h4" className="truncate">
                  {conversation?.title ?? "Conversation"}
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
            <Type as="p" variant="body" className="text-muted-foreground">Start the conversation.</Type>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {items.map((message) => {
              const timestampLabel = formatTime(message.createdAt);
              return (
                <div
                  className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}
                  key={message.id}
                >
                  <div
                    className={cn(
                      "min-w-0 max-w-[78%] rounded-[var(--radius-lg)] px-4 py-3",
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground",
                    )}
                  >
                    <Type
                      as="div"
                      variant="body"
                      className={cn(
                        message.sender === "user" ? "text-primary-foreground" : undefined,
                      )}
                    >
                      <ChatMessageContent content={message.content} />
                    </Type>
                    {timestampLabel ? (
                      <Type as="p" variant="caption" className={cn("pt-1", message.sender === "user" && "text-primary-foreground/80")}>
                        {timestampLabel}
                      </Type>
                    ) : null}
                  </div>
                </div>
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
          aria-label="Message"
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
          placeholder="Message"
          rows={1}
          value={draft}
        />
        <Button aria-label="Send message" className="shrink-0" disabled={!draft.trim() || !conversation} loading={sending} size="icon" type="submit">
          <PaperPlaneRight aria-hidden className="size-5" weight="fill" />
        </Button>
      </form>
    </section>
  );
}

export function EmptyThread({ onNew }: { onNew: () => void }) {
  return (
    <section className="hidden h-full min-h-0 place-items-center bg-background px-4 text-center md:grid">
      <div className="grid max-w-md gap-4">
        <ChatCircleText aria-hidden className="mx-auto size-12 text-muted-foreground" />
        <Type as="h1" variant="h2">Select a conversation</Type>
        <Button onClick={onNew} variant="secondary">New conversation</Button>
      </div>
    </section>
  );
}
