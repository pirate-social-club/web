import { describe, expect, test } from "bun:test";
import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import { buildBasePostRequest } from "./base";
import { buildTextPostRequest, submitTextPost } from "./text";

function createBaseRequest() {
  return buildBasePostRequest({
    anonymousScope: "community_stable",
    disclosedQualifierIds: ["qual_one"],
    idempotencyKey: "idem_text",
    identityMode: "anonymous",
    visibility: "public",
  });
}

function createPost(overrides: Partial<ApiCreatedPost> = {}): ApiCreatedPost {
  return {
    id: "pst_text",
    object: "post",
    community: "com_test",
    authorship_mode: "human_direct",
    identity_mode: "public",
    post_type: "text",
    status: "published",
    visibility: "public",
    ...overrides,
  } as ApiCreatedPost;
}

describe("text create-post submit helpers", () => {
  test("buildTextPostRequest returns base fields and text fields", () => {
    expect(buildTextPostRequest({
      baseRequest: createBaseRequest(),
      body: " Body copy ",
      title: " My title ",
    })).toEqual({
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_one"],
      identity_mode: "anonymous",
      idempotency_key: "idem_text",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "text",
      title: "My title",
      body: "Body copy",
    });
  });

  test("buildTextPostRequest omits empty bodies", () => {
    const request = buildTextPostRequest({
      baseRequest: createBaseRequest(),
      body: "   ",
      title: " My title ",
    });

    expect(request.body).toBeUndefined();
    expect(request.title).toBe("My title");
  });

  test("submitTextPost creates an unsigned human-authored text post", async () => {
    const createPostCalls: Array<{
      communityId: string;
      options: unknown;
      request: CreatePostRequest;
    }> = [];
    const result = await submitTextPost({
      altchaOptions: { altchaPayload: "altcha_test" },
      authorMode: "human",
      baseRequest: createBaseRequest(),
      body: "Hello body",
      communityId: "com_test",
      createPost: async (communityId, request, options) => {
        createPostCalls.push({ communityId, options, request });
        return createPost({ id: "pst_human" });
      },
      signAgentAuthoredBody: async (_path, request) => ({
        ...request,
        authorship_mode: "user_agent",
      }),
      title: "Hello",
    });

    expect(result.id).toBe("pst_human");
    expect(createPostCalls).toEqual([{
      communityId: "com_test",
      options: { altchaPayload: "altcha_test" },
      request: {
        anonymous_scope: "community_stable",
        disclosed_qualifier_ids: ["qual_one"],
        identity_mode: "anonymous",
        idempotency_key: "idem_text",
        translation_policy: "machine_allowed",
        visibility: "public",
        post_type: "text",
        title: "Hello",
        body: "Hello body",
      },
    }]);
  });

  test("submitTextPost signs agent-authored text posts", async () => {
    const createPostRequests: CreatePostRequest[] = [];
    const signedPaths: string[] = [];

    await submitTextPost({
      authorMode: "agent",
      baseRequest: createBaseRequest(),
      body: "",
      communityId: "com_test",
      createPost: async (_communityId, request) => {
        createPostRequests.push(request);
        return createPost({ id: "pst_agent" });
      },
      signAgentAuthoredBody: async (path, request) => {
        signedPaths.push(path);
        return {
          ...request,
          agent_id: "agent_test",
          authorship_mode: "user_agent",
        };
      },
      title: "Agent post",
    });

    expect(signedPaths).toEqual(["/communities/com_test/posts"]);
    expect(createPostRequests).toEqual([{
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_one"],
      identity_mode: "anonymous",
      idempotency_key: "idem_text",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "text",
      title: "Agent post",
      body: undefined,
      agent_id: "agent_test",
      authorship_mode: "user_agent",
    }]);
  });
});
