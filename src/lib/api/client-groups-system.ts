import type {
  DismissTaskRequest,
  Job,
  MarkNotificationsReadRequest,
  NotificationFeedResponse,
  NotificationSummary,
  NotificationTasksResponse,
  UserTask,
} from "@pirate/api-contracts";

import type { NotificationFeedOptions } from "./client-api-types";
import type { ApiRequest } from "./client-internal";

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
      const params = new URLSearchParams();
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.limit) params.set("limit", String(opts.limit));
      const qs = params.toString();
      return request<NotificationFeedResponse>(
        qs ? `/notifications/feed?${qs}` : "/notifications/feed",
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
