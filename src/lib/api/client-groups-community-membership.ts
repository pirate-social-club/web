import type {
  CommunityFollowResponse,
  CommunityPreview,
  JoinEligibility,
  MembershipRequestListResponse,
  MembershipRequestSummary,
} from "@pirate/api-contracts";

import { buildQueryPath, type ApiRequest } from "./client-internal";

export function createCommunityMembershipApi(request: ApiRequest) {
  return {
    join: (
      communityId: string,
      body?: { note?: string | null },
    ): Promise<{ community: string; status: string }> =>
      request<{ community: string; status: string }>(
        `/communities/${encodeURIComponent(communityId)}/join`,
        { method: "POST", body: JSON.stringify(body ?? {}) },
      ),
    follow: (communityId: string): Promise<CommunityFollowResponse> =>
      request<CommunityFollowResponse>(
        `/communities/${encodeURIComponent(communityId)}/follow`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    unfollow: (communityId: string): Promise<CommunityFollowResponse> =>
      request<CommunityFollowResponse>(
        `/communities/${encodeURIComponent(communityId)}/unfollow`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    preview: (communityId: string, opts?: { locale?: string | null }): Promise<CommunityPreview> => {
      return request<CommunityPreview>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/preview`,
        { locale: opts?.locale },
      ));
    },
    getJoinEligibility: (communityId: string): Promise<JoinEligibility> =>
      request<JoinEligibility>(
        `/communities/${encodeURIComponent(communityId)}/join-eligibility`,
      ),
    listMembershipRequests: (communityId: string): Promise<MembershipRequestListResponse> =>
      request<MembershipRequestListResponse>(
        `/communities/${encodeURIComponent(communityId)}/membership-requests`,
      ),
    approveMembershipRequest: (
      communityId: string,
      membershipRequestId: string,
    ): Promise<MembershipRequestSummary> =>
      request<MembershipRequestSummary>(
        `/communities/${encodeURIComponent(communityId)}/membership-requests/${encodeURIComponent(membershipRequestId)}/approve`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    rejectMembershipRequest: (
      communityId: string,
      membershipRequestId: string,
    ): Promise<MembershipRequestSummary> =>
      request<MembershipRequestSummary>(
        `/communities/${encodeURIComponent(communityId)}/membership-requests/${encodeURIComponent(membershipRequestId)}/reject`,
        { method: "POST", body: JSON.stringify({}) },
      ),
  };
}
