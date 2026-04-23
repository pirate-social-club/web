import { describe, expect, test } from "bun:test";

import {
  __resetSessionStoreForTests,
  getAccessToken,
  getStoredSession,
  isSessionAccessTokenExpired,
  type StoredSession,
} from "./session-store";

const originalLocalStorage = globalThis.localStorage;

function makeToken(exp: number): string {
  const encode = (value: unknown) => globalThis.btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ exp })}.signature`;
}

function makeSession(exp: number): StoredSession {
  return {
    accessToken: makeToken(exp),
    user: {} as StoredSession["user"],
    profile: {} as StoredSession["profile"],
    onboarding: {} as StoredSession["onboarding"],
    walletAttachments: [],
    storedAt: new Date().toISOString(),
  };
}

function installMockLocalStorage(seed: Record<string, string> = {}) {
  const storage = new Map(Object.entries(seed));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key) ?? null : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
    },
  });
  return storage;
}

function restoreLocalStorage(value: Storage | undefined = originalLocalStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value,
  });
}

function cleanup() {
  __resetSessionStoreForTests();
  restoreLocalStorage();
}

describe("session-store", () => {
  test("drops expired persisted bearer sessions before reuse", () => {
    const expiredSession = makeSession(Math.floor(Date.now() / 1000) - 60);
    const storage = installMockLocalStorage({
      pirate_session: JSON.stringify(expiredSession),
    });

    try {
      expect(isSessionAccessTokenExpired(expiredSession)).toBe(true);
      expect(getStoredSession()).toBeNull();
      expect(getAccessToken()).toBeNull();
      expect(storage.has("pirate_session")).toBe(false);
    } finally {
      cleanup();
    }
  });

  test("keeps unexpired persisted bearer sessions", () => {
    const liveSession = makeSession(Math.floor(Date.now() / 1000) + 3600);
    installMockLocalStorage({
      pirate_session: JSON.stringify(liveSession),
    });

    try {
      expect(isSessionAccessTokenExpired(liveSession)).toBe(false);
      expect(getStoredSession()?.accessToken).toBe(liveSession.accessToken);
      expect(getAccessToken()).toBe(liveSession.accessToken);
    } finally {
      cleanup();
    }
  });
});
