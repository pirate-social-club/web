"use client";

import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import type { AuthorMode } from "@/components/compositions/posts/post-composer/post-composer.types";

import {
  signIfAgent,
  type BasePostRequestFields,
  type SignAgentAuthoredBody,
} from "./base";

type AltchaRequestOptions = {
  altchaPayload?: string | null;
};

type CreatePost = (
  communityId: string,
  request: CreatePostRequest,
  options?: AltchaRequestOptions,
) => Promise<ApiCreatedPost>;

export function buildTextPostRequest({
  baseRequest,
  body,
  title,
}: {
  baseRequest: BasePostRequestFields;
  body: string;
  title: string;
}): CreatePostRequest {
  return {
    ...baseRequest,
    post_type: "text",
    title: title.trim(),
    body: body.trim() || undefined,
  };
}

export async function submitTextPost({
  altchaOptions,
  authorMode,
  baseRequest,
  body,
  communityId,
  createPost,
  signAgentAuthoredBody,
  title,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  body: string;
  communityId: string;
  createPost: CreatePost;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
}): Promise<ApiCreatedPost> {
  const request = buildTextPostRequest({ baseRequest, body, title });
  return await createPost(
    communityId,
    await signIfAgent({
      authorMode,
      path: `/communities/${communityId}/posts`,
      request,
      signAgentAuthoredBody,
    }),
    altchaOptions,
  );
}
