import { buildQueryPath, type ApiRequest } from "./client-internal";

export interface ModerationCasePostPreview {
  post_id: string;
  post_type: string;
  status: string;
  title: string | null;
  body: string | null;
  caption: string | null;
  media_refs_json: string | null;
}

export interface ModerationCase {
  moderation_case_id: string;
  community_id: string;
  post_id: string | null;
  comment_id: string | null;
  status: "open" | "resolved";
  queue_scope: "community" | "platform";
  priority: "low" | "medium" | "high";
  opened_by: "platform_analysis" | "user_report" | "mixed";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  post: ModerationCasePostPreview | null;
}

export interface ModerationSignal {
  moderation_signal_id: string;
  community_id: string;
  post_id: string | null;
  comment_id: string | null;
  analysis_result_ref: string | null;
  source: string;
  signal_type: string;
  severity: "low" | "medium" | "high";
  provider: string;
  provider_label: string;
  evidence_ref: string | null;
  created_at: string;
}

export interface UserReport {
  user_report_id: string;
  community_id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_user_id: string;
  reason_code: string;
  note: string | null;
  created_at: string;
}

export interface ModerationAction {
  moderation_action_id: string;
  moderation_case_id: string;
  community_id: string;
  post_id: string | null;
  comment_id: string | null;
  actor_user_id: string;
  action_type: "dismiss" | "hide" | "remove" | "restore" | "age_gate";
  note: string | null;
  created_at: string;
}

export interface ModerationCaseDetail {
  case: ModerationCase;
  post: unknown | null;
  comment: unknown | null;
  signals: ModerationSignal[];
  reports: UserReport[];
  actions: ModerationAction[];
}

export interface ModerationCaseListResponse {
  items: ModerationCase[];
  next_cursor: string | null;
}

export interface CreateModerationActionRequest {
  action_type: "dismiss" | "hide" | "remove" | "restore" | "age_gate";
  note?: string | null;
}

export function createCommunityModerationApi(request: ApiRequest) {
  return {
    listModerationCases: (communityId: string): Promise<ModerationCaseListResponse> =>
      request<ModerationCaseListResponse>(
        `/communities/${encodeURIComponent(communityId)}/moderation/cases`,
      ),
    getModerationCaseDetail: (
      communityId: string,
      moderationCaseId: string,
    ): Promise<ModerationCaseDetail> =>
      request<ModerationCaseDetail>(
        `/communities/${encodeURIComponent(communityId)}/moderation/cases/${encodeURIComponent(moderationCaseId)}`,
      ),
    resolveModerationCase: (
      communityId: string,
      moderationCaseId: string,
      body: CreateModerationActionRequest,
    ): Promise<ModerationCaseDetail> =>
      request<ModerationCaseDetail>(
        `/communities/${encodeURIComponent(communityId)}/moderation/cases/${encodeURIComponent(moderationCaseId)}/actions`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
