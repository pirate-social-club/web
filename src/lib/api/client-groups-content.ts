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
  ApiDerivativeSourceListResponse,
  ApiDerivativeSourceQueryKind,
  ApiDerivativeSourceScope,
  ApiSongArtifactUploadContentRequest,
  CommunityListCommentsOptions,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

const ALTCHA_HEADER = "x-pirate-altcha";
const SUBMIT_TRACE_HEADER = "x-pirate-submit-trace-id";

type AltchaRequestOptions = {
  altchaPayload?: string | null | undefined;
};

type SubmitTraceRequestOptions = {
  submitTraceId?: string | null | undefined;
};

function requestHeaders(options?: AltchaRequestOptions & SubmitTraceRequestOptions): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  const payload = options?.altchaPayload?.trim();
  if (payload) {
    headers[ALTCHA_HEADER] = payload;
  }
  const submitTraceId = options?.submitTraceId?.trim();
  if (submitTraceId) {
    headers[SUBMIT_TRACE_HEADER] = submitTraceId;
  }
  return Object.keys(headers).length ? headers : undefined;
}

function altchaHeaders(options?: AltchaRequestOptions): HeadersInit | undefined {
  return requestHeaders(options);
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
    createPost: (
      communityId: string,
      body: CreatePostRequest,
      options?: AltchaRequestOptions & SubmitTraceRequestOptions,
    ): Promise<Post> =>
      request<Post>(`/communities/${encodeURIComponent(communityId)}/posts`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: requestHeaders(options),
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
      options?: SubmitTraceRequestOptions,
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
        { method: "POST", body: JSON.stringify(body), headers: requestHeaders(options) },
      ),
    uploadArtifactContent: (
      communityId: string,
      songArtifactUploadId: string,
      body: ArrayBuffer | ApiSongArtifactUploadContentRequest,
      options?: SubmitTraceRequestOptions,
    ): Promise<SongArtifactUpload> => {
      const isBinary = body instanceof ArrayBuffer;
      return request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/content`,
        {
          method: "PUT",
          body: isBinary ? body : JSON.stringify(body),
          headers: isBinary
            ? { "Content-Type": "application/octet-stream", ...requestHeaders(options) }
            : requestHeaders(options),
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
