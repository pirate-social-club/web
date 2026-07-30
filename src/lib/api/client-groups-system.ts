import type {
  DismissTaskRequest,
  Job,
  MarkNotificationsReadRequest,
  ClaimableRoyaltiesResponse,
  NotificationFeedResponse,
  NotificationSummary,
  NotificationTasksResponse,
  RewardCampaign,
  RewardCampaignCapabilities,
  RewardCampaignCreateRequest,
  RewardCampaignFundingConfirmRequest,
  RewardCampaignFundingQuote,
  RewardCampaignFundingQuoteRequest,
  RewardSongOwnerPolicy,
  RewardSongOwnerPolicyUpdateRequest,
  RoyaltyActivityResponse,
  RoyaltyClaimHistoryResponse,
  RoyaltyClaimRecord,
  RoyaltyClaimRecordRequest,
  UserTask,
} from "@pirate/api-contracts";

import type { NotificationFeedOptions } from "./client-api-types";
import type {
  ApiPublicRewardOffer,
  ApiRewardCampaignFundingConfirmation,
  ApiRewardCashoutRequest,
  ApiRewardCashoutResponse,
  ApiRewardsSummaryResponse,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

export function createJobsApi(request: ApiRequest) {
  return {
    get: (jobId: string): Promise<Job> => request<Job>(`/jobs/${encodeURIComponent(jobId)}`),
  };
}

export function createNotificationsApi(request: ApiRequest) {
  return {
    getSummary: (): Promise<NotificationSummary> =>
      request<NotificationSummary>("/notifications/summary"),
    getTasks: (): Promise<NotificationTasksResponse> =>
      request<NotificationTasksResponse>("/notifications/tasks"),
    getFeed: (opts?: NotificationFeedOptions): Promise<NotificationFeedResponse> => {
      return request<NotificationFeedResponse>(
        buildQueryPath("/notifications/feed", {
          cursor: opts?.cursor,
          limit: opts?.limit,
        }),
      );
    },
    markRead: (input?: MarkNotificationsReadRequest): Promise<{ ok: boolean }> =>
      request<{ ok: boolean }>("/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify(input ?? {}),
      }),
    dismissTask: (input: DismissTaskRequest): Promise<UserTask> =>
      request<UserTask>("/notifications/dismiss-task", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}

export function createRoyaltiesApi(request: ApiRequest) {
  return {
    listClaimable: (): Promise<ClaimableRoyaltiesResponse> =>
      request<ClaimableRoyaltiesResponse>("/royalties/claimable"),
    listActivity: (opts?: NotificationFeedOptions): Promise<RoyaltyActivityResponse> =>
      request<RoyaltyActivityResponse>(
        buildQueryPath("/royalties/activity", {
          cursor: opts?.cursor,
          limit: opts?.limit,
        }),
      ),
    listClaims: (opts?: Pick<NotificationFeedOptions, "limit">): Promise<RoyaltyClaimHistoryResponse> =>
      request<RoyaltyClaimHistoryResponse>(
        buildQueryPath("/royalties/claims", {
          limit: opts?.limit,
        }),
      ),
    recordClaim: (input: RoyaltyClaimRecordRequest): Promise<RoyaltyClaimRecord> =>
      request<RoyaltyClaimRecord>("/royalties/claims", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}

export function createRewardsApi(request: ApiRequest) {
  return {
    getActiveCampaignForSong: (communityId: string, postId: string): Promise<ApiPublicRewardOffer> =>
      request<ApiPublicRewardOffer>(
        buildQueryPath("/public/reward_campaigns", {
          community_id: communityId,
          post_id: postId,
        }),
        { tokenRequired: false },
      ),
    getSummary: (): Promise<ApiRewardsSummaryResponse> =>
      request<ApiRewardsSummaryResponse>("/me/rewards"),
    cashOut: (input: ApiRewardCashoutRequest): Promise<ApiRewardCashoutResponse> =>
      request<ApiRewardCashoutResponse>("/me/rewards/cashouts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getCashout: (cashoutId: string): Promise<ApiRewardCashoutResponse> =>
      request<ApiRewardCashoutResponse>(`/me/rewards/cashouts/${encodeURIComponent(cashoutId)}`),

    // --- Booster (rewarder) side: create → quote → confirm funding funnel. ---
    getCampaignCapabilities: (postId: string): Promise<RewardCampaignCapabilities> =>
      request<RewardCampaignCapabilities>(
        buildQueryPath("/reward_campaign_capabilities", { post_id: postId }),
      ),

    getSongOwnerPolicy: (
      communityId: string,
      postId: string,
    ): Promise<RewardSongOwnerPolicy> =>
      request<RewardSongOwnerPolicy>(
        `/reward_song_policies/${encodeURIComponent(communityId)}/${encodeURIComponent(postId)}`,
      ),
    updateSongOwnerPolicy: (
      communityId: string,
      postId: string,
      input: RewardSongOwnerPolicyUpdateRequest,
    ): Promise<RewardSongOwnerPolicy> =>
      request<RewardSongOwnerPolicy>(
        `/reward_song_policies/${encodeURIComponent(communityId)}/${encodeURIComponent(postId)}`,
        { method: "PUT", body: JSON.stringify(input) },
      ),

    createCampaign: (input: RewardCampaignCreateRequest): Promise<RewardCampaign> =>
      request<RewardCampaign>("/reward_campaigns", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getCampaign: (campaignId: string): Promise<RewardCampaign> =>
      request<RewardCampaign>(`/reward_campaigns/${encodeURIComponent(campaignId)}`),

    createFundingQuote: (
      campaignId: string,
      input: RewardCampaignFundingQuoteRequest,
    ): Promise<RewardCampaignFundingQuote> =>
      request<RewardCampaignFundingQuote>(
        `/reward_campaigns/${encodeURIComponent(campaignId)}/funding_quotes`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    confirmFundingQuote: (
      campaignId: string,
      quoteId: string,
      input: RewardCampaignFundingConfirmRequest,
    ): Promise<ApiRewardCampaignFundingConfirmation> =>
      request<ApiRewardCampaignFundingConfirmation>(
        `/reward_campaigns/${encodeURIComponent(campaignId)}/funding_quotes/${encodeURIComponent(quoteId)}/confirm`,
        { method: "POST", body: JSON.stringify(input) },
      ),
  };
}
