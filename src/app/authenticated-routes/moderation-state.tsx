"use client";

import * as React from "react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { DonationPartnerPreview, DonationPolicyMode } from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community-links-editor/community-links-editor-page";
import type { PricingTier, CountryAssignment as PricingCountryAssignment } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { NamespaceVerificationCallbacks } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import { toast } from "@/components/primitives/sonner";

import {
  buildEndaomentOrgUrl,
  buildStarterPricingPolicyDraft,
  getCommunityAdultContentPolicyState,
  getCommunityCivilityPolicyState,
  getCommunityDonationPartnerPreview,
  getCommunityGateDrafts,
  getCommunityGraphicContentPolicyState,
  getCommunityLinkDrafts,
  getCommunityOpenAIModerationSettingsState,
  getPricingCountryAssignmentDrafts,
  getPricingTierDrafts,
  validatePricingPolicyDraft,
} from "./moderation-helpers";
import { toNamespaceSessionResult } from "./create-community-route";
import { useCommunityRecord } from "./moderation-data";
import { getErrorMessage } from "./route-core";

type ApiCommunityPricingPolicyState = ApiCommunityPricingPolicy | null;
export function useCommunityModerationState(communityId: string) {
  const api = useApi();
  const session = useSession();
  const { community, error, loading, setCommunity } = useCommunityRecord(communityId);
  const [ruleName, setRuleName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportReason, setReportReason] = React.useState("");
  const [links, setLinks] = React.useState<CommunityLinkEditorItem[]>([]);
  const [donationMode, setDonationMode] = React.useState<DonationPolicyMode>("none");
  const [endaomentUrl, setEndaomentUrl] = React.useState("");
  const [partnerPreview, setPartnerPreview] = React.useState<DonationPartnerPreview | null>(null);
  const [resolveError, setResolveError] = React.useState<string | null>(null);
  const [resolvingDonationPartner, setResolvingDonationPartner] = React.useState(false);
  const [savingRules, setSavingRules] = React.useState(false);
  const [savingLinks, setSavingLinks] = React.useState(false);
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
  const [membershipMode, setMembershipMode] = React.useState<"open" | "request" | "gated">("open");
  const [defaultAgeGatePolicy, setDefaultAgeGatePolicy] = React.useState<"none" | "18_plus">("none");
  const [allowAnonymousIdentity, setAllowAnonymousIdentity] = React.useState(true);
  const [anonymousIdentityScope, setAnonymousIdentityScope] = React.useState<"community_stable" | "thread_stable" | "post_ephemeral">("community_stable");
  const [gateDrafts, setGateDrafts] = React.useState<IdentityGateDraft[]>([]);
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [providerSettings, setProviderSettings] = React.useState(() => getCommunityOpenAIModerationSettingsState({} as ApiCommunity));
  const [adultContentPolicy, setAdultContentPolicy] = React.useState(() => getCommunityAdultContentPolicyState({} as ApiCommunity));
  const [graphicContentPolicy, setGraphicContentPolicy] = React.useState(() => getCommunityGraphicContentPolicyState({} as ApiCommunity));
  const [civilityPolicy, setCivilityPolicy] = React.useState(() => getCommunityCivilityPolicyState({} as ApiCommunity));
  const [savingSafety, setSavingSafety] = React.useState(false);
  const [savingGates, setSavingGates] = React.useState(false);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    rememberKnownCommunity({
      avatarSrc: community.avatar_ref ?? undefined,
      communityId: community.community_id,
      displayName: community.display_name,
    });
  }, [community]);

  React.useEffect(() => {
    const firstRule = community?.community_profile?.rules?.[0];
    setRuleName(firstRule?.title ?? "");
    setDescription(firstRule?.body ?? "");
    setReportReason(firstRule?.report_reason?.trim() || (firstRule?.title ?? ""));
  }, [community]);

  React.useEffect(() => {
    if (!community) {
      return;
    }

    setLinks(getCommunityLinkDrafts(community));
    setDonationMode(community.donation_policy_mode ?? "none");
    setEndaomentUrl(buildEndaomentOrgUrl(community.donation_partner?.provider_partner_ref));
    setPartnerPreview(getCommunityDonationPartnerPreview(community));
    setResolveError(null);
    setMembershipMode(community.membership_mode);
    setDefaultAgeGatePolicy(community.default_age_gate_policy ?? "none");
    setAllowAnonymousIdentity(community.allow_anonymous_identity);
    setAnonymousIdentityScope(community.anonymous_identity_scope ?? "community_stable");
    setGateDrafts(getCommunityGateDrafts(community));
    setProviderSettings(getCommunityOpenAIModerationSettingsState(community));
    setAdultContentPolicy(getCommunityAdultContentPolicyState(community));
    setGraphicContentPolicy(getCommunityGraphicContentPolicyState(community));
    setCivilityPolicy(getCommunityCivilityPolicyState(community));
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

    void api.communities.getPricingPolicy(community.community_id)
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

  React.useEffect(() => {
    setActiveNamespaceSessionId(community?.pending_namespace_verification_session_id ?? null);
  }, [community?.pending_namespace_verification_session_id]);

  const effectiveNamespaceSessionId = activeNamespaceSessionId ?? community?.pending_namespace_verification_session_id ?? null;
  const pricingValidationError = validatePricingPolicyDraft({
    countryAssignments,
    defaultTierKey,
    regionalPricingEnabled,
    tiers: pricingTiers,
  });

  const namespaceVerificationCallbacks = React.useMemo<NamespaceVerificationCallbacks>(() => ({
    onStartSession: async ({ family, rootLabel }) => {
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      setActiveNamespaceSessionId(result.namespace_verification_session_id);
      const updatedCommunity = await api.communities.setPendingNamespaceSession(
        communityId,
        result.namespace_verification_session_id,
      );
      setCommunity(updatedCommunity);

      return toNamespaceSessionResult(result);
    },
    onCompleteSession: async ({ namespaceVerificationSessionId, restartChallenge, signaturePayload }) => {
      const result = await api.verification.completeNamespaceSession(namespaceVerificationSessionId, {
        restart_challenge: restartChallenge ?? null,
        signature_payload: signaturePayload ?? null,
      });

      if (result.status === "verified" && result.namespace_verification_id) {
        const updatedCommunity = await api.communities.attachNamespace(communityId, result.namespace_verification_id);
        setCommunity(updatedCommunity);
        setActiveNamespaceSessionId(null);
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }) => {
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);
      return toNamespaceSessionResult(result);
    },
  }), [api, communityId, setCommunity]);

  const saveCommunity = React.useCallback(
    async (
      action: () => Promise<ApiCommunity>,
      savingSetter: React.Dispatch<React.SetStateAction<boolean>>,
      successMessage: string,
      failureMessage: string,
    ) => {
      savingSetter(true);
      try {
        const updatedCommunity = await action();
        setCommunity(updatedCommunity);
        toast.success(successMessage);
        return updatedCommunity;
      } catch (nextError) {
        toast.error(getErrorMessage(nextError, failureMessage));
        throw nextError;
      } finally {
        savingSetter(false);
      }
    },
    [setCommunity],
  );

  const handleSaveRules = React.useCallback(() => {
    if (!community || savingRules) return;
    const existingRules = community.community_profile?.rules ?? [];
    const rules = [
      {
        rule_id: existingRules[0]?.rule_id ?? null,
        title: ruleName,
        body: description,
        report_reason: reportReason.trim() || ruleName.trim(),
        position: 0,
        status: "active" as const,
      },
      ...existingRules.slice(1).map((rule, index) => ({
        rule_id: rule.rule_id,
        title: rule.title,
        body: rule.body,
        report_reason: rule.report_reason?.trim() || rule.title,
        position: index + 1,
        status: rule.status,
      })),
    ];
    void saveCommunity(
      () => api.communities.updateRules(community.community_id, { rules }),
      setSavingRules,
      "Rules saved.",
      "Could not save rules.",
    );
  }, [api.communities, community, description, reportReason, ruleName, saveCommunity, savingRules]);

  const handleSaveSafety = React.useCallback(() => {
    if (!community || savingSafety) return;
    void saveCommunity(
      () => api.communities.updateSafety(community.community_id, {
        adult_content_policy: { ...adultContentPolicy },
        civility_policy: { ...civilityPolicy },
        graphic_content_policy: { ...graphicContentPolicy },
        openai_moderation_settings: {
          scan_titles: providerSettings.scanTitles,
          scan_post_bodies: providerSettings.scanPostBodies,
          scan_captions: providerSettings.scanCaptions,
          scan_link_preview_text: providerSettings.scanLinkPreviewText,
          scan_images: providerSettings.scanImages,
        },
      }),
      setSavingSafety,
      "Safety settings saved.",
      "Could not save safety settings.",
    );
  }, [adultContentPolicy, api.communities, civilityPolicy, community, graphicContentPolicy, providerSettings, saveCommunity, savingSafety]);

  const handleSaveLinks = React.useCallback(() => {
    if (!community || savingLinks) return;
    void saveCommunity(
      () => api.communities.updateReferenceLinks(community.community_id, {
        reference_links: links.filter((link) => link.url.trim()).map((link, index) => ({
          community_reference_link_id: link.id.startsWith("draft-") ? null : link.id,
          label: link.label.trim() || null,
          platform: link.platform as NonNullable<ApiCommunity["reference_links"]>[number]["platform"],
          position: index,
          url: link.url.trim(),
        })),
      }),
      setSavingLinks,
      "Links saved.",
      "Could not save links.",
    ).then((updatedCommunity) => {
      setLinks(getCommunityLinkDrafts(updatedCommunity));
    }).catch(() => undefined);
  }, [api.communities, community, links, saveCommunity, savingLinks]);

  const handleResolveDonationPartner = React.useCallback(() => {
    if (!community || resolvingDonationPartner || !endaomentUrl.trim()) return;
    setResolvingDonationPartner(true);
    setResolveError(null);
    void api.communities.resolveDonationPartner(community.community_id, { endaoment_url: endaomentUrl.trim() })
      .then((resolvedPartner) => {
        setPartnerPreview({
          donationPartnerId: resolvedPartner.donation_partner_id,
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
    if (!community || savingDonations) return;
    if (donationMode !== "none" && !partnerPreview) {
      setResolveError("Resolve an Endaoment organization before saving.");
      return;
    }
    setResolveError(null);
    void saveCommunity(
      () => api.communities.updateDonationPolicy(community.community_id, {
        donation_policy_mode: donationMode,
        donation_partner_id: donationMode === "none" ? null : (partnerPreview?.donationPartnerId ?? null),
        donation_partner: donationMode === "none" || !partnerPreview ? null : {
          donation_partner_id: partnerPreview.donationPartnerId,
          display_name: partnerPreview.displayName,
          provider: "endaoment",
          provider_partner_ref: partnerPreview.providerPartnerRef ?? null,
          image_url: partnerPreview.imageUrl ?? null,
        },
      }),
      setSavingDonations,
      "Donations saved.",
      "Could not save donations.",
    ).then((updatedCommunity) => {
      setDonationMode(updatedCommunity.donation_policy_mode ?? "none");
      setPartnerPreview(getCommunityDonationPartnerPreview(updatedCommunity));
      setEndaomentUrl(buildEndaomentOrgUrl(updatedCommunity.donation_partner?.provider_partner_ref));
    }).catch(() => undefined);
  }, [api.communities, community, donationMode, partnerPreview, saveCommunity, savingDonations]);

  const handleSavePricing = React.useCallback(() => {
    if (!community || savingPricing || pricingValidationError) return;
    setSavingPricing(true);
    void api.communities.updatePricingPolicy(community.community_id, {
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

  const applyStarterPricingTemplate = React.useCallback(() => {
    const starter = buildStarterPricingPolicyDraft();
    setRegionalPricingEnabled(starter.regionalPricingEnabled);
    setVerificationProviderRequirement(starter.verificationProviderRequirement);
    setDefaultTierKey(starter.defaultTierKey);
    setPricingTiers(starter.tiers);
    setCountryAssignments(starter.countryAssignments);
  }, []);

  const handleSaveGates = React.useCallback(() => {
    if (!community || savingGates) return;
    void saveCommunity(
      () => api.communities.updateGates(community.community_id, {
        membership_mode: membershipMode,
        default_age_gate_policy: defaultAgeGatePolicy,
        allow_anonymous_identity: allowAnonymousIdentity,
        anonymous_identity_scope: allowAnonymousIdentity ? anonymousIdentityScope : null,
        gate_rules: gateDrafts.map((draft) => ({
          scope: "membership" as const,
          gate_family: "identity_proof" as const,
          gate_type: draft.gateType,
          gate_rule_id: draft.gateRuleId ?? null,
          proof_requirements: [{
            proof_type: draft.gateType,
            accepted_providers: ["self"] as ("self" | "very" | "passport")[],
            config: { required_value: draft.requiredValue },
          }],
        })),
      }),
      setSavingGates,
      "Access settings saved.",
      "Could not save access settings.",
    );
  }, [allowAnonymousIdentity, anonymousIdentityScope, api.communities, community, defaultAgeGatePolicy, gateDrafts, membershipMode, saveCommunity, savingGates]);

  return {
    activeNamespaceSessionId,
    adultContentPolicy,
    allowAnonymousIdentity,
    anonymousIdentityScope,
    civilityPolicy,
    community,
    countryAssignments,
    defaultAgeGatePolicy,
    defaultTierKey,
    description,
    donationMode,
    effectiveNamespaceSessionId,
    endaomentUrl,
    error,
    gateDrafts,
    graphicContentPolicy,
    links,
    loading,
    membershipMode,
    namespaceVerificationCallbacks,
    partnerPreview,
    pricingPolicyError,
    pricingPolicyLoading,
    pricingTiers,
    pricingValidationError,
    providerSettings,
    regionalPricingEnabled,
    reportReason,
    resolveError,
    resolvingDonationPartner,
    ruleName,
    savingDonations,
    savingGates,
    savingLinks,
    savingPricing,
    savingRules,
    savingSafety,
    session,
    verificationProviderRequirement,
    setActiveNamespaceSessionId,
    setAdultContentPolicy,
    setAllowAnonymousIdentity,
    setAnonymousIdentityScope,
    setCivilityPolicy,
    setCommunity,
    setCountryAssignments,
    setDefaultAgeGatePolicy,
    setDefaultTierKey,
    setDescription,
    setDonationMode,
    setEndaomentUrl,
    setGateDrafts,
    setGraphicContentPolicy,
    setLinks,
    setMembershipMode,
    setPartnerPreview,
    setProviderSettings,
    setPricingTiers,
    setRegionalPricingEnabled,
    setReportReason,
    setResolveError,
    setRuleName,
    setVerificationProviderRequirement,
    handleResolveDonationPartner,
    handleSaveDonations,
    handleSaveGates,
    handleSaveLinks,
    handleSavePricing,
    handleSaveRules,
    handleSaveSafety,
    applyStarterPricingTemplate,
  };
}
