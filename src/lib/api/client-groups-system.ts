import type {
  DismissTaskRequest,
  Job,
  MarkNotificationsReadRequest,
  ClaimableRoyaltiesResponse,
  NotificationFeedResponse,
  NotificationSummary,
  NotificationTasksResponse,
  RoyaltyActivityResponse,
  RoyaltyClaimHistoryResponse,
  RoyaltyClaimRecord,
  RoyaltyClaimRecordRequest,
  UserTask,
} from "@pirate/api-contracts";

import type { NotificationFeedOptions } from "./client-api-types";
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
