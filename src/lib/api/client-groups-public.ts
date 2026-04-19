import type {
  CommentListResponse,
  CommunityPreview,
  LocalizedPostResponse,
  Profile,
} from "@pirate/api-contracts";

import type {
  ApiProfileMediaUploadResponse,
  ApiPublicProfileResolution,
  CommunityListCommentsOptions,
  CommunityListPostsOptions,
  HandleUpgradeQuoteResponse,
  ProfileUpdateInput,
  RenameHandleResponse,
} from "./client-api-types";
import type { ApiRequest } from "./client-internal";

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

export function createPublicCommunitiesApi(request: ApiRequest) {
  return {
    get: (communityId: string): Promise<CommunityPreview> =>
      request<CommunityPreview>(`/public-communities/${encodeURIComponent(communityId)}`, {
        tokenRequired: false,
      }),
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.flair_id) params.set("flair_id", opts.flair_id);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/public-communities/${encodeURIComponent(communityId)}/posts`;
      return request<{ items: LocalizedPostResponse[] }>(qs ? `${path}?${qs}` : path, {
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
      const params = new URLSearchParams();
      if (opts?.locale) params.set("locale", opts.locale);
      const qs = params.toString();
      const path = `/public-posts/${encodeURIComponent(postId)}`;
      return request<LocalizedPostResponse>(qs ? `${path}?${qs}` : path, {
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
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/public-comments/posts/${encodeURIComponent(postId)}/comments`;
      return request<CommentListResponse>(qs ? `${path}?${qs}` : path, {
        tokenRequired: false,
      });
    },
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
      const path = `/public-comments/${encodeURIComponent(commentId)}/replies`;
      return request<CommentListResponse>(qs ? `${path}?${qs}` : path, {
        tokenRequired: false,
      });
    },
  };
}
