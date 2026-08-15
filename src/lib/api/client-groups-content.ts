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
  SongStreakLeaderboard,
} from "@pirate/api-contracts";

import type {
  ApiDerivativeSourceListResponse,
  ApiDerivativeSourceQueryKind,
  ApiDerivativeSourceScope,
  ApiSongArtifactUploadCompleteRequest,
  ApiSongArtifactUploadContentRequest,
  ApiSongArtifactUploadPartSignedUrlResponse,
  CommunityListCommentsOptions,
  KaraokeSongLeaderboard,
  KaraokeSessionCreateApiResponse,
  SongStudyAttemptRequest,
  SongStudyAttemptResult,
  SongStudyPayload,
  SongStudyTranscriptionResponse,
  TelegramStudyVoiceIntent,
  ApiContentBlob,
  ApiLearningDeckDraft,
  ApiLearningDeckValidation,
  ApiLearningStudySession,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";
import { deviceTimezone } from "@/lib/device-timezone";

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
    clearVote: (postId: string, options?: AltchaRequestOptions): Promise<{ post: string; value: null }> =>
      request<{ post: string; value: null }>(`/posts/${encodeURIComponent(postId)}/clear_vote`, {
        method: "POST",
        body: JSON.stringify({}),
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
        {
          method: "POST",
          // Device timezone lets the server pin the singer's own streak day
          // boundary when the take qualifies. Optional server-side.
          body: JSON.stringify({ timezone: deviceTimezone() }),
          headers: { "Idempotency-Key": idempotencyKey },
          signal,
        },
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
    ): Promise<Comment> =>
      request<Comment>(`/comments/${encodeURIComponent(commentId)}/replies`, {
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
    getPostStreakLeaderboard: (
      communityId: string,
      postId: string,
      opts?: { limit?: number | null },
    ): Promise<SongStreakLeaderboard> =>
      request<SongStreakLeaderboard>(
        buildQueryPath(
          `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/streaks/leaderboard`,
          { limit: opts?.limit },
        ),
      ),
    getPostKaraokeLeaderboard: (
      communityId: string,
      postId: string,
      opts?: { limit?: number | null },
    ): Promise<KaraokeSongLeaderboard> =>
      request<KaraokeSongLeaderboard>(
        buildQueryPath(
          `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/karaoke/leaderboard`,
          { limit: opts?.limit },
        ),
      ),
    getPostStudy: (
      communityId: string,
      postId: string,
      opts?: { targetLanguage?: string | null },
    ): Promise<SongStudyPayload> =>
      request<SongStudyPayload>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study`, {
          target_language: opts?.targetLanguage,
        }),
      ),
    submitPostStudyAttempt: (
      communityId: string,
      postId: string,
      body: SongStudyAttemptRequest,
    ): Promise<SongStudyAttemptResult> =>
      request<SongStudyAttemptResult>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study/attempts`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createPostStudyTelegramVoiceIntent: (
      communityId: string,
      postId: string,
      body: { exercise_id: string; target_language?: string | null },
    ): Promise<TelegramStudyVoiceIntent> =>
      request<TelegramStudyVoiceIntent>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study/telegram_voice_intents`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    transcribePostStudyAudio: (
      communityId: string,
      postId: string,
      input: { file: File },
    ): Promise<SongStudyTranscriptionResponse> => {
      const body = new FormData();
      body.set("file", input.file);
      return request<SongStudyTranscriptionResponse>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/study/transcriptions`,
        { method: "POST", body },
      );
    },
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
    createContentBlob: (
      communityId: string,
      body: {
        validation_profile: "download_file_v1" | "deck_import_csv_v1";
        declared_filename: string;
        declared_mime_type: string;
        declared_size_bytes: number;
        declared_content_hash?: string | null;
        upload_mode: "proxy";
      },
    ): Promise<ApiContentBlob> =>
      request<ApiContentBlob>(`/communities/${encodeURIComponent(communityId)}/content-blobs`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    uploadContentBlob: async (
      communityId: string,
      contentBlobId: string,
      content: ArrayBuffer,
      mimeType: string,
      onUploadProgress?: (fraction: number) => void,
    ): Promise<ApiContentBlob> =>
      request<ApiContentBlob>(`/communities/${encodeURIComponent(communityId)}/content-blobs/${encodeURIComponent(contentBlobId)}/content`, {
        method: "PUT",
        body: content,
        headers: { "Content-Type": mimeType },
        onUploadProgress,
      }),
    getContentBlob: (communityId: string, contentBlobId: string): Promise<ApiContentBlob> =>
      request<ApiContentBlob>(`/communities/${encodeURIComponent(communityId)}/content-blobs/${encodeURIComponent(contentBlobId)}`),
    createLearningDeck: (
      communityId: string,
      body: { title: string; description?: string | null },
    ): Promise<ApiLearningDeckDraft> =>
      request<ApiLearningDeckDraft>(`/communities/${encodeURIComponent(communityId)}/learning-decks`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getLearningDeck: (communityId: string, deckId: string): Promise<ApiLearningDeckDraft> =>
      request<ApiLearningDeckDraft>(`/communities/${encodeURIComponent(communityId)}/learning-decks/${encodeURIComponent(deckId)}`),
    getLearningDeckByAsset: (communityId: string, assetId: string): Promise<ApiLearningDeckDraft> =>
      request<ApiLearningDeckDraft>(`/communities/${encodeURIComponent(communityId)}/learning-decks/by-asset/${encodeURIComponent(assetId)}`),
    upsertLearningDeckCard: (
      communityId: string,
      deckId: string,
      body: { card_id?: string; card_type: "basic" | "cloze"; prompt: string; answer: string; tags?: string[]; ordinal?: number },
    ): Promise<ApiLearningDeckDraft> =>
      request<ApiLearningDeckDraft>(`/communities/${encodeURIComponent(communityId)}/learning-decks/${encodeURIComponent(deckId)}/cards`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    validateLearningDeck: (communityId: string, deckId: string): Promise<ApiLearningDeckValidation> =>
      request<ApiLearningDeckValidation>(`/communities/${encodeURIComponent(communityId)}/learning-decks/${encodeURIComponent(deckId)}/validate`, { method: "POST", body: JSON.stringify({}) }),
    previewLearningDeckCsv: (communityId: string, csv: string): Promise<unknown> =>
      request<unknown>(`/communities/${encodeURIComponent(communityId)}/learning-decks/imports/preview`, { method: "POST", body: JSON.stringify({ csv }) }),
    commitLearningDeckCsv: (communityId: string, deckId: string, body: { csv: string; prompt_column: number; answer_column: number; tags_column?: number | null }): Promise<ApiLearningDeckDraft> =>
      request<ApiLearningDeckDraft>(`/communities/${encodeURIComponent(communityId)}/learning-decks/${encodeURIComponent(deckId)}/imports/commit`, { method: "POST", body: JSON.stringify(body) }),
    createLearningStudySession: (communityId: string, deckId: string, body?: { now_ms?: number; limit?: number }): Promise<ApiLearningStudySession> =>
      request<ApiLearningStudySession>(`/communities/${encodeURIComponent(communityId)}/learning-decks/${encodeURIComponent(deckId)}/study-sessions`, { method: "POST", body: JSON.stringify(body ?? {}) }),
    getLearningStudySession: (communityId: string, sessionId: string): Promise<ApiLearningStudySession> =>
      request<ApiLearningStudySession>(`/communities/${encodeURIComponent(communityId)}/learning-study-sessions/${encodeURIComponent(sessionId)}`),
    revealLearningStudyItem: (communityId: string, sessionId: string, expectedSessionRevision: number): Promise<ApiLearningStudySession> =>
      request<ApiLearningStudySession>(`/communities/${encodeURIComponent(communityId)}/learning-study-sessions/${encodeURIComponent(sessionId)}/reveal`, { method: "POST", body: JSON.stringify({ expected_session_revision: expectedSessionRevision }) }),
    rateLearningStudyItem: (communityId: string, sessionId: string, body: { item_id: string; rating: "again" | "hard" | "good" | "easy"; idempotency_key: string; expected_session_revision: number; reviewed_at_ms?: number }): Promise<ApiLearningStudySession> =>
      request<ApiLearningStudySession>(`/communities/${encodeURIComponent(communityId)}/learning-study-sessions/${encodeURIComponent(sessionId)}/rate`, { method: "POST", body: JSON.stringify(body) }),
    listPendingPosts: (
      communityId: string,
      opts?: { locale?: string | null },
    ): Promise<{ items: LocalizedPostResponse[]; next_cursor: string | null }> =>
      request<{ items: LocalizedPostResponse[]; next_cursor: string | null }>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/posts/pending`, {
          locale: opts?.locale,
        }),
      ),
    retryPostPublish: (
      communityId: string,
      postId: string,
    ): Promise<Post> =>
      request<Post>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/publish-retry`,
        { method: "POST" },
      ),
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
    ): Promise<Comment> =>
      request<Comment>(
        `/communities/${encodeURIComponent(communityId)}/posts/${encodeURIComponent(postId)}/comments`,
        { method: "POST", body: JSON.stringify(body), headers: altchaHeaders(options) },
      ),
    createArtifactUpload: (
      communityId: string,
      body: CreateSongArtifactUploadRequest,
      options?: { timeoutMs?: number | null },
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads`,
        { method: "POST", body: JSON.stringify(body), timeoutMs: options?.timeoutMs },
      ),
    uploadArtifactContent: (
      communityId: string,
      songArtifactUploadId: string,
      body: ArrayBuffer | ApiSongArtifactUploadContentRequest,
      options?: ((fraction: number) => void) | { onProgress?: (fraction: number) => void; timeoutMs?: number | null },
    ): Promise<SongArtifactUpload> => {
      const isBinary = body instanceof ArrayBuffer;
      const uploadOptions = typeof options === "function" ? { onProgress: options } : options;
      return request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/content`,
        {
          method: "PUT",
          body: isBinary ? body : JSON.stringify(body),
          headers: isBinary ? { "Content-Type": "application/octet-stream" } : undefined,
          onUploadProgress: isBinary ? uploadOptions?.onProgress : undefined,
          timeoutMs: uploadOptions?.timeoutMs,
        },
      );
    },
    getArtifactUploadPartSignedUrl: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
      partNumber: number,
      options?: { timeoutMs?: number | null },
    ): Promise<ApiSongArtifactUploadPartSignedUrlResponse> =>
      request<ApiSongArtifactUploadPartSignedUrlResponse>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/parts/${encodeURIComponent(String(partNumber))}/signed-url`,
        { timeoutMs: options?.timeoutMs },
      ),
    completeArtifactUploadSession: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
      body: ApiSongArtifactUploadCompleteRequest,
      options?: { timeoutMs?: number | null },
    ): Promise<SongArtifactUpload> =>
      request<SongArtifactUpload>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/complete`,
        { method: "POST", body: JSON.stringify(body), timeoutMs: options?.timeoutMs },
      ),
    abortArtifactUploadSession: (
      communityId: string,
      songArtifactUploadId: string,
      sessionId: string,
      options?: { timeoutMs?: number | null },
    ): Promise<void> =>
      request<void>(
        `/communities/${encodeURIComponent(communityId)}/song-artifact-uploads/${encodeURIComponent(songArtifactUploadId)}/sessions/${encodeURIComponent(sessionId)}/abort`,
        { method: "POST", timeoutMs: options?.timeoutMs },
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
