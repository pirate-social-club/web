import type {
  CommentListResponse,
  CommunityPreview,
  GlobalHandle,
  LocalizedPostResponse,
  ProfileActivityResponse,
  Profile,
  PublicAgentResolution,
  PublicProfileResolution,
  SongKaraokePayload,
} from "@pirate/api-contracts";

import type {
  ApiLiveRoomAccessResponse,
  ApiLiveRoomReplayAccessResponse,
  ApiLiveRoomViewerAttachResponse,
  ApiLiveRoomViewerRenewRequest,
  ApiProfileMediaUploadResponse,
  CommunityListCommentsOptions,
  CommunityListPostsOptions,
  HandleUpgradeQuoteResponse,
  ProfileUpdateInput,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";
import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";

type PublicQueryParams = Record<string, string | number | boolean | null | undefined>;

export type PublicPostThreadResponse = {
  post: LocalizedPostResponse;
  community: CommunityPreview;
  comments: CommentListResponse;
};

type ApiCourtyardWalletInventoryGroup = Omit<CourtyardWalletInventoryGroup, "chainNamespace" | "contractAddress" | "displayLabel" | "displayDetail"> & {
  chain_namespace: "eip155:1" | "eip155:137";
  contract_address: string;
  display_label: string;
  display_detail?: string;
};

export type PublicCommunitySearchResponse = {
  query: string | null;
  communities: Array<{
    community: string;
    display_name: string;
    route_slug?: string | null;
    membership_mode: CommunityPreview["membership_mode"];
    guest_comment_policy: CommunityPreview["guest_comment_policy"];
    agent_posting_policy: CommunityPreview["agent_posting_policy"];
    agent_posting_scope: CommunityPreview["agent_posting_scope"];
    agent_daily_post_cap?: number | null;
    agent_daily_reply_cap?: number | null;
    accepted_agent_ownership_providers: CommunityPreview["accepted_agent_ownership_providers"];
    membership_gate_summaries: CommunityPreview["membership_gate_summaries"];
  }>;
  has_more: boolean;
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
    getActivity: (options?: {
      cursor?: string | null;
      limit?: number;
      locale?: string | null;
      tab?: "overview" | "posts" | "comments";
    }): Promise<ProfileActivityResponse> =>
      request<ProfileActivityResponse>(buildQueryPath("/profiles/me/activity", {
        cursor: options?.cursor ?? null,
        limit: options?.limit,
        locale: options?.locale ?? null,
        tab: options?.tab,
      })),
    getCourtyardInventory: async (): Promise<{
      groups: CourtyardWalletInventoryGroup[];
      unavailable: boolean;
    }> => {
      const response = await request<{
        groups: ApiCourtyardWalletInventoryGroup[];
        unavailable: boolean;
      }>("/profiles/me/courtyard-inventory");
      return {
        unavailable: response.unavailable,
        groups: response.groups.map((group) => ({
          ...group,
          chainNamespace: group.chain_namespace,
          contractAddress: group.contract_address,
          displayLabel: group.display_label,
          displayDetail: group.display_detail,
        })),
      };
    },
    getByUserId: (userId: string): Promise<Profile> =>
      request<Profile>(`/profiles/${encodeURIComponent(userId)}`, { tokenRequired: false }),
    getFollowState: (userId: string): Promise<{
      object: "profile_follow_state";
      target_user_id: string;
      target_wallet: { status: "available"; address: string } | { status: "no_wallet" };
      relationship: {
        status: "current" | "viewer_anonymous" | "viewer_no_wallet" | "unavailable";
        viewer_follows: boolean | null;
      };
      counts: {
        status: "current" | "unavailable" | "not_applicable";
        follower_count: number | null;
        following_count: number | null;
      };
      projection: {
        availability:
          | "current"
          | "projection_initializing"
          | "projection_stale"
          | "projection_rebuilding"
          | "projection_unavailable";
        revision: string;
        indexed_through_block: Array<{ chain_id: number; block_number: string }>;
      };
    }> =>
      request(`/profiles/${encodeURIComponent(userId)}/follow-state`, {
        tokenOptional: true,
      }),
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
    getActivity: (
      handleLabel: string,
      options?: {
        cursor?: string | null;
        limit?: number;
        locale?: string | null;
        tab?: "overview" | "posts" | "comments";
      },
    ): Promise<ProfileActivityResponse> =>
      publicGet<ProfileActivityResponse>(request, `/public-profiles/${encodeURIComponent(handleLabel)}/activity`, {
        cursor: options?.cursor ?? null,
        limit: options?.limit,
        locale: options?.locale ?? null,
        tab: options?.tab,
      }),
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
    search: (query: string, opts?: { limit?: number | null }): Promise<PublicCommunitySearchResponse> => {
      return publicGet<PublicCommunitySearchResponse>(
        request,
        "/public-communities",
        { query, limit: opts?.limit },
      );
    },
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
          has_event: opts?.has_event == null ? null : String(opts.has_event),
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      );
    },
    getLiveRoomAccess: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomAccessResponse> =>
      publicGet<ApiLiveRoomAccessResponse>(
        request,
        `/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/access`,
      ),
    getLiveRoomReplayAccess: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomReplayAccessResponse> =>
      publicGet<ApiLiveRoomReplayAccessResponse>(
        request,
        `/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay/access`,
      ),
    getLiveRoomReplayContent: (communityId: string, liveRoomId: string): Promise<Response> =>
      request<Response>(
        `/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/replay/content`,
        { responseType: "response", tokenRequired: false },
      ),
    viewerAttachLiveRoom: (communityId: string, liveRoomId: string): Promise<ApiLiveRoomViewerAttachResponse> =>
      request<ApiLiveRoomViewerAttachResponse>(
        `/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/viewer_attach`,
        { method: "POST", tokenRequired: false },
      ),
    viewerRenewLiveRoom: (
      communityId: string,
      liveRoomId: string,
      body: ApiLiveRoomViewerRenewRequest,
    ): Promise<ApiLiveRoomViewerAttachResponse> =>
      request<ApiLiveRoomViewerAttachResponse>(
        `/public-communities/${encodeURIComponent(communityId)}/live-rooms/${encodeURIComponent(liveRoomId)}/viewer_renew`,
        { method: "POST", body: JSON.stringify(body), tokenRequired: false },
      ),
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
    getKaraoke: (
      postId: string,
      opts?: { locale?: string | null },
    ): Promise<SongKaraokePayload> => {
      return publicGet<SongKaraokePayload>(
        request,
        `/public-posts/${encodeURIComponent(postId)}/karaoke`,
        { locale: opts?.locale },
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
