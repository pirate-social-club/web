import type {
  CommunityHandle,
  CommunityHandleClaimRequest,
  CommunityHandleMeResponse,
  CommunityHandlePolicy,
  CommunityHandleQuote,
  CommunityHandleQuoteRequest,
  UpdateCommunityHandlePolicyRequest,
} from "@pirate/api-contracts";

import type { ApiRequest } from "./client-internal";

export function createCommunityHandleApi(request: ApiRequest) {
  return {
    getMyHandle: (communityId: string): Promise<CommunityHandleMeResponse> =>
      request<CommunityHandleMeResponse>(
        `/communities/${encodeURIComponent(communityId)}/handles/me`,
      ),
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
  };
}
