import { describe, expect, test } from "bun:test";

import {
  __resetKnownCommunitiesForTests,
  forgetKnownCommunity,
  getKnownCommunities,
  rememberKnownCommunity,
} from "./known-communities-store";

const originalLocalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;

function installMockLocalStorage(seed: Record<string, string> = {}) {
  const storage = new Map(Object.entries(seed));
  const localStorage = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
  return storage;
}

function restoreLocalStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalLocalStorage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
}

describe("known-communities-store", () => {
  test("caps the store at the most recent 50 communities", () => {
    installMockLocalStorage();

    try {
      for (let index = 1; index <= 55; index += 1) {
        rememberKnownCommunity({
          communityId: `cmt_${index}`,
          displayName: `Community ${index}`,
        });
      }

      const communities = getKnownCommunities();
      expect(communities).toHaveLength(50);
      expect(communities[0]?.communityId).toBe("cmt_55");
      expect(communities.at(-1)?.communityId).toBe("cmt_6");
    } finally {
      __resetKnownCommunitiesForTests();
      restoreLocalStorage();
    }
  });

  test("forgets a persisted known community", () => {
    const storage = installMockLocalStorage();

    try {
      rememberKnownCommunity({
        communityId: "cmt_alive",
        displayName: "Alive",
      });
      rememberKnownCommunity({
        communityId: "cmt_dead",
        displayName: "Dead",
      });

      forgetKnownCommunity("cmt_dead");

      const persisted = storage.get("pirate_known_communities") ?? "";
      expect(getKnownCommunities().map((community) => community.communityId)).toEqual(["cmt_alive"]);
      expect(persisted).toContain("cmt_alive");
      expect(persisted.includes("cmt_dead")).toBe(false);
    } finally {
      __resetKnownCommunitiesForTests();
      restoreLocalStorage();
    }
  });

  test("hydrates from storage and removes stale ids", () => {
    installMockLocalStorage({
      pirate_known_communities: JSON.stringify([
        {
          avatarSrc: null,
          communityId: "cmt_first",
          displayName: "First",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
        {
          avatarSrc: null,
          communityId: "cmt_second",
          displayName: "Second",
          updatedAt: "2026-04-02T00:00:00.000Z",
        },
      ]),
    });

    try {
      forgetKnownCommunity("cmt_second");

      expect(getKnownCommunities().map((community) => community.communityId)).toEqual(["cmt_first"]);
    } finally {
      __resetKnownCommunitiesForTests();
      restoreLocalStorage();
    }
  });
});
