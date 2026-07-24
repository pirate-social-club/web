import { afterEach, beforeEach, describe, expect, test } from "bun:test";

const VIEWER_ADDRESS = `0x${"22".repeat(20)}`;
const TARGET_ADDRESS = `0x${"11".repeat(20)}`;
const originalFetch = globalThis.fetch;

import.meta.env.VITE_PIRATE_APP_ENV = "prod";
import.meta.env.VITE_BASE_NETWORK = "base-mainnet";
import.meta.env.VITE_EFP_ENVIRONMENT = "mainnet";
import.meta.env.VITE_EFP_API_URL = "https://efp.test/api/v1";

const {
  fetchProfileFollowSummary,
  fetchViewerFollowState,
} = await import("./efp-read");

describe("EFP follow reads", () => {
  beforeEach(() => {
    import.meta.env.VITE_PIRATE_APP_ENV = "prod";
    import.meta.env.VITE_BASE_NETWORK = "base-mainnet";
    import.meta.env.VITE_EFP_ENVIRONMENT = "mainnet";
    import.meta.env.VITE_EFP_API_URL = "https://efp.test/api/v1";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("reads viewer state from the relationship endpoint", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (input) => {
      requestedUrl = String(input);
      return Response.json({ state: { is_following: true } });
    }) as typeof fetch;

    await expect(fetchViewerFollowState(VIEWER_ADDRESS, TARGET_ADDRESS)).resolves.toBe(true);
    expect(requestedUrl).toBe(
      `https://efp.test/api/v1/users/${VIEWER_ADDRESS}/${TARGET_ADDRESS}/relationship?cache=fresh`,
    );
  });

  test("returns unavailable when either relationship address is missing", async () => {
    await expect(fetchViewerFollowState(null, TARGET_ADDRESS)).resolves.toBeNull();
    await expect(fetchViewerFollowState(VIEWER_ADDRESS, null)).resolves.toBeNull();
  });

  test("rejects a relationship response without an explicit boolean state", async () => {
    globalThis.fetch = (async () => Response.json({ state: {} })) as typeof fetch;

    await expect(fetchViewerFollowState(VIEWER_ADDRESS, TARGET_ADDRESS)).rejects.toThrow(
      "missing follow state",
    );
  });

  test("returns unavailable counts when the hosted API fails", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 503 })) as typeof fetch;

    await expect(fetchProfileFollowSummary(TARGET_ADDRESS)).resolves.toEqual({
      followerCount: null,
      followingCount: null,
    });
  });

  test("returns unavailable counts for a malformed stats response", async () => {
    globalThis.fetch = (async () => Response.json({
      followers_count: 12,
    })) as typeof fetch;

    await expect(fetchProfileFollowSummary(TARGET_ADDRESS)).resolves.toEqual({
      followerCount: null,
      followingCount: null,
    });
  });
});
