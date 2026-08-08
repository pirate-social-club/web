import { buildQueryPath, type ApiRequest } from "./client-internal";

export interface ModerationCasePostPreview {
  post_id: string;
  post_type: string;
  status: string;
  title: string | null;
  body: string | null;
  caption: string | null;
  media_refs_json: string | null;
  author_handle: string | null;
}

interface ModerationCase {
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

interface ModerationSignal {
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

interface UserReport {
  user_report_id: string;
  community_id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_user_id: string;
  reason_code: string;
  note: string | null;
  created_at: string;
}

interface ModerationAction {
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

export interface MediaAnalysisResult {
  media_analysis_result_id: string;
  community_id: string;
  source_post_id: string | null;
  source_asset_id: string | null;
  outcome: "allow" | "allow_with_required_reference" | "review_required" | "blocked";
  content_safety_state: "pending" | "safe" | "sensitive" | "adult";
  age_gate_policy: "none" | "18_plus";
  trigger_sources: unknown | null;
  acrcloud_music_match: unknown | null;
  acrcloud_custom_match: unknown | null;
  acrcloud_error_code: string | null;
  acrcloud_error_message: string | null;
  acrcloud_checked_at: string | null;
  safety_signals: unknown | null;
  authenticity_signals: unknown | null;
  policy_reason_code: string | null;
  policy_reason: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RightsReviewCase {
  rights_review_case_id: string;
  subject_type: "asset" | "post" | "live_room" | "replay_asset";
  subject_id: string;
  community_id: string;
  status: "open" | "under_review" | "resolved" | "blocked";
  trigger_source: "acrcloud_match" | "declared_reference_mismatch" | "manual_report" | "operator_escalation";
  analysis_result_ref: string | null;
  submitted_evidence_refs: unknown | null;
  resolution: "clear" | "clear_with_upstream_refs" | "block" | "needs_more_evidence" | null;
  resolver_user_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface RightsReviewCaseListItem extends RightsReviewCase {
  analysis: MediaAnalysisResult | null;
  post: ModerationCasePostPreview | null;
}

export interface RightsReviewCaseListResponse {
  items: RightsReviewCaseListItem[];
  next_cursor: string | null;
}

export interface RightsReviewCaseDetail {
  case: RightsReviewCase;
  analysis: MediaAnalysisResult | null;
  post: unknown | null;
}

export interface CreateModerationActionRequest {
  action_type: "dismiss" | "hide" | "remove" | "restore" | "age_gate";
  note?: string | null;
}

export interface CreateRightsReviewActionRequest {
  action_type: "start_review" | "clear" | "clear_with_upstream_refs" | "needs_more_evidence" | "block";
  evidence_refs?: string[] | null;
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
    listRightsReviewCases: (
      communityId: string,
      opts?: { status?: string | null; limit?: number | null },
    ): Promise<RightsReviewCaseListResponse> =>
      request<RightsReviewCaseListResponse>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/rights-review/cases`,
        {
          status: opts?.status,
          limit: opts?.limit,
        },
      )),
    getRightsReviewCaseDetail: (
      communityId: string,
      rightsReviewCaseId: string,
    ): Promise<RightsReviewCaseDetail> =>
      request<RightsReviewCaseDetail>(
        `/communities/${encodeURIComponent(communityId)}/rights-review/cases/${encodeURIComponent(rightsReviewCaseId)}`,
      ),
    applyRightsReviewCaseAction: (
      communityId: string,
      rightsReviewCaseId: string,
      body: CreateRightsReviewActionRequest,
    ): Promise<RightsReviewCaseDetail> =>
      request<RightsReviewCaseDetail>(
        `/communities/${encodeURIComponent(communityId)}/rights-review/cases/${encodeURIComponent(rightsReviewCaseId)}/actions`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
