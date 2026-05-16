"use client";

import type { CreatePostRequest, Post as ApiCreatedPost } from "@pirate/api-contracts";

import type { AuthorMode } from "@/components/compositions/posts/post-composer/post-composer.types";
import { normalizeHttpUrl } from "@/components/compositions/posts/post-composer/post-composer-utils";

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

export function buildLinkPostRequest({
  baseRequest,
  body,
  linkUrl,
  title,
}: {
  baseRequest: BasePostRequestFields;
  body: string;
  linkUrl: string;
  title: string;
}): CreatePostRequest {
  return {
    ...baseRequest,
    post_type: "link",
    title: title.trim() || undefined,
    body: body.trim() || undefined,
    link_url: linkUrl,
  };
}

export async function submitLinkPost({
  altchaOptions,
  authorMode,
  baseRequest,
  body,
  communityId,
  createPost,
  linkUrl,
  signAgentAuthoredBody,
  title,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  body: string;
  communityId: string;
  createPost: CreatePost;
  linkUrl: string;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
}): Promise<ApiCreatedPost> {
  const normalizedLinkUrl = normalizeHttpUrl(linkUrl);
  if (!normalizedLinkUrl) {
    throw new Error("Enter a valid http or https link.");
  }

  const request = buildLinkPostRequest({
    baseRequest,
    body,
    linkUrl: normalizedLinkUrl,
    title,
  });
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
