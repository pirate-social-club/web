"use client";

import * as React from "react";
import pirateBrandMarkUrl from "@/assets/logo_ghost_sm.png";
import { getStoredSession, type StoredSession } from "@/lib/api/session-store";
import type { ChatConversation, ChatMessageRecord } from "./chat-types";

export const ASSISTANT_CONVERSATION_ID = "bedsheet";
const ASSISTANT_CACHE_KEY = "pirate.web.chat.assistant.v1";
const ASSISTANT_CACHE_EVENT = "pirate:web:chat-assistant-cache";
const ASSISTANT_AVAILABILITY_TTL_MS = 30_000;
const ASSISTANT_DEFAULT_PREVIEW = "Ask Bedsheet about Pirate";
const ASSISTANT_REQUEST_TIMEOUT_MS = 8_000;

let assistantAvailabilityCache: { available: boolean; checkedAt: number } | null = null;
let assistantAvailabilityInflight: Promise<boolean> | null = null;

type AssistantConversationCache = {
  lastReadAt: number | null;
  preview: string;
  updatedAt: number;
};

type AssistantRequestBody = {
  clientContext?: Record<string, unknown>;
  content: string;
  conversationId: string;
};

type AssistantWelcomeRequestBody = {
  clientContext?: Record<string, unknown>;
  conversationId: string;
};

type AssistantWelcomeResponse = {
  inserted: boolean;
  messages: ChatMessageRecord[];
};

export class AssistantUnavailableError extends Error {
  constructor(message = "Bedsheet is unavailable right now.") {
    super(message);
    this.name = "AssistantUnavailableError";
  }
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function cacheKey(session?: StoredSession | null): string {
  const userId = session?.user.id ?? getStoredSession()?.user.id;
  return userId ? `${ASSISTANT_CACHE_KEY}:${userId}` : ASSISTANT_CACHE_KEY;
}

function defaultCache(): AssistantConversationCache {
  return {
    lastReadAt: null,
    preview: ASSISTANT_DEFAULT_PREVIEW,
    updatedAt: 0,
  };
}

function normalizeAssistantPreview(preview: string): string {
  const trimmed = preview.trim();
  if (!trimmed) {
    return ASSISTANT_DEFAULT_PREVIEW;
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized.includes("assistant is not configured")
    || normalized.includes("model credentials")
    || normalized.includes("pirate team")
    || normalized.includes("bedsheet is unavailable right now")
  ) {
    return ASSISTANT_DEFAULT_PREVIEW;
  }

  return trimmed;
}

function readCache(session?: StoredSession | null): AssistantConversationCache {
  const raw = storage()?.getItem(cacheKey(session));
  if (!raw) return defaultCache();
  try {
    const parsed = JSON.parse(raw) as Partial<AssistantConversationCache>;
    return {
      lastReadAt: typeof parsed.lastReadAt === "number" ? parsed.lastReadAt : null,
      preview: typeof parsed.preview === "string"
        ? normalizeAssistantPreview(parsed.preview)
        : defaultCache().preview,
      updatedAt: typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : defaultCache().updatedAt,
    };
  } catch {
    return defaultCache();
  }
}

function writeCache(cache: AssistantConversationCache, session?: StoredSession | null): void {
  storage()?.setItem(cacheKey(session), JSON.stringify(cache));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ASSISTANT_CACHE_EVENT));
  }
}

function updateCacheFromMessages(
  messages: readonly ChatMessageRecord[],
  session?: StoredSession | null,
): void {
  const latest = messages[messages.length - 1];
  if (!latest) return;
  const current = readCache(session);
  writeCache({
    ...current,
    preview: normalizeAssistantPreview(latest.content) || current.preview,
    updatedAt: latest.createdAt,
  }, session);
}

function markRead(session?: StoredSession | null): void {
  const current = readCache(session);
  writeCache({
    ...current,
    lastReadAt: Date.now(),
  }, session);
}

function unreadCountFor(cache: AssistantConversationCache): number {
  if (!cache.lastReadAt) return cache.updatedAt > 0 ? 1 : 0;
  return cache.updatedAt > cache.lastReadAt ? 1 : 0;
}

function getAssistantUnreadCount(): number {
  return unreadCountFor(readCache());
}

