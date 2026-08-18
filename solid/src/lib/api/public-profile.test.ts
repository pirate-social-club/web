import { ApiClientError } from "@pirate/api-client";
import { describe, expect, test } from "bun:test";
import {
  fetchPublicProfile,
  loadPublicProfile,
  parsePublicProfilePath,
  projectPublicProfile,
} from "./public-profile";

const validResponse = {
  profile: {
    id: "usr_1",
    object: "profile",
    display_name: "Ada <script>alert(1)</script>",
    avatar_ref: "ipfs://avatar",
    avatar_source: "upload",
    cover_ref: "ipfs://cover",
    cover_source: "upload",
    bio: "A public builder.",
    bio_source: "manual",
    preferred_locale: "en",
    global_handle: { id: "gh_1", object: "global_handle", label: "ada", status: "active" },
    created: 1,
  },
  requested_handle_label: "Ada Alias",
  resolved_handle_label: "ada",
  is_canonical: false,
  created_communities: [
    { community: "c_old", display_name: "Older", created: 1, route_slug: null },
    { community: "c_new", display_name: "Newer", created: 2, route_slug: "newer" },
  ],
} as const;

describe("public profile api adapter", () => {
  test("accepts only one decoded canonical profile path segment", () => {
    expect(parsePublicProfilePath("/u/captain.pirate")).toBe("captain.pirate");
    expect(parsePublicProfilePath("/u/captain%20pirate")).toBe("captain pirate");
    expect(parsePublicProfilePath("/u/captain%2Fpirate")).toBeNull();
    expect(parsePublicProfilePath("/u/captain.pirate/extra")).toBeNull();
    expect(parsePublicProfilePath("/u/%E0%A4%A")).toBeNull();
  });

  test("uses the exact encoded public URL and never forwards auth or cookies", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    let seenCredentials: RequestCredentials | undefined;
    await fetchPublicProfile("Ada Alias", {
      request: new Request("https://pirate.sc/u/Ada%20Alias", {
        headers: { authorization: "Bearer should-not-forward", cookie: "session=secret" },
      }),
      fetchImpl: async (input, init) => {
        seenUrl = String(input);
        seenHeaders = new Headers(init?.headers);
        seenCredentials = init?.credentials;
        return Response.json(validResponse);
      },
    });
    expect(seenUrl).toBe("https://api.pirate.sc/public-profiles/Ada%20Alias");
    expect(seenHeaders?.get("authorization")).toBeNull();
    expect(seenHeaders?.get("cookie")).toBeNull();
    expect(seenCredentials).toBe("omit");
  });

  test("projects only the persisted narrow profile surface and sorts communities", async () => {
    const result = await fetchPublicProfile("ada", { fetchImpl: async () => Response.json(validResponse) });
    expect(result).toEqual({
      profile: {
        displayName: "Ada <script>alert(1)</script>",
        avatarRef: "ipfs://avatar",
        coverRef: "ipfs://cover",
        bio: "A public builder.",
        globalHandleLabel: "ada",
      },
      requestedHandleLabel: "Ada Alias",
      resolvedHandleLabel: "ada",
      isCanonical: false,
      createdCommunities: [
        { community: "c_new", displayName: "Newer", created: 2, routeSlug: "newer" },
        { community: "c_old", displayName: "Older", created: 1, routeSlug: null },
      ],
    });
  });

  test("preserves declared errors and maps malformed responses to upstream failure", async () => {
    const declared = await loadPublicProfile("missing", {
      fetchImpl: async () => Response.json({ code: "not_found", message: "missing", retryable: false }, { status: 404 }),
    });
    expect(declared).toEqual({ kind: "not-found", status: 404 });

    const malformed = await loadPublicProfile("broken", {
      fetchImpl: async () => Response.json({ profile: {} }),
    });
    expect(malformed).toEqual({ kind: "upstream-error", status: 502 });

    await expect(fetchPublicProfile("missing", {
      fetchImpl: async () => Response.json({ code: "not_found", message: "missing", retryable: false }, { status: 404 }),
    })).rejects.toBeInstanceOf(ApiClientError);
  });

  test("aborts an upstream read after four seconds or the supplied bound", async () => {
    const fetchImpl: typeof fetch = async (_input, init) => await new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")), { once: true });
    });
    await expect(fetchPublicProfile("slow", { fetchImpl, timeoutMs: 5 })).rejects.toMatchObject({ name: "AbortError" });
  });

  test("keeps null route slugs available for community-id fallback links", () => {
    const result = projectPublicProfile(validResponse);
    expect(result.createdCommunities[0]?.routeSlug).toBe("newer");
    expect(result.createdCommunities[1]?.routeSlug).toBeNull();
  });
});
