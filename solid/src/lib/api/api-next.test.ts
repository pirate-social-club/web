import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { ApiClientError, createPirateApiClient } from "@pirate/api-client";
import type { GetPublicCommunityThreadsResponse } from "@pirate/api-client";
import { verifyApiNextVendor } from "../../../scripts/verify-api-next.mjs";
import {
  fetchCommunityPreview,
  fetchPublicVideoFeedPage,
  normalizePublicVideoFeed,
} from "./public-feed";

const emptyPublicFeed = { items: [], top_communities: [], next_cursor: null };

describe("vendored api-next boundary", () => {
  test("verifies the pinned package and rejects a tampered generated file", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "pirate-api-next-"));
    try {
      await cp(join(import.meta.dir, "../../../vendor/api-next"), join(tempRoot, "vendor/api-next"), { recursive: true });
      await cp(join(import.meta.dir, "../../../vendor/api-next-binding.json"), join(tempRoot, "vendor/api-next-binding.json"));
      await expect(verifyApiNextVendor(tempRoot)).resolves.toMatchObject({
        apiNextCommit: "0c8af3845da4c8fdc59bfb1a2caf183831228a65",
        version: "0.3.0",
      });
      const clientPath = join(tempRoot, "vendor/api-next/src/generated/client.ts");
      const client = await readFile(clientPath, "utf8");
      await writeFile(clientPath, `${client}\n// tamper\n`);
      await expect(verifyApiNextVendor(tempRoot)).rejects.toThrow("client.ts checksum drifted");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("uses the generated client with the exact public URL and no authorization", async () => {
    let seenUrl = "";
    let seenAuthorization: string | null = null;
    const fetchImpl: typeof fetch = async (input, init) => {
      seenUrl = String(input);
      seenAuthorization = new Headers(init?.headers).get("authorization");
      return Response.json(emptyPublicFeed);
    };
    await fetchPublicVideoFeedPage({
      request: new Request("https://pirate.sc/"),
      locale: "en",
      cursor: "900719925474099312345",
      fetchImpl,
      timeoutMs: 100,
    });
    expect(seenUrl).toBe("https://api.pirate.sc/feed/home/public?locale=en&sort=best&cursor=900719925474099312345");
    expect(seenAuthorization).toBeNull();
  });

  test("preserves generated structured errors", async () => {
    const fetchImpl: typeof fetch = async () => Response.json(
      { code: "rate_limited", message: "slow down", retryable: true, request_id: "req_1" },
      { status: 429 },
    );
    const error = await fetchPublicVideoFeedPage({ fetchImpl, timeoutMs: 100 }).catch(value => value);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 429, code: "rate_limited", retryable: true, requestId: "req_1" });
  });

  test("bounds an SSR/browser fetch that never resolves", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")), { once: true });
    });
    await expect(fetchPublicVideoFeedPage({ fetchImpl, timeoutMs: 5 })).rejects.toMatchObject({ name: "AbortError" });
  });

  test("community preview forwards only explicit bearer auth and no-store personalization", async () => {
    let anonymousHeaders: Headers | undefined;
    let personalizedHeaders: Headers | undefined;
    let personalizedCache: RequestCache | undefined;
    const unavailable = () => Response.json(
      { code: "not_found", message: "missing" },
      { status: 404 },
    );
    await fetchCommunityPreview("c_1", {
      request: new Request("https://pirate.sc/", { headers: { authorization: "Bearer cookie-leak" } }),
      fetchImpl: async (_input, init) => {
        anonymousHeaders = new Headers(init?.headers);
        return unavailable();
      },
    }).catch(() => undefined);
    await fetchCommunityPreview("c_1", {
      bearerToken: "explicit-token",
      fetchImpl: async (_input, init) => {
        personalizedHeaders = new Headers(init?.headers);
        personalizedCache = init?.cache;
        return unavailable();
      },
    }).catch(() => undefined);
    expect(anonymousHeaders?.get("authorization")).toBeNull();
    expect(personalizedHeaders?.get("authorization")).toBe("Bearer explicit-token");
    expect(personalizedCache).toBe("no-store");
  });

  test("keeps the generated client portable for non-feed operations", async () => {
    let seenUrl = "";
    const client = createPirateApiClient("https://api.example.test/", async input => {
      seenUrl = String(input);
      return Response.json({ status: "ok" });
    });
    await expect(client.get_health(undefined)).resolves.toEqual({ status: "ok" });
    expect(seenUrl).toBe("https://api.example.test/health");
  });

  test("exposes the signed-out public community threads operation", async () => {
    let seenUrl: URL | undefined;
    let seenAuthorization: string | null = null;
    const page: GetPublicCommunityThreadsResponse = {
      community: {
        id: "community_1",
        object: "community_preview",
        display_name: "Community One",
        membership_mode: "open",
        human_verification_lane: null,
        moderators: [],
        membership_gate_summaries: [],
        rules: [],
        created: 1_787_132_800,
      },
      items: [],
      next_cursor: null,
    };
    const client = createPirateApiClient("https://api.example.test/", async (input, init) => {
      seenUrl = new URL(String(input));
      seenAuthorization = new Headers(init?.headers).get("authorization");
      return Response.json(page);
    });

    await expect(
      client.get_publicCommunitiesCommunityRefFeed({
        path: { communityRef: "community_1" },
        query: { surface: "threads", sort: "new", cursor: "pct1.cursor", locale: "en" },
      }),
    ).resolves.toEqual(page);
    expect(seenUrl?.pathname).toBe("/public-communities/community_1/feed");
    expect(Object.fromEntries(seenUrl?.searchParams ?? [])).toEqual({
      surface: "threads",
      sort: "new",
      cursor: "pct1.cursor",
      locale: "en",
    });
    expect(seenAuthorization).toBeNull();
  });

  test("narrows mixed feed items before reading video media JSON", () => {
    const page = normalizePublicVideoFeed({
      items: [
        { post: { post: { id: "text", post_type: "text", media_refs: [{ storage_ref: "bad" }] } } },
        { post: { post: { id: "video", post_type: "video", media_refs: [{ storage_ref: "good", mime_type: "video/mp4" }] } } },
        { post: { post: { id: "malformed", post_type: "video", media_refs: { storage_ref: "bad" } } } },
        { post: { post: { id: "bad-ref", post_type: "video", media_refs: [{ unexpected: true }] } } },
        { post: { post: { id: "missing-type", media_refs: [{ storage_ref: "good", mime_type: "video/mp4" }] } } },
        { post: { post: { id: "empty-storage", post_type: "video", media_refs: [{ storage_ref: " ", mime_type: "video/mp4" }] } } },
        { post: { post: { id: "non-video-media", post_type: "video", media_refs: [{ storage_ref: "image", mime_type: "image/png" }] } } },
      ],
      next_cursor: 7,
    });
    expect(page.items.map(item => item.post.post.id)).toEqual(["video"]);
    expect(page.next_cursor).toBe("7");
  });
});