function subscribeAssistantCache(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ASSISTANT_CACHE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(ASSISTANT_CACHE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useAssistantUnreadCount(): number {
  return React.useSyncExternalStore(
    subscribeAssistantCache,
    getAssistantUnreadCount,
    () => 0,
  );
}

function resolveAssistantBaseUrl(hostname?: string | null): string {
  const explicitBaseUrl = import.meta.env.VITE_CHAT_ASSISTANT_BASE_URL;
  if (typeof explicitBaseUrl === "string" && explicitBaseUrl.trim()) {
    return explicitBaseUrl.trim().replace(/\/+$/u, "");
  }

  const resolvedHostname = (hostname
    ?? (typeof window !== "undefined" ? window.location.hostname : ""))
    .trim()
    .toLowerCase();

  if (
    !resolvedHostname
    || resolvedHostname === "localhost"
    || resolvedHostname.endsWith(".localhost")
    || resolvedHostname === "127.0.0.1"
    || resolvedHostname.startsWith("127.")
  ) {
    return "http://127.0.0.1:8791";
  }

  if (
    resolvedHostname === "staging.pirate.sc"
    || resolvedHostname.endsWith(".staging.pirate.sc")
  ) {
    return "https://assistant-staging.pirate.sc";
  }

  return "https://assistant.pirate.sc";
}

async function requestAssistant<T>(
  session: StoredSession,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), ASSISTANT_REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  init?.signal?.addEventListener("abort", forwardAbort, { once: true });
  let response: Response;
  try {
    response = await fetch(`${resolveAssistantBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "authorization": `Bearer ${session.accessToken}`,
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw error instanceof AssistantUnavailableError
      ? error
      : new AssistantUnavailableError();
  } finally {
    globalThis.clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", forwardAbort);
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new AssistantUnavailableError();
    }
    const body = await response.text().catch(() => "");
    throw new Error(body.trim() || `Assistant request failed: ${response.status}`);
  }

  return await response.json() as T;
}

async function fetchAssistantHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${resolveAssistantBaseUrl()}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function isAssistantConversationId(conversationId: string): boolean {
  return conversationId === ASSISTANT_CONVERSATION_ID;
}

export async function probeAssistantAvailability(options?: { force?: boolean }): Promise<boolean> {
  const now = Date.now();
  if (
    !options?.force
    && assistantAvailabilityCache
    && (now - assistantAvailabilityCache.checkedAt) < ASSISTANT_AVAILABILITY_TTL_MS
  ) {
    return assistantAvailabilityCache.available;
  }

  if (!options?.force && assistantAvailabilityInflight) {
    return await assistantAvailabilityInflight;
  }

  assistantAvailabilityInflight = fetchAssistantHealth().then((available) => {
    assistantAvailabilityCache = {
      available,
      checkedAt: Date.now(),
    };
    return available;
  }).finally(() => {
    assistantAvailabilityInflight = null;
  });

  return await assistantAvailabilityInflight;
}

export function getAssistantConversation(): ChatConversation {
  const cache = readCache();
  return {
    assistantKind: "bedsheet",
    avatarUrl: pirateBrandMarkUrl,
    id: ASSISTANT_CONVERSATION_ID,
    preview: cache.preview,
    targetLabel: "Pirate assistant",
    title: "Bedsheet",
    transport: "assistant",
    unreadCount: unreadCountFor(cache),
    updatedAt: cache.updatedAt,
  };
}

export async function loadAssistantConversationMessages(
  session: StoredSession,
  conversationId: string,
): Promise<ChatMessageRecord[]> {
  const messages = await requestAssistant<ChatMessageRecord[]>(
    session,
    `/history?conversationId=${encodeURIComponent(conversationId)}`,
    { method: "GET" },
  );
  updateCacheFromMessages(messages, session);
  markRead(session);
  return messages;
}

export async function seedAssistantWelcome(
  session: StoredSession,
  conversationId: string,
  clientContext?: Record<string, unknown>,
  options?: { markRead?: boolean },
): Promise<ChatMessageRecord[]> {
  const response = await requestAssistant<AssistantWelcomeResponse>(
    session,
    "/welcome",
    {
      body: JSON.stringify({
        clientContext,
        conversationId,
      } satisfies AssistantWelcomeRequestBody),
      method: "POST",
    },
  );
  if (response.inserted || options?.markRead) {
    updateCacheFromMessages(response.messages, session);
  }
  if (options?.markRead) markRead(session);
  return response.messages;
}

export async function sendAssistantMessage(
  session: StoredSession,
  conversationId: string,
  content: string,
  clientContext?: Record<string, unknown>,
  options?: { markRead?: boolean },
): Promise<ChatMessageRecord[]> {
  const messages = await requestAssistant<ChatMessageRecord[]>(
    session,
    "/messages",
    {
      body: JSON.stringify({
        clientContext,
        content,
        conversationId,
      } satisfies AssistantRequestBody),
      method: "POST",
    },
  );
  updateCacheFromMessages(messages, session);
  if (options?.markRead) markRead(session);
  return messages;
}
