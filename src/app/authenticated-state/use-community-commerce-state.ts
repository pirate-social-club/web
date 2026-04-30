"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { toast } from "@/components/primitives/sonner";
import type { DonationPartnerPreview, DonationPolicyMode } from "@/components/compositions/community/donations-editor/community-donations-editor-page";
import type { PricingTier, CountryAssignment as PricingCountryAssignment } from "@/components/compositions/community/pricing-editor/community-pricing-editor-page";

import {
  buildEndaomentOrgUrl,
  buildStarterPricingPolicyDraft,
  getCommunityDonationPartnerPreview,
  getPricingCountryAssignmentDrafts,
  getPricingTierDrafts,
  validatePricingPolicyDraft,
} from "@/app/authenticated-helpers/moderation-helpers";
import { submitCommunitySave, type SaveCommunityAction } from "@/app/authenticated-helpers/community-moderation-save";
import { getErrorMessage } from "@/lib/error-utils";

type ApiCommunityPricingPolicyState = ApiCommunityPricingPolicy | null;

export function useCommunityCommerceState({
  community,
  saveCommunity,
}: {
  community: ApiCommunity | null;
  saveCommunity: SaveCommunityAction;
}) {
  const api = useApi();

  const [donationMode, setDonationMode] = React.useState<DonationPolicyMode>("none");
  const [endaomentUrl, setEndaomentUrl] = React.useState("");
  const [partnerPreview, setPartnerPreview] = React.useState<DonationPartnerPreview | null>(null);
  const [resolveError, setResolveError] = React.useState<string | null>(null);
  const [resolvingDonationPartner, setResolvingDonationPartner] = React.useState(false);
  const [savingDonations, setSavingDonations] = React.useState(false);

  const [pricingPolicy, setPricingPolicy] = React.useState<ApiCommunityPricingPolicyState>(null);
  const [pricingPolicyError, setPricingPolicyError] = React.useState<unknown>(null);
  const [pricingPolicyLoading, setPricingPolicyLoading] = React.useState(false);
  const [regionalPricingEnabled, setRegionalPricingEnabled] = React.useState(false);
  const [verificationProviderRequirement, setVerificationProviderRequirement] = React.useState<"self" | null>(null);
  const [defaultTierKey, setDefaultTierKey] = React.useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = React.useState<PricingTier[]>([]);
  const [countryAssignments, setCountryAssignments] = React.useState<PricingCountryAssignment[]>([]);
  const [savingPricing, setSavingPricing] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      setDonationMode("none");
      setEndaomentUrl("");
      setPartnerPreview(null);
      setResolveError(null);
      return;
    }

    setDonationMode(community.donation_policy_mode ?? "none");
    setEndaomentUrl(buildEndaomentOrgUrl(community.donation_partner?.provider_partner_ref));
    setPartnerPreview(getCommunityDonationPartnerPreview(community));
    setResolveError(null);
  }, [community]);

  React.useEffect(() => {
    if (!community) {
      setPricingPolicy(null);
      setPricingPolicyError(null);
      setPricingPolicyLoading(false);
      return;
    }

    let cancelled = false;
    setPricingPolicyLoading(true);
    setPricingPolicyError(null);

    void api.communities.getPricingPolicy(community.id)
      .then((result) => {
        if (!cancelled) {
          setPricingPolicy(result);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setPricingPolicyError(nextError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPricingPolicyLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api.communities, community]);

  React.useEffect(() => {
    setRegionalPricingEnabled(pricingPolicy?.regional_pricing_enabled === true);
    setVerificationProviderRequirement(pricingPolicy?.verification_provider_requirement ?? null);
    setDefaultTierKey(pricingPolicy?.default_tier_key ?? null);
    setPricingTiers(getPricingTierDrafts(pricingPolicy));
    setCountryAssignments(getPricingCountryAssignmentDrafts(pricingPolicy));
  }, [pricingPolicy]);

  const handleResolveDonationPartner = React.useCallback(() => {
    if (!community || resolvingDonationPartner || !endaomentUrl.trim()) return;
    setResolvingDonationPartner(true);
    setResolveError(null);
    void api.communities.resolveDonationPartner(community.id, { endaoment_url: endaomentUrl.trim() })
      .then((resolvedPartner) => {
        setPartnerPreview({
          donationPartnerId: resolvedPartner.donation_partner,
          displayName: resolvedPartner.display_name,
          imageUrl: resolvedPartner.image_url ?? null,
          provider: "Endaoment",
          providerPartnerRef: resolvedPartner.provider_partner_ref ?? null,
        });
        setEndaomentUrl(buildEndaomentOrgUrl(resolvedPartner.provider_partner_ref));
      })
      .catch((nextError: unknown) => {
        setPartnerPreview(null);
        setResolveError(getErrorMessage(nextError, "Could not find that Endaoment organization."));
      })
      .finally(() => {
        setResolvingDonationPartner(false);
      });
  }, [api.communities, community, endaomentUrl, resolvingDonationPartner]);

  const handleSaveDonations = React.useCallback(() => {
    if (!community) return;
    if (endaomentUrl.trim() && !partnerPreview) {
      setResolveError("Resolve an Endaoment organization before saving.");
      return;
    }
    const nextDonationMode: DonationPolicyMode = partnerPreview ? "optional_creator_sidecar" : "none";
    setResolveError(null);
    void submitCommunitySave({
      action: (currentCommunity) => api.communities.updateDonationPolicy(currentCommunity.id, {
        donation_policy_mode: nextDonationMode,
        donation_partner: nextDonationMode === "none" || !partnerPreview ? null : {
          donation_partner: partnerPreview.donationPartnerId,
          display_name: partnerPreview.displayName,
          provider: "endaoment",
          provider_partner_ref: partnerPreview.providerPartnerRef ?? null,
          image_url: partnerPreview.imageUrl ?? null,
        },
      }),
      community,
      failureMessage: "Could not save donations.",
      onError: () => undefined,
      onSaved: (updatedCommunity) => {
        setDonationMode(updatedCommunity.donation_policy_mode ?? "none");
        setPartnerPreview(getCommunityDonationPartnerPreview(updatedCommunity));
        setEndaomentUrl(buildEndaomentOrgUrl(updatedCommunity.donation_partner?.provider_partner_ref));
      },
      saveCommunity,
      saving: savingDonations,
      savingSetter: setSavingDonations,
      swallowError: true,
      successMessage: "Donations saved.",
    });
  }, [api.communities, community, endaomentUrl, partnerPreview, saveCommunity, savingDonations]);

  const pricingValidationError = validatePricingPolicyDraft({
    countryAssignments,
    defaultTierKey,
    regionalPricingEnabled,
    tiers: pricingTiers,
  });

  const handleSavePricing = React.useCallback(() => {
    if (!community || savingPricing || pricingValidationError) return;
    setSavingPricing(true);
    void api.communities.updatePricingPolicy(community.id, {
      regional_pricing_enabled: regionalPricingEnabled,
      verification_provider_requirement: regionalPricingEnabled ? (verificationProviderRequirement ?? "self") : null,
      default_tier_key: regionalPricingEnabled ? defaultTierKey : null,
      tiers: pricingTiers.map((tier) => ({
        tier_key: tier.tier_key.trim(),
        display_name: tier.display_name?.trim() || null,
        adjustment_type: tier.adjustment_type,
        adjustment_value: tier.adjustment_value,
      })),
      country_assignments: countryAssignments.map((assignment) => ({
        country_code: assignment.country_code.trim().toUpperCase(),
        tier_key: assignment.tier_key.trim(),
      })),
    })
      .then((updatedPolicy) => {
        setPricingPolicy(updatedPolicy);
        toast.success("Pricing saved.");
      })
      .catch((nextError: unknown) => {
        toast.error(getErrorMessage(nextError, "Could not save pricing."));
      })
      .finally(() => {
        setSavingPricing(false);
      });
  }, [api.communities, community, countryAssignments, defaultTierKey, pricingTiers, pricingValidationError, regionalPricingEnabled, savingPricing, verificationProviderRequirement]);

  const applyStarterPricingTemplate = React.useCallback((input?: {
    localCountryCodes?: string[];
  }) => {
    const starter = buildStarterPricingPolicyDraft(input);
    setRegionalPricingEnabled(starter.regionalPricingEnabled);
    setVerificationProviderRequirement(starter.verificationProviderRequirement);
    setDefaultTierKey(starter.defaultTierKey);
    setPricingTiers(starter.tiers);
    setCountryAssignments(starter.countryAssignments);
  }, []);

  return {
    countryAssignments,
    defaultTierKey,
    donationMode,
    endaomentUrl,
    handleResolveDonationPartner,
    handleSaveDonations,
    handleSavePricing,
    applyStarterPricingTemplate,
    partnerPreview,
    pricingPolicyError,
    pricingPolicyLoading,
    pricingTiers,
    pricingValidationError,
    regionalPricingEnabled,
    resolveError,
    resolvingDonationPartner,
    savingDonations,
    savingPricing,
    setCountryAssignments,
    setDefaultTierKey,
    setDonationMode,
    setEndaomentUrl,
    setPartnerPreview,
    setPricingTiers,
    setRegionalPricingEnabled,
    setResolveError,
    setVerificationProviderRequirement,
    verificationProviderRequirement,
  };
}
