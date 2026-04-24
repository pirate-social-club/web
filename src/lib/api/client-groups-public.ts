import type {
  CommentListResponse,
  CommunityPreview,
  LocalizedPostResponse,
  Profile,
} from "@pirate/api-contracts";

import type {
  ApiProfileMediaUploadResponse,
  ApiPublicAgentResolution,
  ApiPublicProfileResolution,
  CommunityListCommentsOptions,
  CommunityListPostsOptions,
  HandleUpgradeQuoteResponse,
  ProfileUpdateInput,
  RenameHandleResponse,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

export function createProfilesApi(request: ApiRequest) {
  return {
    getMe: (): Promise<Profile> => request<Profile>("/profiles/me"),
    getByUserId: (userId: string): Promise<Profile> =>
      request<Profile>(`/profiles/${encodeURIComponent(userId)}`, { tokenRequired: false }),
    updateMe: (input: ProfileUpdateInput): Promise<Profile> =>
      request<Profile>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    syncLinkedHandles: (): Promise<Profile> =>
      request<Profile>("/profiles/me/linked-handles/sync", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    setPrimaryPublicHandle: (linkedHandleId: string | null): Promise<Profile> =>
      request<Profile>("/profiles/me/primary-public-handle", {
        method: "POST",
        body: JSON.stringify({ linked_handle_id: linkedHandleId }),
      }),
    uploadMedia: (
      input: { kind: "avatar" | "cover"; file: File },
    ): Promise<ApiProfileMediaUploadResponse> => {
      const formData = new FormData();
      formData.set("kind", input.kind);
      formData.set("file", input.file);
      return request<ApiProfileMediaUploadResponse>("/profile-media", {
        method: "POST",
        body: formData,
      });
    },
    renameHandle: (desiredLabel: string): Promise<RenameHandleResponse> =>
      request("/profiles/me/global-handle/rename", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
    claimRedditHandle: (desiredLabel: string): Promise<RenameHandleResponse> =>
      request("/profiles/me/global-handle/reddit-claim", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
    quoteHandleUpgrade: (desiredLabel: string): Promise<HandleUpgradeQuoteResponse> =>
      request("/profiles/me/global-handle/upgrade-quote", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
  };
}

export function createPublicProfilesApi(request: ApiRequest) {
  return {
    getByHandle: (handleLabel: string): Promise<ApiPublicProfileResolution> =>
      request<ApiPublicProfileResolution>(`/public-profiles/${encodeURIComponent(handleLabel)}`, {
        tokenRequired: false,
      }),
  };
}

export function createPublicAgentsApi(request: ApiRequest) {
  return {
    getByHandle: (handleLabel: string): Promise<ApiPublicAgentResolution> =>
      request<ApiPublicAgentResolution>(`/public-agents/${encodeURIComponent(handleLabel)}`, {
        tokenRequired: false,
      }),
  };
}

export function createPublicCommunitiesApi(request: ApiRequest) {
  return {
    get: (communityId: string, opts?: { locale?: string | null }): Promise<CommunityPreview> => {
      return request<CommunityPreview>(buildQueryPath(
        `/public-communities/${encodeURIComponent(communityId)}`,
        { locale: opts?.locale },
      ), {
        tokenRequired: false,
      });
    },
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      return request<{ items: LocalizedPostResponse[] }>(buildQueryPath(
        `/public-communities/${encodeURIComponent(communityId)}/posts`,
        {
          cursor: opts?.cursor,
          flair_id: opts?.flair_id,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ), {
        tokenRequired: false,
      });
    },
  };
}

export function createPublicPostsApi(request: ApiRequest) {
  return {
    get: (
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<LocalizedPostResponse> => {
      return request<LocalizedPostResponse>(buildQueryPath(
        `/public-posts/${encodeURIComponent(postId)}`,
        { locale: opts?.locale },
      ), {
        tokenRequired: false,
      });
    },
  };
}

export function createPublicCommentsApi(request: ApiRequest) {
  return {
    listPostComments: (
      postId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return request<CommentListResponse>(buildQueryPath(
        `/public-comments/posts/${encodeURIComponent(postId)}/comments`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ), {
        tokenRequired: false,
      });
    },
    listReplies: (
      commentId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return request<CommentListResponse>(buildQueryPath(
        `/public-comments/${encodeURIComponent(commentId)}/replies`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ), {
        tokenRequired: false,
      });
    },
  };
}
