import { describe, expect, test } from "bun:test";

import {
  __resetSessionStoreForTests,
  getAccessToken,
  getStoredSession,
  isSessionAccessTokenExpired,
  updateSessionIdentityWallet,
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
    __resetSessionStoreForTests();
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

  function seedTwoWalletSession() {
    const session: StoredSession = {
      accessToken: makeToken(Math.floor(Date.now() / 1000) + 3600),
      user: { primary_wallet_attachment: "wal_a" } as StoredSession["user"],
      profile: { primary_wallet_address: "0xaaa" } as StoredSession["profile"],
      onboarding: {} as StoredSession["onboarding"],
      walletAttachments: [
        { wallet_attachment: "wal_a", wallet_address: "0xaaa", is_primary: true, chain_namespace: "eip155:1" },
        { wallet_attachment: "wal_b", wallet_address: "0xbbb", is_primary: false, chain_namespace: "eip155:1" },
      ] as StoredSession["walletAttachments"],
      storedAt: new Date().toISOString(),
    };
    installMockLocalStorage({ pirate_session: JSON.stringify(session) });
  }

  test("updateSessionIdentityWallet flips the primary flag and derived address", () => {
    __resetSessionStoreForTests();
    seedTwoWalletSession();
    try {
      updateSessionIdentityWallet("wal_b");
      const updated = getStoredSession();
      expect(updated?.walletAttachments.find((wallet) => wallet.is_primary)?.wallet_attachment).toBe("wal_b");
      expect(updated?.walletAttachments.filter((wallet) => wallet.is_primary)).toHaveLength(1);
      expect(updated?.profile.primary_wallet_address).toBe("0xbbb");
      expect(updated?.user.primary_wallet_attachment).toBe("wal_b");
    } finally {
      cleanup();
    }
  });

  test("updateSessionIdentityWallet ignores an unknown attachment id", () => {
    __resetSessionStoreForTests();
    seedTwoWalletSession();
    try {
      updateSessionIdentityWallet("wal_missing");
      const updated = getStoredSession();
      expect(updated?.walletAttachments.find((wallet) => wallet.is_primary)?.wallet_attachment).toBe("wal_a");
      expect(updated?.profile.primary_wallet_address).toBe("0xaaa");
    } finally {
      cleanup();
    }
  });

  test("keeps unexpired persisted bearer sessions", () => {
    __resetSessionStoreForTests();
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
