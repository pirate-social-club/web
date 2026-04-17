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

  test("loads public profiles without auth headers", async () => {
    let request: Request | null = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request = input instanceof Request ? input : new Request(input, init);
      return Response.json({
        requested_handle_label: "captain.pirate",
        resolved_handle_label: "captain.pirate",
        is_canonical: true,
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
});
