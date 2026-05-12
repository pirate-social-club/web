import type {
  CommentListResponse,
  CommunityPreview,
  GlobalHandle,
  LocalizedPostResponse,
  Profile,
  PublicAgentResolution,
  PublicProfileResolution,
} from "@pirate/api-contracts";

import type {
  ApiProfileMediaUploadResponse,
  CommunityListCommentsOptions,
  CommunityListPostsOptions,
  HandleUpgradeQuoteResponse,
  ProfileUpdateInput,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

type PublicQueryParams = Record<string, string | number | boolean | null | undefined>;

export type PublicPostThreadResponse = {
  post: LocalizedPostResponse;
  community: CommunityPreview;
  comments: CommentListResponse;
};

function publicGet<T>(
  request: ApiRequest,
  path: string,
  params?: PublicQueryParams,
): Promise<T> {
  return request<T>(params ? buildQueryPath(path, params) : path, {
    tokenRequired: false,
  });
}

export function createProfilesApi(request: ApiRequest) {
  return {
    getMe: (): Promise<Profile> => request<Profile>("/profiles/me"),
    getByUserId: (userId: string): Promise<Profile> =>
      request<Profile>(`/profiles/${encodeURIComponent(userId)}`, { tokenRequired: false }),
    updateMe: (input: ProfileUpdateInput): Promise<Profile> =>
      request<Profile>("/profiles/me", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    syncLinkedHandles: (): Promise<Profile> =>
      request<Profile>("/profiles/me/sync-linked-handles", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    setPrimaryPublicHandle: (linkedHandleId: string | null): Promise<Profile> =>
      request<Profile>("/profiles/me/set-primary-public-handle", {
        method: "POST",
        body: JSON.stringify({ linked_handle: linkedHandleId }),
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
    renameHandle: (desiredLabel: string): Promise<GlobalHandle> =>
      request<GlobalHandle>("/profiles/me/rename-global-handle", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
    claimRedditHandle: (desiredLabel: string): Promise<GlobalHandle> =>
      request<GlobalHandle>("/profiles/me/global-handle/reddit-claim", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
    quoteHandleUpgrade: (desiredLabel: string): Promise<HandleUpgradeQuoteResponse> =>
      request("/profiles/me/quote-handle-upgrade", {
        method: "POST",
        body: JSON.stringify({ desired_label: desiredLabel }),
      }),
    claimPaidHandle: (input: {
      quote: string;
      settlement_wallet_attachment: string;
      funding_tx_ref: string;
    }): Promise<GlobalHandle> =>
      request<GlobalHandle>("/profiles/me/global-handle/claim", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    publishXmtpInboxId: (xmtpInboxId: string | null): Promise<Profile> =>
      request<Profile>("/profiles/me/xmtp-inbox", {
        method: "POST",
        body: JSON.stringify({
          xmtp_inbox: xmtpInboxId,
        }),
      }),
  };
}

export function createPublicProfilesApi(request: ApiRequest) {
  return {
    getByHandle: (handleLabel: string): Promise<PublicProfileResolution> =>
      publicGet<PublicProfileResolution>(request, `/public-profiles/${encodeURIComponent(handleLabel)}`),
    getByWalletAddress: (walletAddress: string): Promise<PublicProfileResolution> =>
      publicGet<PublicProfileResolution>(request, `/public-profiles/by-wallet/${encodeURIComponent(walletAddress)}`),
  };
}

export function createPublicAgentsApi(request: ApiRequest) {
  return {
    getByHandle: (handleLabel: string): Promise<PublicAgentResolution> =>
      publicGet<PublicAgentResolution>(request, `/public-agents/${encodeURIComponent(handleLabel)}`),
  };
}

export function createPublicCommunitiesApi(request: ApiRequest) {
  return {
    get: (communityId: string, opts?: { locale?: string | null }): Promise<CommunityPreview> => {
      return publicGet<CommunityPreview>(
        request,
        `/public-communities/${encodeURIComponent(communityId)}`,
        { locale: opts?.locale },
      );
    },
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      return publicGet<{ items: LocalizedPostResponse[] }>(
        request,
        `/public-communities/${encodeURIComponent(communityId)}/posts`,
        {
          cursor: opts?.cursor,
          flair_id: opts?.flair_id,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      );
    },
  };
}

export function createPublicPostsApi(request: ApiRequest) {
  return {
    get: (
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<LocalizedPostResponse> => {
      return publicGet<LocalizedPostResponse>(
        request,
        `/public-posts/${encodeURIComponent(postId)}`,
        { locale: opts?.locale },
      );
    },
    getThread: (
      postId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<PublicPostThreadResponse> => {
      return publicGet<PublicPostThreadResponse>(
        request,
        `/public-posts/${encodeURIComponent(postId)}/thread`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      );
    },
  };
}

export function createPublicCommentsApi(request: ApiRequest) {
  return {
    listPostComments: (
      postId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return publicGet<CommentListResponse>(
        request,
        `/public-comments/posts/${encodeURIComponent(postId)}/comments`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      );
    },
    listReplies: (
      commentId: string,
      opts?: CommunityListCommentsOptions,
    ): Promise<CommentListResponse> => {
      return publicGet<CommentListResponse>(
        request,
        `/public-comments/${encodeURIComponent(commentId)}/replies`,
        {
          cursor: opts?.cursor,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      );
    },
  };
}
