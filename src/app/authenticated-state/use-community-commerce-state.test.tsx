import { describe, expect, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { installDomGlobals } from "@/test/setup-dom";
import type { Community as ApiCommunity, CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { api } from "@/lib/api";

import type { SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import { useCommunityCommerceState } from "./use-community-commerce-state";

installDomGlobals();

type DonationPolicyBody = {
  donation_policy_mode: "none" | "optional_creator_sidecar";
  donation_partner_id: string | null;
  donation_partner: {
    donation_partner: string;
    display_name: string;
    provider: "endaoment";
    provider_partner_ref: string | null;
    image_url: string | null;
  } | null;
};

type PricingPolicyBody = {
  regional_pricing_enabled: boolean;
  verification_provider_requirement: "self" | null;
  default_tier_key: string | null;
  tiers: Array<{
    tier_key: string;
    display_name: string | null;
    adjustment_type: "multiplier";
    adjustment_value: number;
  }>;
  country_assignments: Array<{
    country_code: string;
    tier_key: string;
  }>;
};

function createCommunity(overrides: Partial<ApiCommunity> = {}): ApiCommunity {
  return {
    id: "community-1",
    display_name: "Test Community",
    donation_policy_mode: "none",
    donation_partner: null,
    ...overrides,
  } as ApiCommunity;
}

function createPricingPolicy(
  overrides: Partial<ApiCommunityPricingPolicy> = {},
): ApiCommunityPricingPolicy {
  return {
    id: "policy-1",
    object: "community_pricing_policy",
    policy_origin: "explicit",
    pricing_policy_version: "v1",
    regional_pricing_enabled: true,
    verification_provider_requirement: "self",
    default_tier_key: "tier_1",
    tiers: [{
      tier_key: "tier_1",
      display_name: "Tier 1",
      adjustment_type: "multiplier",
      adjustment_value: 1,
    }],
    country_assignments: [{ country_code: "US", tier_key: "tier_1" }],
    ...overrides,
  };
}

function installCommunityApiMocks(options: {
  pricingPolicy?: ApiCommunityPricingPolicy;
  resolvedPartner?: {
    donation_partner: string;
    display_name: string;
    image_url?: string | null;
    provider_partner_ref?: string | null;
  };
  updatedCommunity?: ApiCommunity;
  updatedPricingPolicy?: ApiCommunityPricingPolicy;
} = {}) {
  const calls = {
    getPricingPolicy: [] as string[],
    resolveDonationPartner: [] as Array<{ communityId: string; body: { endaoment_url: string } }>,
    updateDonationPolicy: [] as Array<{ communityId: string; body: DonationPolicyBody }>,
    updatePricingPolicy: [] as Array<{ communityId: string; body: PricingPolicyBody }>,
  };

  const communities = api.communities as unknown as {
    getPricingPolicy: (communityId: string) => Promise<ApiCommunityPricingPolicy>;
    resolveDonationPartner: (
      communityId: string,
      body: { endaoment_url: string },
    ) => Promise<{
      donation_partner: string;
      display_name: string;
      image_url?: string | null;
      provider_partner_ref?: string | null;
    }>;
    updateDonationPolicy: (communityId: string, body: DonationPolicyBody) => Promise<ApiCommunity>;
    updatePricingPolicy: (communityId: string, body: PricingPolicyBody) => Promise<ApiCommunityPricingPolicy>;
  };

  communities.getPricingPolicy = async (communityId) => {
    calls.getPricingPolicy.push(communityId);
    return options.pricingPolicy ?? createPricingPolicy();
  };
  communities.resolveDonationPartner = async (communityId, body) => {
    calls.resolveDonationPartner.push({ communityId, body });
    return options.resolvedPartner ?? {
      donation_partner: "partner-1",
      display_name: "Endaoment Org",
      image_url: null,
      provider_partner_ref: "org-1",
    };
  };
  communities.updateDonationPolicy = async (communityId, body) => {
    calls.updateDonationPolicy.push({ communityId, body });
    return options.updatedCommunity ?? createCommunity({
      donation_policy_mode: body.donation_policy_mode,
      donation_partner: body.donation_partner
        ? {
          donation_partner: body.donation_partner.donation_partner,
          display_name: body.donation_partner.display_name,
          image_url: body.donation_partner.image_url,
          provider: body.donation_partner.provider,
          provider_partner_ref: body.donation_partner.provider_partner_ref,
          review_status: "approved",
          status: "active",
        }
        : null,
    });
  };
  communities.updatePricingPolicy = async (communityId, body) => {
    calls.updatePricingPolicy.push({ communityId, body });
    return options.updatedPricingPolicy ?? createPricingPolicy({
      regional_pricing_enabled: body.regional_pricing_enabled,
      verification_provider_requirement: body.verification_provider_requirement,
      default_tier_key: body.default_tier_key,
      tiers: body.tiers,
      country_assignments: body.country_assignments,
    });
  };

  return calls;
}

function createSaveCommunityMock() {
  const calls: Array<{ successMessage: string; failureMessage: string }> = [];
  const saveCommunity: SaveCommunityAction = async (
    action,
    savingSetter,
    successMessage,
    failureMessage,
  ) => {
    calls.push({ successMessage, failureMessage });
    savingSetter(true);
    try {
      return await action();
    } finally {
      savingSetter(false);
    }
  };

  return { calls, saveCommunity };
}

function renderCommerceHook({
  community = createCommunity(),
  saveCommunity = createSaveCommunityMock().saveCommunity,
}: {
  community?: ApiCommunity | null;
  saveCommunity?: SaveCommunityAction;
} = {}) {
  return renderHook(() => useCommunityCommerceState({ community, saveCommunity }));
}

describe("useCommunityCommerceState", () => {
  test("initializes donation and pricing drafts from the community record", async () => {
    installCommunityApiMocks();
    const community = createCommunity({
      donation_policy_mode: "optional_creator_sidecar",
      donation_partner: {
        donation_partner: "partner-1",
        display_name: "Endaoment Org",
        image_url: "https://example.com/logo.png",
        provider: "endaoment",
        provider_partner_ref: "org-1",
        review_status: "approved",
        status: "active",
      },
    });

    const { result } = renderCommerceHook({ community });

    await waitFor(() => expect(result.current.defaultTierKey).toBe("tier_1"));

    expect(result.current.donationMode).toBe("optional_creator_sidecar");
    expect(result.current.endaomentUrl).toBe("https://app.endaoment.org/orgs/org-1");
    expect(result.current.partnerPreview?.displayName).toBe("Endaoment Org");
    expect(result.current.regionalPricingEnabled).toBe(true);
    expect(result.current.verificationProviderRequirement).toBe("self");
    expect(result.current.pricingTiers).toHaveLength(1);
    expect(result.current.countryAssignments).toHaveLength(1);
  });

  test("resolves an Endaoment partner into the donation preview", async () => {
    const calls = installCommunityApiMocks({
      resolvedPartner: {
        donation_partner: "partner-2",
        display_name: "Resolved Org",
        image_url: null,
        provider_partner_ref: "resolved-org",
      },
    });
    const { result } = renderCommerceHook();

    act(() => {
      result.current.setEndaomentUrl("https://app.endaoment.org/orgs/resolved-org");
    });
    act(() => {
      result.current.handleResolveDonationPartner();
    });

    await waitFor(() => expect(result.current.partnerPreview?.displayName).toBe("Resolved Org"));

    expect(calls.resolveDonationPartner).toEqual([{
      communityId: "community-1",
      body: { endaoment_url: "https://app.endaoment.org/orgs/resolved-org" },
    }]);
    expect(result.current.endaomentUrl).toBe("https://app.endaoment.org/orgs/resolved-org");
    expect(result.current.resolveError).toBeNull();
  });

  test("saves donations through the injected community save boundary", async () => {
    const calls = installCommunityApiMocks();
    const save = createSaveCommunityMock();
    const { result } = renderCommerceHook({ saveCommunity: save.saveCommunity });

    act(() => {
      result.current.setPartnerPreview({
        donationPartnerId: "partner-3",
        displayName: "Saved Org",
        imageUrl: null,
        provider: "Endaoment",
        providerPartnerRef: "saved-org",
      });
    });
    await waitFor(() => expect(result.current.partnerPreview?.donationPartnerId).toBe("partner-3"));

    act(() => {
      result.current.handleSaveDonations();
    });

    await waitFor(() => expect(calls.updateDonationPolicy).toHaveLength(1));
    await waitFor(() => expect(result.current.donationMode).toBe("optional_creator_sidecar"));

    expect(save.calls).toEqual([{
      successMessage: "Donations saved.",
      failureMessage: "Could not save donations.",
    }]);
    expect(calls.updateDonationPolicy[0]).toEqual({
      communityId: "community-1",
      body: {
        donation_policy_mode: "optional_creator_sidecar",
        donation_partner_id: "partner-3",
        donation_partner: {
          donation_partner: "partner-3",
          display_name: "Saved Org",
          provider: "endaoment",
          provider_partner_ref: "saved-org",
          image_url: null,
        },
      },
    });
    expect(result.current.endaomentUrl).toBe("https://app.endaoment.org/orgs/saved-org");
  });

  test("saves normalized pricing policy drafts", async () => {
    const calls = installCommunityApiMocks({
      pricingPolicy: createPricingPolicy({ regional_pricing_enabled: false }),
    });
    const { result } = renderCommerceHook();

    await waitFor(() => expect(result.current.pricingPolicyLoading).toBe(false));

    act(() => {
      result.current.setRegionalPricingEnabled(true);
      result.current.setVerificationProviderRequirement("self");
      result.current.setDefaultTierKey("tier_1");
      result.current.setPricingTiers([{
        id: "test-tier",
        tier_key: " tier_1 ",
        display_name: " Tier 1 ",
        adjustment_type: "multiplier",
        adjustment_value: 1.25,
      }]);
      result.current.setCountryAssignments([{ country_code: " US ", tier_key: "tier_1" }]);
    });
    act(() => {
      result.current.handleSavePricing();
    });

    await waitFor(() => expect(calls.updatePricingPolicy).toHaveLength(1));

    expect(calls.updatePricingPolicy[0]).toEqual({
      communityId: "community-1",
      body: {
        regional_pricing_enabled: true,
        verification_provider_requirement: "self",
        default_tier_key: "tier_1",
        tiers: [{
          tier_key: "tier_1",
          display_name: "Tier 1",
          adjustment_type: "multiplier",
          adjustment_value: 1.25,
        }],
        country_assignments: [{ country_code: "US", tier_key: "tier_1" }],
      },
    });
  });
});
