import { describe, expect, test } from "bun:test";
import { cleanup as rtlCleanup, renderHook, waitFor } from "@testing-library/react";
import * as React from "react";

import { ApiProvider } from "@/lib/api";
import { __resetSessionStoreForTests, setSession } from "@/lib/api/session-store";
import { createTestDom } from "@/test/setup-dom";
import {
  __resetKnownCommunitiesForTests,
  getKnownCommunities,
  rememberKnownCommunity,
} from "./known-communities-store";
import { useRecentCommunities, useSidebarCommunities } from "./owned-communities";

const originalFetch = globalThis.fetch;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

const { document, window } = createTestDom();

function createMockStorage(seed: Record<string, string> = {}) {
  const storage = new Map(Object.entries(seed));
  return {
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
}

function installDom() {
  const localStorage = createMockStorage();
  const sessionStorage = createMockStorage();

  Object.defineProperty(window, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: sessionStorage });
  Object.defineProperty(window, "event", { configurable: true, writable: true, value: undefined });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: window.navigator });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage });
}

function restoreDom() {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
}

function cleanup() {
  rtlCleanup();
  globalThis.fetch = originalFetch;
  __resetKnownCommunitiesForTests();
  __resetSessionStoreForTests();
  restoreDom();
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <ApiProvider baseUrl="http://pirate.test">{children}</ApiProvider>;
}

describe("owned communities hooks", () => {
  test("useRecentCommunities prunes confirmed 404s and keeps transient failures", async () => {
    installDom();
    rememberKnownCommunity({ communityId: "cmt_alive", displayName: "Alive" });
    rememberKnownCommunity({ communityId: "cmt_dead", displayName: "Dead" });
    rememberKnownCommunity({ communityId: "cmt_flaky", displayName: "Flaky" });

    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      const pathname = new URL(request.url).pathname;
      requests.push(pathname);

      if (pathname === "/public-communities/cmt_alive") {
        return Response.json({ community: "cmt_alive", display_name: "Alive" });
      }
      if (pathname === "/public-communities/cmt_dead") {
        return Response.json({ code: "not_found", message: "missing" }, { status: 404 });
      }
      if (pathname === "/public-communities/cmt_flaky") {
        return Response.json({ code: "internal_error", message: "boom" }, { status: 500 });
      }

      throw new Error(`Unexpected request: ${pathname}`);
    };

    try {
      const { result } = renderHook(() => useRecentCommunities(), { wrapper });

      await waitFor(() => {
        expect(result.current.map((community) => community.communityId).sort()).toEqual([
          "cmt_alive",
          "cmt_flaky",
        ]);
      });

      const communityRequests = requests.filter((path) => path.startsWith("/public-communities/"));
      expect(communityRequests.includes("/public-communities/cmt_alive")).toBe(true);
      expect(communityRequests.includes("/public-communities/cmt_dead")).toBe(true);
      expect(communityRequests.includes("/public-communities/cmt_flaky")).toBe(true);
      expect(getKnownCommunities().map((community) => community.communityId).sort()).toEqual([
        "cmt_alive",
        "cmt_flaky",
      ]);
    } finally {
      cleanup();
    }
  });

  test("useSidebarCommunities merges owned communities and prunes dead recent entries", async () => {
    installDom();
    setSession({
      access_token: "header.eyJleHAiOjQxMDI0NDQ4MDB9.signature",
      user: { user: "usr_test" } as never,
      profile: {
        global_handle: { label: "captain.pirate" },
        primary_public_handle: null,
      } as never,
      onboarding: {} as never,
      wallet_attachments: [],
    });
    rememberKnownCommunity({ communityId: "cmt_owned", displayName: "Owned" });
    rememberKnownCommunity({ communityId: "cmt_dead", displayName: "Dead" });

    const requests: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      requests.push(url.pathname);

      if (url.pathname === "/public-profiles/captain.pirate") {
        return Response.json({
          requested_handle_label: "captain.pirate",
          resolved_handle_label: "captain.pirate",
          is_canonical: true,
          created_communities: [
            {
              community: "cmt_owned",
              display_name: "Owned",
              route_slug: null,
              created: "2026-04-17T00:00:00.000Z",
            },
          ],
          profile: {
            user: "usr_test",
            global_handle: {
              global_handle_id: "ghl_test",
              label: "captain.pirate",
              tier: "standard",
              status: "active",
              issuance_source: "free_cleanup_rename",
              issued_at: "2026-04-17T00:00:00.000Z",
            },
            linked_handles: [],
            primary_public_handle: null,
            display_name: "Captain",
            bio: null,
            avatar_ref: null,
            cover_ref: null,
            preferred_locale: null,
            created: "2026-04-17T00:00:00.000Z",
            updated: "2026-04-17T00:00:00.000Z",
          },
        });
      }
      if (url.pathname === "/public-communities/cmt_owned") {
        return Response.json({ community: "cmt_owned", display_name: "Owned" });
      }
      if (url.pathname === "/public-communities/cmt_dead") {
        return Response.json({ code: "not_found", message: "missing" }, { status: 404 });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    };

    try {
      const { result } = renderHook(() => useSidebarCommunities(), { wrapper });

      await waitFor(() => {
        expect(result.current.recentCommunities.map((community) => community.communityId)).toEqual([
          "cmt_owned",
        ]);
      });

      expect(requests).toContain("/public-profiles/captain.pirate");
      expect(getKnownCommunities().map((community) => community.communityId)).toEqual(["cmt_owned"]);
    } finally {
      cleanup();
    }
  });

  test("useSidebarCommunities accepts created communities returned with id fields", async () => {
    installDom();
    setSession({
      access_token: "header.eyJleHAiOjQxMDI0NDQ4MDB9.signature",
      user: { user: "usr_test" } as never,
      profile: {
        global_handle: { label: "captain.pirate" },
        primary_public_handle: null,
      } as never,
      onboarding: {} as never,
      wallet_attachments: [],
    });

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);

      if (url.pathname === "/public-profiles/captain.pirate") {
        return Response.json({
          requested_handle_label: "captain.pirate",
          resolved_handle_label: "captain.pirate",
          is_canonical: true,
          created_communities: [
            {
              id: "cmt_owned",
              display_name: "Owned",
              route_slug: "@owned",
              created: "2026-04-17T00:00:00.000Z",
            },
            {
              display_name: "Missing id",
              route_slug: null,
              created: "2026-04-17T00:00:00.000Z",
            },
          ],
          profile: {
            user: "usr_test",
            global_handle: {
              global_handle_id: "ghl_test",
              label: "captain.pirate",
              tier: "standard",
              status: "active",
              issuance_source: "free_cleanup_rename",
              issued_at: "2026-04-17T00:00:00.000Z",
            },
            linked_handles: [],
            primary_public_handle: null,
            display_name: "Captain",
            bio: null,
            avatar_ref: null,
            cover_ref: null,
            preferred_locale: null,
            created: "2026-04-17T00:00:00.000Z",
            updated: "2026-04-17T00:00:00.000Z",
          },
        });
      }

      throw new Error(`Unexpected request: ${url.pathname}`);
    };

    try {
      const { result } = renderHook(() => useSidebarCommunities(), { wrapper });

      await waitFor(() => {
        expect(result.current.moderatedCommunities.map((community) => ({
          communityId: community.communityId,
          displayName: community.displayName,
          routeSlug: community.routeSlug,
        }))).toEqual([{
          communityId: "cmt_owned",
          displayName: "Owned",
          routeSlug: "@owned",
        }]);
      });
    } finally {
      cleanup();
    }
  });
});
