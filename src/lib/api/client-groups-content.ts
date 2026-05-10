import type {
  CommentContext,
  Comment,
  CommentListResponse,
  CommentVoteResponse,
  CreateCommentRequest,
  CreatePostRequest,
  CreateSongArtifactBundleRequest,
  CreateSongArtifactUploadRequest,
  DeletedPostResponse,
  LocalizedPostResponse,
  Post,
  PostVoteResponse,
  SongArtifactBundle,
  SongArtifactBundleListResponse,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import type {
  ApiSongArtifactUploadContentRequest,
  CommunityListCommentsOptions,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

const ALTCHA_HEADER = "x-pirate-altcha";

type AltchaRequestOptions = {
  altchaPayload?: string | null;
};

function altchaHeaders(options?: AltchaRequestOptions): HeadersInit | undefined {
  const payload = options?.altchaPayload?.trim();
  return payload ? { [ALTCHA_HEADER]: payload } : undefined;
}

export function createPostsApi(request: ApiRequest) {
  return {
    get: (
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<LocalizedPostResponse> => {
      return request<LocalizedPostResponse>(
        buildQueryPath(`/posts/${encodeURIComponent(postId)}`, {
          locale: opts?.locale,
        }),
      );
    },
    vote: (postId: string, value: -1 | 1): Promise<PostVoteResponse> =>
      request<PostVoteResponse>(`/posts/${encodeURIComponent(postId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      }),
    delete: (communityId: string, postId: string): Promise<DeletedPostResponse> =>
      request<DeletedPostResponse>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/delete`,
        { method: "POST" },
      ),
    remove: (communityId: string, postId: string): Promise<Post> =>
      request<Post>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/remove`,
        { method: "POST" },
      ),
  };
}

export function createCommentsApi(request: ApiRequest) {
  return {
    listReplies: (
      commentId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return request<CommentListResponse>(buildQueryPath(
        `/comments/${encodeURIComponent(commentId)}/replies`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ));
    },
    getContext: (
      commentId: string,
      opts?: { limit?: string | null; cursor?: string | null; locale?: string | null },
    ): Promise<CommentContext> => {
      return request<CommentContext>(buildQueryPath(
        `/comments/${encodeURIComponent(commentId)}/context`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
        },
      ));
    },
    createReply: (
      commentId: string,
      body: CreateCommentRequest,
      options?: AltchaRequestOptions,
    ): Promise<void> =>
      request(`/comments/${encodeURIComponent(commentId)}/replies`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: altchaHeaders(options),
      }),
    delete: (commentId: string): Promise<Comment> =>
      request<Comment>(`/comments/${encodeURIComponent(commentId)}/delete`, {
        method: "POST",
      }),
    vote: (commentId: string, value: -1 | 1): Promise<CommentVoteResponse> =>
      request<CommentVoteResponse>(`/comments/${encodeURIComponent(commentId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      }),
  };
}

export function createCommunityContentApi(request: ApiRequest) {
  return {
    createPost: (
      communityId: string,
      body: CreatePostRequest,
      options?: AltchaRequestOptions,
    ): Promise<Post> =>
      request<Post>(`/communities/${encodeURIComponent(communityId)}/posts`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: altchaHeaders(options),
      }),
    listComments: (
      communityId: string,
      postId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return request<CommentListResponse>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ));
    },
    createComment: (
      communityId: string,
      postId: string,
      body: CreateCommentRequest,
      options?: AltchaRequestOptions,
    ): Promise<void> =>
      request(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body: JSON.stringify(body), headers: altchaHeaders(options) },
      ),
    createArtifactUpload: (
      communityId: string,
      body: CreateSongArtifactUploadRequest,
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    uploadArtifactContent: (
      communityId: string,
      songArtifactUploadId: string,
      body: ArrayBuffer | ApiSongArtifactUploadContentRequest,
    ): Promise<SongArtifactUpload> => {
      const isBinary = body instanceof ArrayBuffer;
      return request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/content`,
        {
          method: "PUT",
          body: isBinary ? body : JSON.stringify(body),
          headers: isBinary ? { "Content-Type": "application/octet-stream" } : undefined,
        },
      );
    },
    createSongArtifactBundle: (
      communityId: string,
      body: CreateSongArtifactBundleRequest,
    ): Promise<SongArtifactBundle> =>
      request<SongArtifactBundle>(
        `/communities/${encodeURIComponent(communityId)}/song-artifacts`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    listSongArtifactBundles: (
      communityId: string,
      opts?: { q?: string | null; limit?: number | null },
    ): Promise<SongArtifactBundleListResponse> =>
      request<SongArtifactBundleListResponse>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/song-artifacts`, {
          q: opts?.q,
          limit: opts?.limit == null ? null : String(opts.limit),
        }),
      ),
    getSongArtifactBundle: (
      communityId: string,
      songArtifactBundleId: string,
    ): Promise<SongArtifactBundle> =>
      request<SongArtifactBundle>(
        `/communities/${encodeURIComponent(communityId)}/song-artifacts/${encodeURIComponent(songArtifactBundleId)}`,
      ),
    getLinkPreview: (
      communityId: string,
      url: string,
    ): Promise<{
      kind: "embed" | "link";
      provider: "x" | "youtube" | "kalshi" | "polymarket" | null;
      canonical_url: string;
      original_url: string;
      state: "embed" | "preview" | "unavailable";
      title: string | null;
      image_url: string | null;
      preview: Record<string, unknown> | null;
      oembed_html: string | null;
      oembed_cache_age: number | null;
    }> =>
      request(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/link-preview`,
        { url },
      )),
  };
}
