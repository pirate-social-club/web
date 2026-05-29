"use client";

import type { Post as ApiCreatedPost } from "@pirate/api-contracts";

import type { AuthorMode } from "@/components/compositions/posts/post-composer/post-composer.types";

import {
  signIfAgent,
  type BasePostRequestFields,
  type CreatePostEventRequest,
  type CreatePostRequestWithEvent,
  type SignAgentAuthoredBody,
} from "./base";

type AltchaRequestOptions = {
  altchaPayload?: string | null;
};

type CreatePost = (
  communityId: string,
  request: CreatePostRequestWithEvent,
  options?: AltchaRequestOptions,
) => Promise<ApiCreatedPost>;

export function buildTextPostRequest({
  baseRequest,
  body,
  event,
  title,
}: {
  baseRequest: BasePostRequestFields;
  body: string;
  event?: CreatePostEventRequest;
  title: string;
}): CreatePostRequestWithEvent {
  return {
    ...baseRequest,
    event,
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
  event,
  signAgentAuthoredBody,
  title,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  body: string;
  communityId: string;
  createPost: CreatePost;
  event?: CreatePostEventRequest;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
}): Promise<ApiCreatedPost> {
  const request = buildTextPostRequest({ baseRequest, body, event, title });
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
