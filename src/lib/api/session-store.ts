import * as React from "react";
import type { SessionExchangeResponse } from "@pirate/api-contracts";

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

function notifyAll(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeToStorage(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export function getStoredSession(): StoredSession | null {
  if (!hydrated) {
    cachedSession = readFromStorage();
    hydrated = true;
  }
  return cachedSession;
}

export function getAccessToken(): string | null {
  return getStoredSession()?.accessToken ?? null;
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
  cachedSession = null;
  writeToStorage(null);
  notifyAll();
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

export async function revalidateSession(
  getUsersMe: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await getUsersMe();
    return true;
  } catch {
    clearSession();
    return false;
  }
}
