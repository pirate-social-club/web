import type {
  CommentContext,
  CommentListResponse,
  CommentVoteResponse,
  CreateCommentRequest,
  CreatePostRequest,
  CreateSongArtifactBundleRequest,
  CreateSongArtifactUploadRequest,
  LocalizedPostResponse,
  Post,
  PostVoteResponse,
  SongArtifactBundle,
  SongArtifactUpload,
} from "@pirate/api-contracts";

import type {
  ApiSongArtifactUploadContentRequest,
  CommunityListCommentsOptions,
} from "./client-api-types";
import type { ApiRequest } from "./client-internal";

export function createPostsApi(request: ApiRequest) {
  return {
    get: (
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<LocalizedPostResponse> => {
      const params = new URLSearchParams();
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      return request<LocalizedPostResponse>(
        qs ? `/posts/${encodeURIComponent(postId)}?${qs}` : `/posts/${encodeURIComponent(postId)}`,
      );
    },
    vote: (postId: string, value: -1 | 1): Promise<PostVoteResponse> =>
      request<PostVoteResponse>(`/posts/${encodeURIComponent(postId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      }),
  };
}

export function createCommentsApi(request: ApiRequest) {
  return {
    listReplies: (
      commentId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/comments/${encodeURIComponent(commentId)}/replies`;
      return request<CommentListResponse>(qs ? `${path}?${qs}` : path);
    },
    getContext: (
      commentId: string,
      opts?: { limit?: string | null; cursor?: string | null; locale?: string | null },
    ): Promise<CommentContext> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      const path = `/comments/${encodeURIComponent(commentId)}/context`;
      return request<CommentContext>(qs ? `${path}?${qs}` : path);
    },
    createReply: (commentId: string, body: CreateCommentRequest): Promise<void> =>
      request(`/comments/${encodeURIComponent(commentId)}/replies`, {
        method: "POST",
        body: JSON.stringify(body),
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
    createPost: (communityId: string, body: CreatePostRequest): Promise<Post> =>
      request<Post>(`/communities/${encodeURIComponent(communityId)}/posts`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listComments: (
      communityId: string,
      postId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path =
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`;
      return request<CommentListResponse>(qs ? `${path}?${qs}` : path);
    },
    createComment: (
      communityId: string,
      postId: string,
      body: CreateCommentRequest,
    ): Promise<void> =>
      request(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createSongArtifactUpload: (
      communityId: string,
      body: CreateSongArtifactUploadRequest,
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    uploadSongArtifactContent: (
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
    getSongArtifactBundle: (
      communityId: string,
      songArtifactBundleId: string,
    ): Promise<SongArtifactBundle> =>
      request<SongArtifactBundle>(
        `/communities/${encodeURIComponent(communityId)}/song-artifacts/${encodeURIComponent(songArtifactBundleId)}`,
      ),
  };
}
