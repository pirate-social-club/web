import { describe, expect, test } from "bun:test";
import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import { buildBasePostRequest } from "./base";
import { buildLinkPostRequest, submitLinkPost } from "./link";

function createBaseRequest() {
  return buildBasePostRequest({
    idempotencyKey: "idem_link",
    identityMode: "public",
    visibility: "members_only",
  });
}

function createPost(overrides: Partial<ApiCreatedPost> = {}): ApiCreatedPost {
  return {
    id: "pst_link",
    object: "post",
    community: "com_test",
    authorship_mode: "human_direct",
    identity_mode: "public",
    post_type: "link",
    status: "published",
    visibility: "members_only",
    ...overrides,
  } as ApiCreatedPost;
}

describe("link create-post submit helpers", () => {
  test("buildLinkPostRequest returns base fields and link fields", () => {
    expect(buildLinkPostRequest({
      baseRequest: createBaseRequest(),
      body: " Body copy ",
      linkUrl: "https://example.com/path",
      title: " Link title ",
    })).toEqual({
      anonymous_scope: undefined,
      disclosed_qualifier_ids: undefined,
      identity_mode: "public",
      idempotency_key: "idem_link",
      translation_policy: "machine_allowed",
      visibility: "members_only",
      post_type: "link",
      title: "Link title",
      body: "Body copy",
      link_url: "https://example.com/path",
    });
  });

  test("buildLinkPostRequest omits empty title and body", () => {
    const request = buildLinkPostRequest({
      baseRequest: createBaseRequest(),
      body: " ",
      linkUrl: "https://example.com",
      title: " ",
    });

    expect(request.title).toBeUndefined();
    expect(request.body).toBeUndefined();
    expect(request.link_url).toBe("https://example.com");
  });

  test("submitLinkPost normalizes URLs before creating the post", async () => {
    const createPostCalls: Array<{
      communityId: string;
      options: unknown;
      request: CreatePostRequest;
    }> = [];

    await submitLinkPost({
      altchaOptions: { altchaPayload: "altcha_link" },
      authorMode: "human",
      baseRequest: createBaseRequest(),
      body: "A link",
      communityId: "com_test",
      createPost: async (communityId, request, options) => {
        createPostCalls.push({ communityId, options, request });
        return createPost();
      },
      linkUrl: " example.com ",
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Example",
    });

    expect(createPostCalls).toEqual([{
      communityId: "com_test",
      options: { altchaPayload: "altcha_link" },
      request: {
        anonymous_scope: undefined,
        disclosed_qualifier_ids: undefined,
        identity_mode: "public",
        idempotency_key: "idem_link",
        translation_policy: "machine_allowed",
        visibility: "members_only",
        post_type: "link",
        title: "Example",
        body: "A link",
        link_url: "https://example.com/",
      },
    }]);
  });

  test("submitLinkPost rejects invalid URLs", async () => {
    await expect(submitLinkPost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      body: "",
      communityId: "com_test",
      createPost: async () => createPost(),
      linkUrl: "not a url",
      signAgentAuthoredBody: async (_path, request) => request,
      title: "",
    })).rejects.toThrow("Enter a valid http or https link.");
  });

  test("submitLinkPost signs agent-authored link posts", async () => {
    const createPostRequests: CreatePostRequest[] = [];
    const signedPaths: string[] = [];

    await submitLinkPost({
      authorMode: "agent",
      baseRequest: createBaseRequest(),
      body: "",
      communityId: "com_test",
      createPost: async (_communityId, request) => {
        createPostRequests.push(request);
        return createPost({ id: "pst_agent_link" });
      },
      linkUrl: "https://example.com",
      signAgentAuthoredBody: async (path, request) => {
        signedPaths.push(path);
        return {
          ...request,
          agent_id: "agent_test",
          authorship_mode: "user_agent",
        };
      },
      title: "Agent link",
    });

    expect(signedPaths).toEqual(["/communities/com_test/posts"]);
    expect(createPostRequests).toEqual([{
      anonymous_scope: undefined,
      disclosed_qualifier_ids: undefined,
      identity_mode: "public",
      idempotency_key: "idem_link",
      translation_policy: "machine_allowed",
      visibility: "members_only",
      post_type: "link",
      title: "Agent link",
      body: undefined,
      link_url: "https://example.com/",
      agent_id: "agent_test",
      authorship_mode: "user_agent",
    }]);
  });
});
