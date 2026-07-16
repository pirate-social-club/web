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

import { buildQueryPath, type ApiRequest } from "./client-internal";

type CommunityNamespaceSelector = {
  namespaceVerification?: string | null;
};

function namespacePath(path: string, selector?: CommunityNamespaceSelector): string {
  return buildQueryPath(path, {
    namespace_verification: selector?.namespaceVerification,
  });
}

export function createCommunityHandleApi(request: ApiRequest) {
  return {
    getMyHandle: (
      communityId: string,
      selector?: CommunityNamespaceSelector,
    ): Promise<CommunityHandleMeResponse> =>
      request<CommunityHandleMeResponse>(
        namespacePath(`/communities/${encodeURIComponent(communityId)}/handles/me`, selector),
      ),
    getHandleStatus: (
      communityId: string,
      selector?: CommunityNamespaceSelector,
    ): Promise<CommunityHandleStatusResponse> =>
      request<CommunityHandleStatusResponse>(
        namespacePath(`/communities/${encodeURIComponent(communityId)}/handles/status`, selector),
      ),
    listHandles: (
      communityId: string,
      params?: { status?: CommunityHandle["status"] | null; namespaceVerification?: string | null },
    ): Promise<CommunityHandleListResponse> => {
      return request<CommunityHandleListResponse>(
        buildQueryPath(`/communities/${encodeURIComponent(communityId)}/handles`, {
          status: params?.status,
          namespace_verification: params?.namespaceVerification,
        }),
      );
    },
    getHandlePolicy: (
      communityId: string,
      selector?: CommunityNamespaceSelector,
    ): Promise<CommunityHandlePolicy> =>
      request<CommunityHandlePolicy>(
        namespacePath(`/communities/${encodeURIComponent(communityId)}/handle-policy`, selector),
      ),
    updateHandlePolicy: (
      communityId: string,
      body: UpdateCommunityHandlePolicyRequest,
      selector?: CommunityNamespaceSelector,
    ): Promise<CommunityHandlePolicy> =>
      request<CommunityHandlePolicy>(
        namespacePath(`/communities/${encodeURIComponent(communityId)}/handle-policy`, selector),
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
      selector?: CommunityNamespaceSelector,
    ): Promise<CommunityHandle> =>
      request<CommunityHandle>(
        namespacePath(`/communities/${encodeURIComponent(communityId)}/handles/reserve`, selector),
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
