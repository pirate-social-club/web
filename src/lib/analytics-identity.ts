const ANONYMOUS_ID_STORAGE_KEY = "pirate_analytics_anonymous_id";
const SESSION_ID_STORAGE_KEY = "pirate_analytics_session_id";

let cachedAnonymousId: string | null = null;
let cachedSessionId: string | null = null;

function randomId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, "")
    ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function readStorage(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, key: string, value: string): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Analytics identity should never affect the product flow.
  }
}

function getStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function getAnonymousId(): string {
  if (cachedAnonymousId) return cachedAnonymousId;
  const storage = getStorage("local");
  cachedAnonymousId = readStorage(storage, ANONYMOUS_ID_STORAGE_KEY) ?? randomId("anon");
  writeStorage(storage, ANONYMOUS_ID_STORAGE_KEY, cachedAnonymousId);
  return cachedAnonymousId;
}

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  const storage = getStorage("session");
  cachedSessionId = readStorage(storage, SESSION_ID_STORAGE_KEY) ?? randomId("ses");
  writeStorage(storage, SESSION_ID_STORAGE_KEY, cachedSessionId);
  return cachedSessionId;
}

export function getAnalyticsIdentity(): { anonymousId: string; sessionId: string } {
  return {
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
  };
}
