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
import type { SubmitProgressReporter } from "./progress";
import { assertPostImageFile } from "./post-image-file";

type AltchaRequestOptions = {
  altchaPayload?: string | null;
};

type CreatePost = (
  communityId: string,
  request: CreatePostRequestWithEvent,
  options?: AltchaRequestOptions,
) => Promise<ApiCreatedPost>;

export type UploadedImageMedia = {
  media_ref: string;
  mime_type: string;
  size_bytes: number;
};

type UploadImageMedia = (
  input: { kind: "post_image"; file: File; onProgress?: (fraction: number) => void },
) => Promise<UploadedImageMedia>;

export function buildImagePostRequest({
  baseRequest,
  caption,
  event,
  title,
  uploadedImage,
}: {
  baseRequest: BasePostRequestFields;
  caption: string;
  event?: CreatePostEventRequest;
  title: string;
  uploadedImage: UploadedImageMedia;
}): CreatePostRequestWithEvent {
  return {
    ...baseRequest,
    event,
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
  event,
  file,
  onImageUploaded,
  reportProgress,
  signAgentAuthoredBody,
  title,
  uploadedImage: existingUploadedImage,
  uploadMedia,
}: {
  altchaOptions?: AltchaRequestOptions;
  authorMode: AuthorMode;
  baseRequest: BasePostRequestFields;
  caption: string;
  communityId: string;
  createPost: CreatePost;
  event?: CreatePostEventRequest;
  file: File | null;
  onImageUploaded?: (uploadedImage: UploadedImageMedia) => void;
  reportProgress?: SubmitProgressReporter;
  signAgentAuthoredBody: SignAgentAuthoredBody;
  title: string;
  uploadedImage?: UploadedImageMedia | null;
  uploadMedia: UploadImageMedia;
}): Promise<ApiCreatedPost> {
  if (!file) {
    throw new Error("Choose an image before creating this post.");
  }
  assertPostImageFile(file);

  let uploadedImage = existingUploadedImage ?? null;
  if (!uploadedImage) {
    reportProgress?.("prepare_media");
    uploadedImage = await uploadMedia({
      kind: "post_image",
      file,
      onProgress: (fraction) => {
        reportProgress?.("prepare_media", `${Math.round(fraction * 100)}%`);
      },
    });
    onImageUploaded?.(uploadedImage);
  }
  const request = buildImagePostRequest({
    baseRequest,
    caption,
    event,
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
