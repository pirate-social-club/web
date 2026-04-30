import * as React from "react";

import type { ChatMessageRecord } from "@/lib/chat/chat-types";

function isValidTimestamp(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp > 0;
}

const THREAD_TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatTime(timestamp: number, locale?: string): string {
  if (!isValidTimestamp(timestamp)) return "";

  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatThreadTimeDivider(
  timestamp: number,
  nowTimestamp: number,
  locale?: string,
  yesterdayLabel = "Yesterday",
): string {
  if (!isValidTimestamp(timestamp)) return "";

  const messageDate = new Date(timestamp);
  const now = new Date(nowTimestamp);
  const startOfMessageDay = startOfLocalDay(timestamp);
  const startOfToday = startOfLocalDay(nowTimestamp);
  const oneDay = 1000 * 60 * 60 * 24;
  const time = formatTime(timestamp, locale);

  if (startOfMessageDay === startOfToday) {
    return time;
  }

  if (startOfMessageDay === startOfToday - oneDay) {
    return `${yesterdayLabel} ${time}`;
  }

  const date = messageDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(messageDate.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${date}, ${time}`;
}

export function shouldShowThreadTimeDivider(
  message: ChatMessageRecord,
  previousMessage: ChatMessageRecord | undefined,
): boolean {
  if (!isValidTimestamp(message.createdAt)) return false;
  if (!previousMessage || !isValidTimestamp(previousMessage.createdAt)) return true;
  if (startOfLocalDay(message.createdAt) !== startOfLocalDay(previousMessage.createdAt)) return true;
  return message.createdAt - previousMessage.createdAt >= THREAD_TIME_DIVIDER_GAP_MS;
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
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-base"
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

export function ChatMessageContent({ content }: { content: string }) {
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

export function formatListTime(timestamp: number, nowLabel = "now"): string {
  if (!isValidTimestamp(timestamp)) return "";

  const now = Date.now();
  const diff = now - timestamp;
  const oneMinute = 1000 * 60;
  const oneHour = oneMinute * 60;
  const oneDay = 1000 * 60 * 60 * 24;

  if (diff < oneMinute) {
    return nowLabel;
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

export function normalizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
