import type {
  Asset,
  AssetAccessResponse,
  CommunityListing,
  CommunityListingListResponse,
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
  UpdateCommunityListingRequest,
} from "@pirate/api-contracts";

import type { ApiRequest } from "./client-internal";

export function createCommunityCommerceApi(request: ApiRequest) {
  return {
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
        { method: "POST", body: JSON.stringify(body) },
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
        `/communities/${encodeURIComponent(communityId)}/fail-purchase-settlement`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
