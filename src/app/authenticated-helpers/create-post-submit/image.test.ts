import { describe, expect, test } from "bun:test";
import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import { buildBasePostRequest } from "./base";
import { buildImagePostRequest, submitImagePost } from "./image";

function createBaseRequest() {
  return buildBasePostRequest({
    anonymousScope: "community_stable",
    disclosedQualifierIds: ["qual_image"],
    idempotencyKey: "idem_image",
    identityMode: "anonymous",
    visibility: "public",
  });
}

function createFile() {
  return new File(["fake image"], "image.png", { type: "image/png" });
}

function createPost(overrides: Partial<ApiCreatedPost> = {}): ApiCreatedPost {
  return {
    id: "pst_image",
    object: "post",
    community: "com_test",
    authorship_mode: "human_direct",
    identity_mode: "public",
    post_type: "image",
    status: "published",
    visibility: "public",
    ...overrides,
  } as ApiCreatedPost;
}

describe("image create-post submit helpers", () => {
  test("buildImagePostRequest returns base fields and image media fields", () => {
    expect(buildImagePostRequest({
      baseRequest: createBaseRequest(),
      caption: " Image caption ",
      title: " Image title ",
      uploadedImage: {
        media_ref: "media_image",
        mime_type: "image/png",
        size_bytes: 123,
      },
    })).toEqual({
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_image"],
      identity_mode: "anonymous",
      idempotency_key: "idem_image",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "image",
      title: "Image title",
      caption: "Image caption",
      media_refs: [{
        storage_ref: "media_image",
        mime_type: "image/png",
        size_bytes: 123,
      }],
    });
  });

  test("buildImagePostRequest omits empty captions", () => {
    const request = buildImagePostRequest({
      baseRequest: createBaseRequest(),
      caption: "   ",
      title: " Image title ",
      uploadedImage: {
        media_ref: "media_image",
        mime_type: "image/png",
        size_bytes: 123,
      },
    });

    expect(request.caption).toBeUndefined();
    expect(request.title).toBe("Image title");
    expect(request.media_refs).toEqual([{
      storage_ref: "media_image",
      mime_type: "image/png",
      size_bytes: 123,
    }]);
  });

  test("submitImagePost uploads media before creating the post", async () => {
    const file = createFile();
    const uploadMediaCalls: Array<{ kind: "post_image"; file: File }> = [];
    const createPostCalls: Array<{
      communityId: string;
      options: unknown;
      request: CreatePostRequest;
    }> = [];

    const result = await submitImagePost({
      altchaOptions: { altchaPayload: "altcha_image" },
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "Alt text",
      communityId: "com_test",
      createPost: async (communityId, request, options) => {
        createPostCalls.push({ communityId, options, request });
        return createPost({ id: "pst_uploaded_image" });
      },
      file,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Image post",
      uploadMedia: async (input) => {
        uploadMediaCalls.push(input);
        return {
          media_ref: "media_uploaded",
          mime_type: "image/png",
          size_bytes: file.size,
        };
      },
    });

    expect(result.id).toBe("pst_uploaded_image");
    expect(uploadMediaCalls).toEqual([{ kind: "post_image", file }]);
    expect(createPostCalls).toEqual([{
      communityId: "com_test",
      options: { altchaPayload: "altcha_image" },
      request: {
        anonymous_scope: "community_stable",
        disclosed_qualifier_ids: ["qual_image"],
        identity_mode: "anonymous",
        idempotency_key: "idem_image",
        translation_policy: "machine_allowed",
        visibility: "public",
        post_type: "image",
        title: "Image post",
        caption: "Alt text",
        media_refs: [{
          storage_ref: "media_uploaded",
          mime_type: "image/png",
          size_bytes: file.size,
        }],
      },
    }]);
  });

  test("submitImagePost rejects missing files before uploading", async () => {
    const uploadMediaCalls: Array<{ kind: "post_image"; file: File }> = [];
    const createPostCalls: CreatePostRequest[] = [];

    await expect(submitImagePost({
      authorMode: "human",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createPost: async (_communityId, request) => {
        createPostCalls.push(request);
        return createPost();
      },
      file: null,
      signAgentAuthoredBody: async (_path, request) => request,
      title: "Image post",
      uploadMedia: async (input) => {
        uploadMediaCalls.push(input);
        return {
          media_ref: "media_uploaded",
          mime_type: "image/png",
          size_bytes: 123,
        };
      },
    })).rejects.toThrow("Choose an image before creating this post.");

    expect(uploadMediaCalls).toEqual([]);
    expect(createPostCalls).toEqual([]);
  });

  test("submitImagePost signs agent-authored image posts", async () => {
    const file = createFile();
    const createPostRequests: CreatePostRequest[] = [];
    const signedPaths: string[] = [];

    await submitImagePost({
      authorMode: "agent",
      baseRequest: createBaseRequest(),
      caption: "",
      communityId: "com_test",
      createPost: async (_communityId, request) => {
        createPostRequests.push(request);
        return createPost({ id: "pst_agent_image" });
      },
      file,
      signAgentAuthoredBody: async (path, request) => {
        signedPaths.push(path);
        return {
          ...request,
          agent_id: "agent_test",
          authorship_mode: "user_agent",
        };
      },
      title: "Agent image",
      uploadMedia: async () => ({
        media_ref: "media_uploaded",
        mime_type: "image/png",
        size_bytes: file.size,
      }),
    });

    expect(signedPaths).toEqual(["/communities/com_test/posts"]);
    expect(createPostRequests).toEqual([{
      anonymous_scope: "community_stable",
      disclosed_qualifier_ids: ["qual_image"],
      identity_mode: "anonymous",
      idempotency_key: "idem_image",
      translation_policy: "machine_allowed",
      visibility: "public",
      post_type: "image",
      title: "Agent image",
      caption: undefined,
      media_refs: [{
        storage_ref: "media_uploaded",
        mime_type: "image/png",
        size_bytes: file.size,
      }],
      agent_id: "agent_test",
      authorship_mode: "user_agent",
    }]);
  });
});
