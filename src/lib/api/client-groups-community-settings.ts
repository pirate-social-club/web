import type {
  Community,
  CommunityMoneyPolicy,
  CommunityPricingPolicy,
  UpdateCommunityMoneyPolicyRequest,
  UpdateCommunityPricingPolicyRequest,
} from "@pirate/api-contracts";

import type {
  ApiCommunityDonationPolicyResponse,
  ApiCommunityGatesUpdateRequest,
  ApiCommunityMachineAccessPolicy,
  ApiCommunityMachineAccessPolicyUpdate,
  ApiCommunityRuleInput,
  ApiCommunitySafetyUpdateRequest,
  ApiResolveDonationPartnerResponse,
  ApiUpdateCommunityRequest,
  CommunityLabelPolicyInput,
  CommunityReferenceLinksInput,
  DonationPolicyUpdateInput,
} from "./client-api-types";
import type { ApiRequest } from "./client-internal";

export function createCommunitySettingsApi(request: ApiRequest) {
  return {
    update: (communityId: string, body: ApiUpdateCommunityRequest): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateRules: (communityId: string, body: { rules: ApiCommunityRuleInput[] }): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/rules`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateReferenceLinks: (
      communityId: string,
      body: CommunityReferenceLinksInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/reference-links`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateLabelPolicy: (
      communityId: string,
      body: CommunityLabelPolicyInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/labels`, {
        method: "POST",
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
        method: "POST",
        body: JSON.stringify(body),
      }),
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
        { method: "POST", body: JSON.stringify(body) },
      ),
    updateGates: (
      communityId: string,
      body: ApiCommunityGatesUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/gates`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateSafety: (
      communityId: string,
      body: ApiCommunitySafetyUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/safety`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
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
        { method: "POST", body: JSON.stringify(body) },
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
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
