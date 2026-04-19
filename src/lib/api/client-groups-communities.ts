import type {
  Asset,
  AssetAccessResponse,
  Community,
  CommunityCreateAcceptedResponse,
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
  ApiCommunityMediaUploadResponse,
  ApiCommunityRuleInput,
  ApiCommunitySafetyUpdateRequest,
  ApiCreateCommunityRequest,
  ApiResolveDonationPartnerResponse,
  CommunityListPostsOptions,
  CommunityReferenceLinksInput,
  DonationPolicyUpdateInput,
} from "./client-api-types";
import type { ApiRequest } from "./client-internal";

export function createCommunitiesApi(request: ApiRequest) {
  return {
    create: (body: ApiCreateCommunityRequest): Promise<CommunityCreateAcceptedResponse> =>
      request<CommunityCreateAcceptedResponse>("/communities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    uploadMedia: (
      input: { kind: "avatar" | "banner"; file: File },
    ): Promise<ApiCommunityMediaUploadResponse> => {
      const body = new FormData();
      body.set("kind", input.kind);
      body.set("file", input.file);
      return request<ApiCommunityMediaUploadResponse>("/community-media", { method: "POST", body });
    },
    get: (communityId: string): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}`),
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
    getDonationPolicy: (communityId: string): Promise<ApiCommunityDonationPolicyResponse> =>
      request<ApiCommunityDonationPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy`,
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
    preview: (communityId: string): Promise<CommunityPreview> =>
      request<CommunityPreview>(`/communities/${encodeURIComponent(communityId)}/preview`),
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
      const params = new URLSearchParams();
      if (opts?.limit) params.set("limit", opts.limit);
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (opts?.locale) params.set("locale", opts.locale);
      if (opts?.flair_id) params.set("flair_id", opts.flair_id);
      if (opts?.sort) params.set("sort", opts.sort);
      const qs = params.toString();
      const path = `/communities/${encodeURIComponent(communityId)}/posts`;
      return request<{ items: LocalizedPostResponse[] }>(qs ? `${path}?${qs}` : path);
    },
  };
}
