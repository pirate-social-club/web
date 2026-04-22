import { describe, expect, test } from "bun:test";

import { ApiClient } from "./client";

const originalFetch = globalThis.fetch;

function requireRequest(request: Request | null): Request {
  if (!request) {
    throw new Error("Expected request to be captured");
  }
  return request;
}

describe("ApiClient media uploads", () => {
  test("sends FormData without forcing a JSON content type", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "avatar",
        media_ref: "http://pirate.test/community-media/avatar/avatar_test.png",
        mime_type: "image/png",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "community-media/avatar/avatar_test.png",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.uploadMedia({
        kind: "avatar",
        file: new File([new Uint8Array([1, 2, 3, 4])], "avatar.png", { type: "image/png" }),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/community-media");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(capturedRequest.headers.get("content-type")?.startsWith("multipart/form-data;")).toBe(true);

      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("avatar");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("avatar.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("keeps JSON content type for normal JSON requests", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({ community_id: "cmt_test", status: "joined" });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.join("cmt_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.headers.get("content-type")).toBe("application/json");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends profile media uploads as multipart form data", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "cover",
        media_ref: "http://pirate.test/profile-media/cover/cover_test.png",
        mime_type: "image/png",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "profile-media/cover/cover_test.png",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.uploadMedia({
        kind: "cover",
        file: new File([new Uint8Array([1, 2, 3, 4])], "cover.png", { type: "image/png" }),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/profile-media");
      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("cover");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("cover.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends post image uploads through community media", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        kind: "post_image",
        media_ref: "http://pirate.test/community-media/post_image/post_image_test.gif",
        mime_type: "image/gif",
        size_bytes: 4,
        storage_bucket: "pirate-media",
        storage_object_key: "community-media/post_image/post_image_test.gif",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.uploadMedia({
        kind: "post_image",
        file: new File([new Uint8Array([1, 2, 3, 4])], "post.gif", { type: "image/gif" }),
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/community-media");
      const formData = await capturedRequest.formData();
      expect(formData.get("kind")).toBe("post_image");
      const file = formData.get("file");
      expect(file instanceof File).toBe(true);
      expect((file as File).name).toBe("post.gif");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("syncs linked handles with a POST request", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        user_id: "usr_test",
        global_handle: {
          global_handle_id: "ghl_test",
          label: "captainblackbeard.pirate",
          tier: "generated",
          status: "active",
          issuance_source: "generated_signup",
          issued_at: "2026-04-17T00:00:00.000Z",
        },
        linked_handles: [
          {
            linked_handle_id: "global:ghl_test",
            label: "captainblackbeard.pirate",
            kind: "pirate",
            verification_state: "verified",
          },
          {
            linked_handle_id: "lnk_ens_test",
            label: "blackbeard.eth",
            kind: "ens",
            verification_state: "verified",
          },
        ],
        primary_public_handle: {
          linked_handle_id: "lnk_ens_test",
          label: "blackbeard.eth",
          kind: "ens",
          verification_state: "verified",
        },
        created_at: "2026-04-17T00:00:00.000Z",
        updated_at: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const profile = await client.profiles.syncLinkedHandles();
      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/profiles/me/linked-handles/sync");
      expect(profile.primary_public_handle?.label).toBe("blackbeard.eth");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends primary public handle selection as JSON", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        user_id: "usr_test",
        global_handle: {
          global_handle_id: "ghl_test",
          label: "captainblackbeard.pirate",
          tier: "generated",
          status: "active",
          issuance_source: "generated_signup",
          issued_at: "2026-04-17T00:00:00.000Z",
        },
        linked_handles: [],
        primary_public_handle: null,
        created_at: "2026-04-17T00:00:00.000Z",
        updated_at: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.profiles.setPrimaryPublicHandle("lnk_ens_test");

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.url).toBe("http://pirate.test/profiles/me/primary-public-handle");
      expect(JSON.stringify(await capturedRequest.json())).toBe(
        JSON.stringify({ linked_handle_id: "lnk_ens_test" }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends agent name updates as JSON patch requests", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        agent_id: "agt_test",
        owner_user_id: "usr_test",
        display_name: "Night Signal",
        status: "active",
        current_ownership_record_id: "aor_test",
        current_ownership: null,
        created_at: "2026-04-17T00:00:00.000Z",
        updated_at: "2026-04-17T00:10:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.agents.update("agt_test", { display_name: "Night Signal" });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("PATCH");
      expect(capturedRequest.url).toBe("http://pirate.test/agents/agt_test");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
      expect(JSON.stringify(await capturedRequest.json())).toBe(
        JSON.stringify({ display_name: "Night Signal" }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public profiles without auth headers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        requested_handle_label: "captain.pirate",
        resolved_handle_label: "captain.pirate",
        is_canonical: true,
        created_communities: [
          {
            community_id: "cmt_test",
            display_name: "Test Builders",
            route_slug: null,
            created_at: "2026-04-17T00:00:00.000Z",
          },
        ],
        profile: {
          user_id: "usr_test",
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
          created_at: "2026-04-17T00:00:00.000Z",
          updated_at: "2026-04-17T00:00:00.000Z",
        },
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const profile = await client.publicProfiles.getByHandle("captain");
      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/public-profiles/captain");
      expect(capturedRequest.headers.get("authorization")).toBe(null);
      expect(profile.profile.display_name).toBe("Captain");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads the authenticated home feed with sort and locale params", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        items: [],
        next_cursor: null,
        top_communities: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.feed.home({
        locale: "es",
        sort: "top",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.url).toBe("http://pirate.test/feed/home?locale=es&sort=top");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public communities without auth headers", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.url.endsWith("/public-communities/captain-club/posts?locale=en-US&sort=top")) {
        return Response.json({
          items: [],
        });
      }

      return Response.json({
        community_id: "cmt_test",
        display_name: "Captain Club",
        description: "Public preview",
        avatar_ref: null,
        banner_ref: null,
        membership_mode: "open",
        human_verification_lane: "self",
        member_count: null,
        membership_gate_summaries: [],
        viewer_membership_status: "not_member",
        created_at: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      const community = await client.publicCommunities.get("captain-club");
      await client.publicCommunities.listPosts("captain-club", {
        locale: "en-US",
        sort: "top",
      });

      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toBe("http://pirate.test/public-communities/captain-club");
      expect(requests[0]?.headers.get("authorization")).toBe(null);
      expect(requests[1]?.url).toBe("http://pirate.test/public-communities/captain-club/posts?locale=en-US&sort=top");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
      expect(community.display_name).toBe("Captain Club");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads authenticated community posts with locale and sort params", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        items: [],
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.communities.listPosts("cmt_test", {
        limit: "100",
        locale: "nl",
        sort: "top",
      });

      const capturedRequest = requireRequest(request);
      expect(capturedRequest.method).toBe("GET");
      expect(capturedRequest.url).toBe("http://pirate.test/communities/cmt_test/posts?limit=100&locale=nl&sort=top");
      expect(capturedRequest.headers.get("authorization")).toBe("Bearer session-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("adds locale to post and comment read requests", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({});
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.posts.get("pst_test", { locale: "nl" });
      await client.posts.vote("pst_test", 1);
      await client.communities.listComments("cmt_test", "pst_test", {
        locale: "nl",
        sort: "best",
        limit: "25",
      });
      await client.communities.createComment("cmt_test", "pst_test", {
        body: "Top level",
      });
      await client.comments.listReplies("cmt_reply", {
        locale: "nl",
        sort: "new",
      });
      await client.comments.createReply("cmt_reply", {
        body: "Reply body",
      });
      await client.comments.vote("cmt_reply", 1);

      expect(requests[0]?.url).toBe("http://pirate.test/posts/pst_test?locale=nl");
      expect(requests[1]?.url).toBe("http://pirate.test/posts/pst_test/vote");
      expect(requests[2]?.url).toBe(
        "http://pirate.test/communities/cmt_test/posts/pst_test/comments?limit=25&locale=nl&sort=best",
      );
      expect(requests[3]?.url).toBe("http://pirate.test/communities/cmt_test/posts/pst_test/comments");
      expect(requests[4]?.url).toBe("http://pirate.test/comments/cmt_reply/replies?locale=nl&sort=new");
      expect(requests[5]?.url).toBe("http://pirate.test/comments/cmt_reply/replies");
      expect(requests[6]?.url).toBe("http://pirate.test/comments/cmt_reply/vote");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads public thread routes without auth headers", async () => {
    const requests: Request[] = [];
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);
      return Response.json({ items: [], post: { post_id: "pst_test" } });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => "session-token",
      });

      await client.publicPosts.get("pst_test", { locale: "zh-Hans" });
      await client.publicComments.listPostComments("pst_test", { limit: "25", locale: "zh-Hans", sort: "best" });
      await client.publicComments.listReplies("cmt_test", { locale: "zh-Hans", sort: "new" });

      expect(requests[0]?.url).toBe("http://pirate.test/public-posts/pst_test?locale=zh-Hans");
      expect(requests[0]?.headers.get("authorization")).toBe(null);
      expect(requests[1]?.url).toBe("http://pirate.test/public-comments/posts/pst_test/comments?limit=25&locale=zh-Hans&sort=best");
      expect(requests[1]?.headers.get("authorization")).toBe(null);
      expect(requests[2]?.url).toBe("http://pirate.test/public-comments/cmt_test/replies?locale=zh-Hans&sort=new");
      expect(requests[2]?.headers.get("authorization")).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("waits briefly for a late auth refresh callback before failing a 401", async () => {
    const requests: Request[] = [];
    let token = "stale-token";

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      if (request.headers.get("authorization") === "Bearer fresh-token") {
        return Response.json({
          user_id: "usr_test",
          auth_sources: [],
          created_at: "2026-04-17T00:00:00.000Z",
          updated_at: "2026-04-17T00:00:00.000Z",
        });
      }

      return Response.json({
        code: "auth_error",
        message: "Authentication failed",
        retryable: false,
      }, { status: 401 });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => token,
      });

      const requestPromise = client.users.getMe();
      globalThis.setTimeout(() => {
        client.setRefreshAuthCallback(async () => {
          token = "fresh-token";
          return true;
        });
      }, 10);

      const result = await requestPromise;

      expect(result.user_id).toBe("usr_test");
      expect(requests).toHaveLength(2);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer stale-token");
      expect(requests[1]?.headers.get("authorization")).toBe("Bearer fresh-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("waits for auth refresh before sending an authenticated request without a token", async () => {
    const requests: Request[] = [];
    let token: string | null = null;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push(request);

      return Response.json({
        user_id: "usr_test",
        auth_sources: [],
        created_at: "2026-04-17T00:00:00.000Z",
        updated_at: "2026-04-17T00:00:00.000Z",
      });
    };

    try {
      const client = new ApiClient({
        baseUrl: "http://pirate.test",
        getToken: () => token,
      });

      const requestPromise = client.users.getMe();
      globalThis.setTimeout(() => {
        client.setRefreshAuthCallback(async () => {
          token = "fresh-token";
          return true;
        });
      }, 10);

      const result = await requestPromise;

      expect(result.user_id).toBe("usr_test");
      expect(requests).toHaveLength(1);
      expect(requests[0]?.headers.get("authorization")).toBe("Bearer fresh-token");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
