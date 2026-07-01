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
  SongKaraokePayload,
} from "@pirate/api-contracts";

import type {
  ApiDerivativeSourceListResponse,
  ApiDerivativeSourceQueryKind,
  ApiDerivativeSourceScope,
  ApiSongArtifactUploadCompleteRequest,
  ApiSongArtifactUploadContentRequest,
  ApiSongArtifactUploadPartSignedUrlResponse,
  CommunityListCommentsOptions,
  KaraokeSessionCreateApiResponse,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

const ALTCHA_HEADER = "x-pirate-altcha";

type AltchaRequestOptions = {
  altchaPayload?: string | null | undefined;
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
    vote: (postId: string, value: -1 | 1, options?: AltchaRequestOptions): Promise<PostVoteResponse> =>
      request<PostVoteResponse>(`/posts/${encodeURIComponent(postId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
        headers: altchaHeaders(options),
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
    cancelEvent: (communityId: string, postId: string): Promise<LocalizedPostResponse> =>
      request<LocalizedPostResponse>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/event-status`,
        { method: "POST", body: JSON.stringify({ status: "canceled" }) },
      ),
    createKaraokeSession: (
      communityId: string,
      postId: string,
      idempotencyKey: string,
      signal?: AbortSignal,
    ): Promise<KaraokeSessionCreateApiResponse> =>
      request<KaraokeSessionCreateApiResponse>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/karaoke/sessions`,
        { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, signal },
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
    vote: (commentId: string, value: -1 | 1, options?: AltchaRequestOptions): Promise<CommentVoteResponse> =>
      request<CommentVoteResponse>(`/comments/${encodeURIComponent(commentId)}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
        headers: altchaHeaders(options),
      }),
  };
}

export function createCommunityContentApi(request: ApiRequest) {
  return {
    getPostKaraoke: (
      communityId: string,
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<SongKaraokePayload> =>
      request<SongKaraokePayload>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/karaoke`, {
          locale: opts?.locale,
        }),
        { tokenOptional: true },
      ),
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
    listEvents: (
      communityId: string,
      opts?: {
        from?: number | null;
        limit?: number | null;
        locale?: string | null;
        status?: "scheduled" | "canceled" | "postponed" | "ended" | "all" | null;
        to?: number | null;
      },
    ): Promise<{ items: LocalizedPostResponse[]; next_cursor: string | null }> =>
      request<{ items: LocalizedPostResponse[]; next_cursor: string | null }>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/events`, {
          from: opts?.from == null ? null : String(opts.from),
          limit: opts?.limit == null ? null : String(opts.limit),
          locale: opts?.locale,
          status: opts?.status,
          to: opts?.to == null ? null : String(opts.to),
        }),
      ),
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
      onProgress?: (fraction: number) => void,
    ): Promise<SongArtifactUpload> => {
      const isBinary = body instanceof ArrayBuffer;
      return request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/content`,
        {
          method: "PUT",
          body: isBinary ? body : JSON.stringify(body),
          headers: isBinary ? { "Content-Type": "application/octet-stream" } : undefined,
          onUploadProgress: isBinary ? onProgress : undefined,
        },
      );
    },
    getArtifactUploadPartSignedUrl: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
      partNumber: number,
    ): Promise<ApiSongArtifactUploadPartSignedUrlResponse> =>
      request<ApiSongArtifactUploadPartSignedUrlResponse>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/parts/${encodeURIComponent(String(partNumber))}/signed-url`,
      ),
    completeArtifactUploadSession: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
      body: ApiSongArtifactUploadCompleteRequest,
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/complete`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    abortArtifactUploadSession: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
    ): Promise<void> =>
      request<void>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/abort`,
        { method: "POST" },
      ),
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
    listDerivativeSources: (
      communityId: string,
      opts?: {
        kind?: ApiDerivativeSourceQueryKind | null;
        scope?: ApiDerivativeSourceScope | null;
        q?: string | null;
        limit?: number | null;
      },
    ): Promise<ApiDerivativeSourceListResponse> =>
      request<ApiDerivativeSourceListResponse>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/derivative-sources`, {
          kind: opts?.kind,
          scope: opts?.scope,
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
