import * as React from "react";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

import { logger } from "@/lib/logger";

const STORAGE_KEY = "pirate_session";

export interface StoredSession {
  accessToken: string;
  user: SessionExchangeResponse["user"];
  profile: SessionExchangeResponse["profile"];
  onboarding: SessionExchangeResponse["onboarding"];
  walletAttachments: SessionExchangeResponse["wallet_attachments"];
  storedAt: string;
}

type SessionListener = () => void;

const listeners = new Set<SessionListener>();
let cachedSession: StoredSession | null = null;
let hydrated = false;
let sessionClearCallback: (() => Promise<void> | void) | null = null;
let sessionClearInProgress = false;

function decodeBase64Url(value: string): string | null {
  const atobFn = typeof window !== "undefined" ? window.atob : globalThis.atob;
  if (!atobFn) return null;

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    return atobFn(padded);
  } catch {
    return null;
  }
}

function isAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { status?: unknown; code?: unknown };
  return maybeError.status === 401 || maybeError.code === "auth_error";
}

function notifyAll(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readFromStorage(): StoredSession | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeToStorage(session: StoredSession | null): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    if (session) {
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    logger.warn("[auth] failed to persist session", error);
  }
}

export function getStoredSession(): StoredSession | null {
  if (!hydrated) {
    cachedSession = readFromStorage();
    hydrated = true;
  }

  if (isSessionAccessTokenExpired(cachedSession)) {
    cachedSession = null;
    writeToStorage(null);
  }

  return cachedSession;
}

export function getAccessToken(): string | null {
  return getStoredSession()?.accessToken ?? null;
}

export function getSessionAccessTokenExpiryMs(
  session: StoredSession | null | undefined,
): number | null {
  const payloadSegment = session?.accessToken.split(".")[1];
  if (!payloadSegment) return null;

  const decodedPayload = decodeBase64Url(payloadSegment);
  if (!decodedPayload) return null;

  try {
    const payload = JSON.parse(decodedPayload) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isSessionAccessTokenExpiringSoon(
  session: StoredSession | null | undefined,
  withinMs = 5 * 60 * 1000,
): boolean {
  const expiryMs = getSessionAccessTokenExpiryMs(session);
  if (!expiryMs) return false;
  return expiryMs - Date.now() <= withinMs;
}

export function isSessionAccessTokenExpired(
  session: StoredSession | null | undefined,
): boolean {
  const expiryMs = getSessionAccessTokenExpiryMs(session);
  return expiryMs !== null && expiryMs <= Date.now();
}

export function setSession(response: SessionExchangeResponse): StoredSession {
  const session: StoredSession = {
    accessToken: response.access_token,
    user: response.user,
    profile: response.profile,
    onboarding: response.onboarding,
    walletAttachments: response.wallet_attachments,
    storedAt: new Date().toISOString(),
  };
  sessionClearInProgress = false;
  cachedSession = session;
  writeToStorage(session);
  notifyAll();
  return session;
}

export function updateSessionOnboarding(
  onboarding: StoredSession["onboarding"],
): void {
  const current = getStoredSession();
  if (!current) return;
  current.onboarding = onboarding;
  cachedSession = current;
  writeToStorage(current);
  notifyAll();
}

export function updateSessionUser(
  user: StoredSession["user"],
): void {
  const current = getStoredSession();
  if (!current) return;
  current.user = user;
  cachedSession = current;
  writeToStorage(current);
  notifyAll();
}

export function updateSessionProfile(
  profile: StoredSession["profile"],
): void {
  const current = getStoredSession();
  if (!current) return;
  current.profile = profile;
  cachedSession = current;
  writeToStorage(current);
  notifyAll();
}

export function clearSession(): void {
  sessionClearInProgress = true;
  cachedSession = null;
  writeToStorage(null);
  notifyAll();
  void Promise.resolve(sessionClearCallback?.())
    .catch((error) => {
      logger.error("[auth] failed to clear upstream session", error);
    })
    .finally(() => {
      sessionClearInProgress = false;
      notifyAll();
    });
}

export function isSessionClearInProgress(): boolean {
  return sessionClearInProgress;
}

export function setSessionClearCallback(
  callback: (() => Promise<void> | void) | null,
): void {
  sessionClearCallback = callback;
}

export function __resetSessionStoreForTests(): void {
  listeners.clear();
  cachedSession = null;
  hydrated = false;
  sessionClearCallback = null;
  sessionClearInProgress = false;
}

export function subscribeToSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): StoredSession | null {
  return React.useSyncExternalStore(
    subscribeToSession,
    getStoredSession,
    () => null,
  );
}

export function useSessionClearInProgress(): boolean {
  return React.useSyncExternalStore(
    subscribeToSession,
    isSessionClearInProgress,
    () => false,
  );
}

export async function revalidateSession(
  getUsersMe: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await getUsersMe();
    return true;
  } catch (error) {
    if (isAuthFailure(error)) {
      clearSession();
    }
    return false;
  }
}
