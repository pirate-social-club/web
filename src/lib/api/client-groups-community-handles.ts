import type {
  CommunityHandle,
  CommunityHandleClaimRequest,
  CommunityHandleListResponse,
  CommunityHandleMeResponse,
  CommunityHandlePolicy,
  CommunityHandleQuote,
  CommunityHandleQuoteRequest,
  CommunityHandleReserveRequest,
  CommunityHandleRevokeRequest,
  CommunityHandleStatusResponse,
  UpdateCommunityHandlePolicyRequest,
} from "@pirate/api-contracts";

import type { ApiRequest } from "./client-internal";

export function createCommunityHandleApi(request: ApiRequest) {
  return {
    getMyHandle: (communityId: string): Promise<CommunityHandleMeResponse> =>
      request<CommunityHandleMeResponse>(
        `/communities/${encodeURIComponent(communityId)}/handles/me`,
      ),
    getHandleStatus: (communityId: string): Promise<CommunityHandleStatusResponse> =>
      request<CommunityHandleStatusResponse>(
        `/communities/${encodeURIComponent(communityId)}/handles/status`,
      ),
    listHandles: (
      communityId: string,
      params?: { status?: CommunityHandle["status"] | null },
    ): Promise<CommunityHandleListResponse> => {
      const search = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
      return request<CommunityHandleListResponse>(
        `/communities/${encodeURIComponent(communityId)}/handles${search}`,
      );
    },
    getHandlePolicy: (communityId: string): Promise<CommunityHandlePolicy> =>
      request<CommunityHandlePolicy>(
        `/communities/${encodeURIComponent(communityId)}/handle-policy`,
      ),
    updateHandlePolicy: (
      communityId: string,
      body: UpdateCommunityHandlePolicyRequest,
    ): Promise<CommunityHandlePolicy> =>
      request<CommunityHandlePolicy>(
        `/communities/${encodeURIComponent(communityId)}/handle-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    quoteHandle: (
      communityId: string,
      body: CommunityHandleQuoteRequest,
    ): Promise<CommunityHandleQuote> =>
      request<CommunityHandleQuote>(
        `/communities/${encodeURIComponent(communityId)}/handles/quote`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    claimHandle: (
      communityId: string,
      body: CommunityHandleClaimRequest,
    ): Promise<CommunityHandle> =>
      request<CommunityHandle>(
        `/communities/${encodeURIComponent(communityId)}/handles/claim`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    reserveHandle: (
      communityId: string,
      body: CommunityHandleReserveRequest,
    ): Promise<CommunityHandle> =>
      request<CommunityHandle>(
        `/communities/${encodeURIComponent(communityId)}/handles/reserve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    revokeHandle: (
      communityId: string,
      handleId: string,
      body: CommunityHandleRevokeRequest = {},
    ): Promise<CommunityHandle> =>
      request<CommunityHandle>(
        `/communities/${encodeURIComponent(communityId)}/handles/${encodeURIComponent(handleId)}/revoke`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
