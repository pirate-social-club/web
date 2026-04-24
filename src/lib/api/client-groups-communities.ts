import type {
  Asset,
  AssetAccessResponse,
  Community,
  CommunityCreateAcceptedResponse,
  CommunityFollowResponse,
  CommunityListing,
  CommunityListingListResponse,
  CommunityMoneyPolicy,
  CommunityPreview,
  CommunityPricingPolicy,
  CommunityPurchase,
  CommunityPurchaseListResponse,
  CommunityPurchaseQuote,
  CommunityPurchaseQuotePreflight,
  CommunityPurchaseQuotePreflightRequest,
  CommunityPurchaseQuoteRequest,
  CommunityPurchaseSettlement,
  CommunityPurchaseSettlementFailure,
  CommunityPurchaseSettlementFailureRequest,
  CommunityPurchaseSettlementRequest,
  CreateCommunityListingRequest,
  JoinEligibility,
  LocalizedPostResponse,
  UpdateCommunityListingRequest,
  UpdateCommunityMoneyPolicyRequest,
  UpdateCommunityPricingPolicyRequest,
} from "@pirate/api-contracts";

import type {
  ApiCommunityDonationPolicyResponse,
  ApiCommunityGatesUpdateRequest,
  ApiCommunityMachineAccessPolicy,
  ApiCommunityMachineAccessPolicyUpdate,
  ApiCommunityMediaUploadResponse,
  ApiCommunityRuleInput,
  ApiCommunitySafetyUpdateRequest,
  ApiCreateCommunityRequest,
  ApiUpdateCommunityRequest,
  ApiResolveDonationPartnerResponse,
  CommunityLabelPolicyInput,
  CommunityListPostsOptions,
  CommunityReferenceLinksInput,
  DonationPolicyUpdateInput,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

export function createCommunitiesApi(request: ApiRequest) {
  return {
    create: (body: ApiCreateCommunityRequest): Promise<CommunityCreateAcceptedResponse> =>
      request<CommunityCreateAcceptedResponse>("/communities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    uploadMedia: (
      input: { kind: "avatar" | "banner" | "post_image"; file: File },
    ): Promise<ApiCommunityMediaUploadResponse> => {
      const body = new FormData();
      body.set("kind", input.kind);
      body.set("file", input.file);
      return request<ApiCommunityMediaUploadResponse>("/community-media", { method: "POST", body });
    },
    get: (communityId: string, opts?: { locale?: string | null }): Promise<Community> => {
      return request<Community>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}`,
        { locale: opts?.locale },
      ));
    },
    update: (communityId: string, body: ApiUpdateCommunityRequest): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    attachNamespace: (communityId: string, namespaceVerificationId: string): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/namespace`, {
        method: "POST",
        body: JSON.stringify({ namespace_verification_id: namespaceVerificationId }),
      }),
    setPendingNamespaceSession: (
      communityId: string,
      namespaceVerificationSessionId: string | null,
    ): Promise<Community> =>
      request<Community>(
        `/communities/${encodeURIComponent(communityId)}/pending-namespace-session`,
        {
          method: "PUT",
          body: JSON.stringify({
            namespace_verification_session_id: namespaceVerificationSessionId,
          }),
        },
      ),
    updateRules: (communityId: string, body: { rules: ApiCommunityRuleInput[] }): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/rules`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateReferenceLinks: (
      communityId: string,
      body: CommunityReferenceLinksInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/reference-links`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateLabelPolicy: (
      communityId: string,
      body: CommunityLabelPolicyInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/labels`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getDonationPolicy: (communityId: string): Promise<ApiCommunityDonationPolicyResponse> =>
      request<ApiCommunityDonationPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy`,
      ),
    getMachineAccessPolicy: (communityId: string): Promise<ApiCommunityMachineAccessPolicy> =>
      request<ApiCommunityMachineAccessPolicy>(
        `/communities/${encodeURIComponent(communityId)}/machine-access-policy`,
      ),
    updateMachineAccessPolicy: (
      communityId: string,
      body: ApiCommunityMachineAccessPolicyUpdate,
    ): Promise<ApiCommunityMachineAccessPolicy> =>
      request<ApiCommunityMachineAccessPolicy>(
        `/communities/${encodeURIComponent(communityId)}/machine-access-policy`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    resolveDonationPartner: (
      communityId: string,
      body: { endaoment_url: string },
    ): Promise<ApiResolveDonationPartnerResponse> =>
      request<ApiResolveDonationPartnerResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy/resolve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    updateDonationPolicy: (
      communityId: string,
      body: DonationPolicyUpdateInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/donation-policy`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    updateGates: (
      communityId: string,
      body: ApiCommunityGatesUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/gates`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateSafety: (
      communityId: string,
      body: ApiCommunitySafetyUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/safety`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    join: (communityId: string): Promise<{ community_id: string; status: string }> =>
      request<{ community_id: string; status: string }>(
        `/communities/${encodeURIComponent(communityId)}/join`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    follow: (communityId: string): Promise<CommunityFollowResponse> =>
      request<CommunityFollowResponse>(
        `/communities/${encodeURIComponent(communityId)}/follow`,
        { method: "PUT", body: JSON.stringify({}) },
      ),
    unfollow: (communityId: string): Promise<CommunityFollowResponse> =>
      request<CommunityFollowResponse>(
        `/communities/${encodeURIComponent(communityId)}/follow`,
        { method: "DELETE" },
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
    getMoneyPolicy: (communityId: string): Promise<CommunityMoneyPolicy> =>
      request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
      ),
    updateMoneyPolicy: (
      communityId: string,
      body: UpdateCommunityMoneyPolicyRequest,
    ): Promise<CommunityMoneyPolicy> =>
      request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
        { method: "PUT", body: JSON.stringify(body) },
      ),
    getPricingPolicy: (communityId: string): Promise<CommunityPricingPolicy> =>
      request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
      ),
    updatePricingPolicy: (
      communityId: string,
      body: UpdateCommunityPricingPolicyRequest,
    ): Promise<CommunityPricingPolicy> =>
      request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
        { method: "PUT", body: JSON.stringify(body) },
      ),
    getAsset: (communityId: string, assetId: string): Promise<Asset> =>
      request<Asset>(
        `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(assetId)}`,
      ),
    resolveAssetAccess: (communityId: string, assetId: string): Promise<AssetAccessResponse> =>
      request<AssetAccessResponse>(
        `/communities/${encodeURIComponent(communityId)}/assets/${encodeURIComponent(assetId)}/access`,
      ),
    listListings: (communityId: string): Promise<CommunityListingListResponse> =>
      request<CommunityListingListResponse>(
        `/communities/${encodeURIComponent(communityId)}/listings`,
      ),
    createListing: (
      communityId: string,
      body: CreateCommunityListingRequest,
    ): Promise<CommunityListing> =>
      request<CommunityListing>(`/communities/${encodeURIComponent(communityId)}/listings`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getListing: (communityId: string, listingId: string): Promise<CommunityListing> =>
      request<CommunityListing>(
        `/communities/${encodeURIComponent(communityId)}/listings/${encodeURIComponent(listingId)}`,
      ),
    updateListing: (
      communityId: string,
      listingId: string,
      body: UpdateCommunityListingRequest,
    ): Promise<CommunityListing> =>
      request<CommunityListing>(
        `/communities/${encodeURIComponent(communityId)}/listings/${encodeURIComponent(listingId)}`,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    listPurchases: (communityId: string): Promise<CommunityPurchaseListResponse> =>
      request<CommunityPurchaseListResponse>(
        `/communities/${encodeURIComponent(communityId)}/purchases`,
      ),
    getPurchase: (communityId: string, purchaseId: string): Promise<CommunityPurchase> =>
      request<CommunityPurchase>(
        `/communities/${encodeURIComponent(communityId)}/purchases/${encodeURIComponent(purchaseId)}`,
      ),
    preflightPurchaseQuote: (
      communityId: string,
      body: CommunityPurchaseQuotePreflightRequest,
    ): Promise<CommunityPurchaseQuotePreflight> =>
      request<CommunityPurchaseQuotePreflight>(
        `/communities/${encodeURIComponent(communityId)}/purchase-quote-preflight`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    createPurchaseQuote: (
      communityId: string,
      body: CommunityPurchaseQuoteRequest,
    ): Promise<CommunityPurchaseQuote> =>
      request<CommunityPurchaseQuote>(
        `/communities/${encodeURIComponent(communityId)}/purchase-quotes`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    settlePurchase: (
      communityId: string,
      body: CommunityPurchaseSettlementRequest,
    ): Promise<CommunityPurchaseSettlement> =>
      request<CommunityPurchaseSettlement>(
        `/communities/${encodeURIComponent(communityId)}/purchase-settlements`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    failPurchase: (
      communityId: string,
      body: CommunityPurchaseSettlementFailureRequest,
    ): Promise<CommunityPurchaseSettlementFailure> =>
      request<CommunityPurchaseSettlementFailure>(
        `/communities/${encodeURIComponent(communityId)}/purchase-settlements/fail`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    listPosts: (
      communityId: string,
      opts?: CommunityListPostsOptions,
    ): Promise<{ items: LocalizedPostResponse[] }> => {
      return request<{ items: LocalizedPostResponse[] }>(buildQueryPath(
        `/communities/${encodeURIComponent(communityId)}/posts`,
        {
          cursor: opts?.cursor,
          flair_id: opts?.flair_id,
          limit: opts?.limit,
          locale: opts?.locale,
          sort: opts?.sort,
        },
      ));
    },
  };
}
