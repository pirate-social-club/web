import { describe, expect, test } from "bun:test";
import { ApiClientError, type GetPublicCommunitiesCommunityRefFeedResponse } from "@pirate/api-client";

import {
  fetchPublicCommunityThreads,
  mapPublicCommunityThreads,
} from "./public-community-threads";

const emptyPage = {
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
} satisfies GetPublicCommunitiesCommunityRefFeedResponse;

describe("public community threads adapter", () => {
  test("uses the raw reference, fixed public query, bounded fetch, and no authorization", async () => {
    let seenUrl = "";
    let seenAuthorization: string | null = null;
    await fetchPublicCommunityThreads("cmt_raw/reference", {
      cursor: "opaque.cursor/1",
      locale: "zh",
      request: new Request("https://pirate.sc/", { headers: { authorization: "Bearer do-not-forward" } }),
      fetchImpl: async (input, init) => {
        seenUrl = String(input);
        seenAuthorization = new Headers(init?.headers).get("authorization");
        return Response.json(emptyPage);
      },
      timeoutMs: 100,
    });

    expect(seenUrl).toBe("https://api.pirate.sc/public-communities/cmt_raw%2Freference/feed?surface=threads&sort=new&locale=zh-CN&cursor=opaque.cursor%2F1");
    expect(seenAuthorization).toBeNull();
  });

  test("maps translated content, vote score, persisted seconds, safe links, gates, and rules", () => {
    const page = mapPublicCommunityThreads("cmt_fallback", {
      ...emptyPage,
      community: {
        ...emptyPage.community,
        display_name: "Translated community",
        description: "Original description",
        localized_text: {
          resolved_locale: "fr",
          items: [{ field_key: "community.description", translation_state: "ready", machine_translated: false, translated_value: "Description traduite", source_hash: "hash" }],
        },
        route_slug: null,
        member_count: 12,
        follower_count: 34,
        gate_match_mode: "any",
        membership_gate_summaries: [{ gate_type: "wallet_score", minimum_score: 8 }],
        reference_links: [
          { url: "https://example.com/valid", label: "Valid", position: 2 },
          { url: "javascript:alert(1)", label: "Unsafe", position: 1 },
          { url: "https://example.com/missing-label", position: 3 },
        ],
        rules: [
          { id: "r1", object: "community_rule", title: "Keep it kind", body: "Be constructive.", report_reason: "kind", position: 1, status: "active" },
          { id: "r2", object: "community_rule", title: "Old", body: "Archived.", report_reason: "old", position: 2, status: "archived" },
        ],
      },
      items: [{
        post: {
          id: "post_1",
          title: "Original title",
          body: "Original body",
          caption: "Original caption",
          created: 1_735_689_600,
        },
        translated_title: "Titre traduit",
        translated_body: "Corps traduit",
        translated_caption: null,
        upvote_count: 11,
        downvote_count: 3,
      }],
      next_cursor: "opaque-next",
    } as unknown as GetPublicCommunitiesCommunityRefFeedResponse);

    expect(page.community).toMatchObject({
      description: "Description traduite",
      followers: 34,
      gateMode: "any",
      handle: "cmt_fallback",
      members: 12,
      name: "Translated community",
    });
    expect(page.community.gates).toEqual([{ label: "wallet score", status: "unknown" }]);
    expect(page.community.referenceLinks).toEqual([{ href: "https://example.com/valid", label: "Valid", position: 2 }]);
    expect(page.community.rules).toEqual([{ body: "Be constructive.", position: 1, title: "Keep it kind" }]);
    expect(page.items[0]).toEqual({
      body: "Corps traduit",
      id: "post_1",
      publishedAt: "2025-01-01T00:00:00.000Z",
      score: 8,
      title: "Titre traduit",
    });
    expect(page.next_cursor).toBe("opaque-next");
  });

  test("preserves structured generated errors", async () => {
    const error = await fetchPublicCommunityThreads("missing", {
      fetchImpl: async () => Response.json(
        { code: "not_found", message: "missing", retryable: false, request_id: "req_1" },
        { status: 404 },
      ),
    }).catch((value) => value);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 404, code: "not_found", requestId: "req_1" });
  });

  test("aborts a fetch that exceeds the bounded timeout", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")), { once: true });
    });

    await expect(fetchPublicCommunityThreads("slow", { fetchImpl, timeoutMs: 5 })).rejects.toMatchObject({ name: "AbortError" });
  });
});
