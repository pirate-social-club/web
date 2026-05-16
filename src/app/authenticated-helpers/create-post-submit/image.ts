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

type UploadedImageMedia = {
  media_ref: string;
  mime_type: string;
  size_bytes: number;
};

type UploadImageMedia = (
  input: { kind: "post_image"; file: File },
) => Promise<UploadedImageMedia>;

export function buildImagePostRequest({
  baseRequest,
  caption,
  title,
  uploadedImage,
}: {
  baseRequest: BasePostRequestFields;
  caption: string;
  title: string;
  uploadedImage: UploadedImageMedia;
}): CreatePostRequest {
  return {
    ...baseRequest,
    post_type: "image",
    title: title.trim(),
    caption: caption.trim() || undefined,
    media_refs: [{
      storage_ref: uploadedImage.media_ref,
      mime_type: uploadedImage.mime_type,
      size_bytes: uploadedImage.size_bytes,
    }],
  };
}

export async function submitImagePost({
  altchaOptions,
  authorMode,
  baseRequest,
  caption,
  communityId,
  createPost,
  file,
  signAgentAuthoredBody,
  title,
  uploadMedia,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  caption: string;
  communityId: string;
  createPost: CreatePost;
  file: File | null;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
  uploadMedia: UploadImageMedia;
}): Promise<ApiCreatedPost> {
  if (!file) {
    throw new Error("Choose an image before creating this post.");
  }

  const uploadedImage = await uploadMedia({
    kind: "post_image",
    file,
  });
  const request = buildImagePostRequest({
    baseRequest,
    caption,
    title,
    uploadedImage,
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
