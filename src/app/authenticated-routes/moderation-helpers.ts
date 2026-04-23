"use client";

import { CurrencyDollar, Gavel, Heart, ImageSquare, LinkSimple, Lock, Robot, SealCheck, Shield, Tag } from "@phosphor-icons/react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import type { DonationPartnerPreview } from "@/components/compositions/community-donations-editor/community-donations-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community-links-editor/community-links-editor-page";
import type { IdentityGateDraft } from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { PricingTier, CountryAssignment as PricingCountryAssignment } from "@/components/compositions/community-pricing-editor/community-pricing-editor-page";
import { createDefaultCourtyardInventoryDraft } from "@/lib/courtyard-inventory-gates";
import { normalizeCountryCode } from "@/lib/countries";
import { serializeExistingCommunityGateRuleForUpdate, type SerializedGateRule } from "./community-gate-rule-serialization";
import {
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community-safety-page/community-safety-page";

export const DEFAULT_COMMUNITY_RULES = [
  {
    title: "Respect others and be civil",
    body: "No harassment, hate speech, or toxic behavior. Treat all contributors and members with kindness.",
  },
  {
    title: "No spam",
    body: "Excessive promotion, spam, or advertising of any kind is not allowed.",
  },
] as const;

export type CommunityModerationSection = "profile" | "rules" | "links" | "labels" | "donations" | "pricing" | "gates" | "safety" | "namespace" | "agents";

export const DEFAULT_COMMUNITY_MODERATION_SECTION: CommunityModerationSection = "profile";

export function buildCommunityModerationIndexPath(communityId: string): string {
  return `/c/${encodeURIComponent(communityId)}/mod`;
}

export function buildCommunityModerationPath(
  communityId: string,
  section: CommunityModerationSection,
): string {
  return `/c/${encodeURIComponent(communityId)}/mod/${section}`;
}

export function buildDefaultCommunityModerationPath(communityId: string): string {
  return buildCommunityModerationPath(communityId, DEFAULT_COMMUNITY_MODERATION_SECTION);
}

export function buildCommunityModerationSections(
  activeSection: CommunityModerationSection | null,
  communityId: string,
  copy: { nav: Record<string, string> },
) {
  return [{
    label: copy.nav.communitySection,
    items: [
      { active: activeSection === "profile", icon: ImageSquare, label: copy.nav.profile, onSelect: () => navigate(buildCommunityModerationPath(communityId, "profile")) },
      { active: activeSection === "rules", icon: Gavel, label: copy.nav.rules, onSelect: () => navigate(buildCommunityModerationPath(communityId, "rules")) },
      { active: activeSection === "links", icon: LinkSimple, label: copy.nav.links, onSelect: () => navigate(buildCommunityModerationPath(communityId, "links")) },
      { active: activeSection === "labels", icon: Tag, label: copy.nav.labels, onSelect: () => navigate(buildCommunityModerationPath(communityId, "labels")) },
      { active: activeSection === "donations", icon: Heart, label: copy.nav.donations, onSelect: () => navigate(buildCommunityModerationPath(communityId, "donations")) },
      { active: activeSection === "pricing", icon: CurrencyDollar, label: copy.nav.pricing, onSelect: () => navigate(buildCommunityModerationPath(communityId, "pricing")) },
    ],
  }, {
    label: copy.nav.accessSection,
    items: [
      { active: activeSection === "gates", icon: Lock, label: copy.nav.gates, onSelect: () => navigate(buildCommunityModerationPath(communityId, "gates")) },
      { active: activeSection === "safety", icon: Shield, label: copy.nav.safety, onSelect: () => navigate(buildCommunityModerationPath(communityId, "safety")) },
      { active: activeSection === "agents", icon: Robot, label: copy.nav.agents, onSelect: () => navigate(buildCommunityModerationPath(communityId, "agents")) },
    ],
  }, {
    label: copy.nav.verificationSection,
    items: [
      { active: activeSection === "namespace", icon: SealCheck, label: copy.nav.namespace, onSelect: () => navigate(buildCommunityModerationPath(communityId, "namespace")) },
    ],
  }];
}

export function getCommunityLinkDrafts(community: ApiCommunity): CommunityLinkEditorItem[] {
  return (community.reference_links ?? []).map((link) => ({
    id: link.community_reference_link_id,
    label: link.label ?? link.metadata.display_name ?? "",
    platform: link.platform,
    url: link.url,
    verified: link.verified,
  }));
}

export function getCommunityDonationPartnerPreview(community: ApiCommunity): DonationPartnerPreview | null {
  if (!community.donation_partner || !community.donation_partner_id) {
    return null;
  }

  return {
    donationPartnerId: community.donation_partner_id,
    displayName: community.donation_partner.display_name,
    imageUrl: community.donation_partner.image_url ?? null,
    provider: "Endaoment",
    providerPartnerRef: community.donation_partner.provider_partner_ref ?? null,
  };
}

export function buildEndaomentOrgUrl(providerPartnerRef: string | null | undefined): string {
  if (!providerPartnerRef?.trim()) {
    return "";
  }

  return `https://app.endaoment.org/orgs/${providerPartnerRef.trim()}`;
}

function extractRequiredValue(config: unknown): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>).required_value;
  return typeof value === "string" ? value : null;
}

function extractRequiredValues(config: unknown): string[] {
  if (!config || typeof config !== "object") {
    return [];
  }

  const record = config as Record<string, unknown>;
  const values = new Set<string>();
  if (typeof record.required_value === "string") {
    values.add(record.required_value);
  }
  if (Array.isArray(record.required_values)) {
    for (const value of record.required_values) {
      if (typeof value === "string") {
        values.add(value);
      }
    }
  }
  return Array.from(values);
}

function extractMinimumAge(config: unknown): number | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>).minimum_age ?? (config as Record<string, unknown>).required_minimum_age;
  return Number.isInteger(value) ? value as number : null;
}

function extractMinimumScore(config: unknown): number | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>).minimum_score;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractContractAddress(config: unknown): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>).contract_address;
  return typeof value === "string" ? value : null;
}

function extractCourtyardInventoryDraft(config: unknown): Omit<Extract<IdentityGateDraft, { gateType: "erc721_inventory_match" }>, "gateRuleId"> | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const record = config as Record<string, unknown>;
  const contractAddress = typeof record.contract_address === "string" ? record.contract_address : null;
  const minQuantity = Number.isInteger(record.min_quantity) ? record.min_quantity as number : null;
  const rawMatch = record.match ?? record.asset_filter;
  const assetFilter = rawMatch && typeof rawMatch === "object" && !Array.isArray(rawMatch)
    ? rawMatch as Record<string, unknown>
    : null;
  const category = assetFilter?.category;
  if (
    !contractAddress
    || record.inventory_provider !== "courtyard"
    || minQuantity == null
    || !assetFilter
    || category !== "trading_card" && category !== "watch"
  ) {
    return null;
  }

  return createDefaultCourtyardInventoryDraft({
    contractAddress,
    minQuantity,
    assetFilter: {
      category,
      franchise: typeof assetFilter.franchise === "string" ? assetFilter.franchise : undefined,
      subject: typeof assetFilter.subject === "string" ? assetFilter.subject : undefined,
      brand: typeof assetFilter.brand === "string" ? assetFilter.brand : undefined,
      model: typeof assetFilter.model === "string" ? assetFilter.model : undefined,
      reference: typeof assetFilter.reference === "string" ? assetFilter.reference : undefined,
      set: typeof assetFilter.set === "string" ? assetFilter.set : undefined,
      year: typeof assetFilter.year === "string" ? assetFilter.year : undefined,
      grader: typeof assetFilter.grader === "string" ? assetFilter.grader : undefined,
      grade: typeof assetFilter.grade === "string" ? assetFilter.grade : undefined,
      condition: typeof assetFilter.condition === "string" ? assetFilter.condition : undefined,
    },
  });
}

type ApiCommunityGateRule = NonNullable<ApiCommunity["gate_rules"]>[number];

function isActiveMembershipGateRule(rule: ApiCommunityGateRule): boolean {
  return rule.scope === "membership" && rule.status === "active";
}

function getCommunityGateDraft(rule: ApiCommunityGateRule): IdentityGateDraft | null {
  if (!isActiveMembershipGateRule(rule)) {
    return null;
  }

  if (rule.gate_family === "token_holding" && rule.gate_type === "erc721_holding" && rule.chain_namespace === "eip155:1") {
    const contractAddress = extractContractAddress(rule.gate_config);
    if (contractAddress) {
      return {
        gateType: "erc721_holding",
        chainNamespace: "eip155:1",
        contractAddress,
        gateRuleId: rule.gate_rule_id,
      };
    }
    return null;
  }

  if (rule.gate_family === "token_holding" && rule.gate_type === "erc721_inventory_match" && rule.chain_namespace === "eip155:137") {
    const draft = extractCourtyardInventoryDraft(rule.gate_config);
    if (draft) {
      return { ...draft, gateRuleId: rule.gate_rule_id };
    }
    return null;
  }

  if (rule.gate_family !== "identity_proof") {
    return null;
  }

  const config = rule.proof_requirements?.[0]?.config ?? rule.gate_config;
  const requiredValue = extractRequiredValue(config);

  if (rule.gate_type === "nationality") {
    const requiredValues = extractRequiredValues(config);
    if (requiredValues.length > 0) {
      return { gateType: "nationality", provider: "self", requiredValues, gateRuleId: rule.gate_rule_id };
    }
    return null;
  }

  if (rule.gate_type === "minimum_age") {
    const minimumAge = extractMinimumAge(config);
    if (minimumAge != null) {
      return { gateType: "minimum_age", provider: "self", minimumAge, gateRuleId: rule.gate_rule_id };
    }
    return null;
  }

  if (rule.gate_type === "wallet_score") {
    const minimumScore = extractMinimumScore(config);
    if (minimumScore != null) {
      return { gateType: "wallet_score", provider: "passport", minimumScore, gateRuleId: rule.gate_rule_id };
    }
    return null;
  }

  if (rule.gate_type === "gender" && (requiredValue === "M" || requiredValue === "F")) {
    return { gateType: "gender", provider: "self", requiredValue, gateRuleId: rule.gate_rule_id };
  }

  return null;
}

export function getCommunityGateDrafts(community: ApiCommunity): IdentityGateDraft[] {
  return (community.gate_rules ?? [])
    .map((rule) => getCommunityGateDraft(rule))
    .filter((draft): draft is IdentityGateDraft => draft != null);
}

export function getPreservedCommunityGateRules(community: ApiCommunity): SerializedGateRule[] {
  return (community.gate_rules ?? [])
    .filter((rule) => isActiveMembershipGateRule(rule) && getCommunityGateDraft(rule) == null)
    .map((rule) => serializeExistingCommunityGateRuleForUpdate(rule));
}

export function getPricingTierDrafts(policy: ApiCommunityPricingPolicy | null): PricingTier[] {
  return policy?.tiers.map((tier) => ({
    id: `tier-${tier.tier_key}`,
    tier_key: tier.tier_key,
    display_name: tier.display_name ?? "",
    adjustment_type: tier.adjustment_type,
    adjustment_value: tier.adjustment_value,
  })) ?? [];
}

export function getPricingCountryAssignmentDrafts(policy: ApiCommunityPricingPolicy | null): PricingCountryAssignment[] {
  return policy?.country_assignments.map((assignment) => ({
    country_code: assignment.country_code,
    tier_key: assignment.tier_key,
  })) ?? [];
}

function isValidPricingTierKey(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]*$/u.test(value);
}

export function validatePricingPolicyDraft(input: {
  countryAssignments: PricingCountryAssignment[];
  defaultTierKey: string | null;
  regionalPricingEnabled: boolean;
  tiers: PricingTier[];
}): string | null {
  if (!input.regionalPricingEnabled) return null;
  if (input.tiers.length === 0) return "Add at least one price group.";

  const seenNames = new Set<string>();
  const seenTierKeys = new Set<string>();
  for (const tier of input.tiers) {
    const name = tier.display_name.trim();
    if (!name) return "Each price group needs a name.";
    if (seenNames.has(name.toLowerCase())) return "Group names must be unique.";
    seenNames.add(name.toLowerCase());

    const tierKey = tier.tier_key.trim();
    if (!tierKey) return "Each price group needs a key.";
    if (!isValidPricingTierKey(tierKey)) return "Group keys must use lowercase letters, numbers, hyphens, or underscores.";
    if (seenTierKeys.has(tierKey)) return "Group keys must be unique.";
    if (!(tier.adjustment_value > 0)) return "Price adjustments must be greater than zero.";
    seenTierKeys.add(tierKey);
  }

  if (!input.defaultTierKey || !seenTierKeys.has(input.defaultTierKey)) return "Choose a default group.";

  const seenCountryCodes = new Set<string>();
  for (const assignment of input.countryAssignments) {
    const countryCode = assignment.country_code.trim().toUpperCase();
    if (!countryCode) return "Each country assignment needs a country.";
    if (!/^[A-Z]{2}$/u.test(countryCode)) return "Invalid country code.";
    if (seenCountryCodes.has(countryCode)) return "Each country can only be assigned to one price group.";
    if (!seenTierKeys.has(assignment.tier_key.trim())) return "Each country must belong to a group.";
    seenCountryCodes.add(countryCode);
  }

  return null;
}

export function buildStarterPricingPolicyDraft(input: {
  localCountryCodes?: string[];
} = {}): {
  countryAssignments: PricingCountryAssignment[];
  defaultTierKey: string;
  regionalPricingEnabled: true;
  tiers: PricingTier[];
  verificationProviderRequirement: "self";
} {
  const localCountryCodes = Array.from(new Set(
    (input.localCountryCodes ?? [])
      .map((code) => normalizeCountryCode(code)?.alpha2)
      .filter((code): code is string => Boolean(code)),
  ));
  const baseCountryAssignments: PricingCountryAssignment[] = [
    { country_code: "DK", tier_key: "high_income" }, { country_code: "NO", tier_key: "high_income" }, { country_code: "CH", tier_key: "high_income" },
    { country_code: "LU", tier_key: "high_income" }, { country_code: "IS", tier_key: "high_income" }, { country_code: "US", tier_key: "standard" },
    { country_code: "CA", tier_key: "standard" }, { country_code: "AU", tier_key: "standard" }, { country_code: "NZ", tier_key: "standard" },
    { country_code: "GB", tier_key: "standard" }, { country_code: "IE", tier_key: "standard" }, { country_code: "DE", tier_key: "standard" },
    { country_code: "AT", tier_key: "standard" }, { country_code: "BE", tier_key: "standard" }, { country_code: "NL", tier_key: "standard" },
    { country_code: "SE", tier_key: "standard" }, { country_code: "FI", tier_key: "standard" }, { country_code: "FR", tier_key: "reduced" },
    { country_code: "IT", tier_key: "reduced" }, { country_code: "ES", tier_key: "reduced" }, { country_code: "PT", tier_key: "reduced" },
    { country_code: "GR", tier_key: "reduced" }, { country_code: "CY", tier_key: "reduced" }, { country_code: "SI", tier_key: "reduced" },
    { country_code: "EE", tier_key: "reduced" }, { country_code: "LT", tier_key: "reduced" }, { country_code: "LV", tier_key: "reduced" },
    { country_code: "CZ", tier_key: "reduced" }, { country_code: "SK", tier_key: "reduced" }, { country_code: "MT", tier_key: "reduced" },
    { country_code: "PL", tier_key: "lower" }, { country_code: "HU", tier_key: "lower" }, { country_code: "HR", tier_key: "lower" },
    { country_code: "RO", tier_key: "lower" }, { country_code: "BG", tier_key: "lower" }, { country_code: "TR", tier_key: "lower" },
    { country_code: "BR", tier_key: "lower" }, { country_code: "MX", tier_key: "lower" }, { country_code: "CL", tier_key: "lower" },
    { country_code: "CR", tier_key: "lower" }, { country_code: "ZA", tier_key: "lower" }, { country_code: "MY", tier_key: "lower" },
    { country_code: "TH", tier_key: "lower" }, { country_code: "IN", tier_key: "lowest" }, { country_code: "ID", tier_key: "lowest" },
    { country_code: "PH", tier_key: "lowest" }, { country_code: "VN", tier_key: "lowest" }, { country_code: "NG", tier_key: "lowest" },
    { country_code: "PK", tier_key: "lowest" }, { country_code: "EG", tier_key: "lowest" }, { country_code: "MA", tier_key: "lowest" },
    { country_code: "AR", tier_key: "lowest" }, { country_code: "CO", tier_key: "lowest" }, { country_code: "PE", tier_key: "lowest" },
  ];
  const tiers: PricingTier[] = [
    { id: "starter-high_income", tier_key: "high_income", display_name: "High income", adjustment_type: "multiplier", adjustment_value: 1.15 },
    { id: "starter-standard", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 1 },
    { id: "starter-reduced", tier_key: "reduced", display_name: "Reduced", adjustment_type: "multiplier", adjustment_value: 0.85 },
    { id: "starter-lower", tier_key: "lower", display_name: "Lower", adjustment_type: "multiplier", adjustment_value: 0.7 },
    { id: "starter-lowest", tier_key: "lowest", display_name: "Lowest", adjustment_type: "multiplier", adjustment_value: 0.55 },
  ];
  const localCountrySet = new Set(localCountryCodes);
  const countryAssignments = localCountryCodes.length === 0
    ? baseCountryAssignments
    : [
      ...localCountryCodes.map((countryCode) => ({
        country_code: countryCode,
        tier_key: "local_members",
      })),
      ...baseCountryAssignments.filter((assignment) => !localCountrySet.has(assignment.country_code)),
    ];

  return {
    countryAssignments,
    defaultTierKey: "standard",
    regionalPricingEnabled: true,
    tiers: localCountryCodes.length === 0
      ? tiers
      : [
        { id: "starter-local_members", tier_key: "local_members", display_name: "Local members", adjustment_type: "multiplier", adjustment_value: 0.55 },
        ...tiers,
      ],
    verificationProviderRequirement: "self" as const,
  };
}

export function getCommunityAdultContentPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyAdultContentPolicy();
  return {
    artistic_nudity: community.adult_content_policy?.artistic_nudity ?? defaults.artistic_nudity,
    explicit_nudity: community.adult_content_policy?.explicit_nudity ?? defaults.explicit_nudity,
    explicit_sexual_content: community.adult_content_policy?.explicit_sexual_content ?? defaults.explicit_sexual_content,
    fetish_content: community.adult_content_policy?.fetish_content ?? defaults.fetish_content,
    suggestive: community.adult_content_policy?.suggestive ?? defaults.suggestive,
  };
}

export function getCommunityGraphicContentPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyGraphicContentPolicy();
  return {
    animal_harm: community.graphic_content_policy?.animal_harm ?? defaults.animal_harm,
    body_horror_disturbing: community.graphic_content_policy?.body_horror_disturbing ?? defaults.body_horror_disturbing,
    extreme_gore: community.graphic_content_policy?.extreme_gore ?? defaults.extreme_gore,
    gore: community.graphic_content_policy?.gore ?? defaults.gore,
    injury_medical: community.graphic_content_policy?.injury_medical ?? defaults.injury_medical,
  };
}

export function getCommunityCivilityPolicyState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyCivilityPolicy();
  return {
    group_directed_demeaning_language: community.civility_policy?.group_directed_demeaning_language ?? defaults.group_directed_demeaning_language,
    targeted_harassment: community.civility_policy?.targeted_harassment ?? defaults.targeted_harassment,
    targeted_insults: community.civility_policy?.targeted_insults ?? defaults.targeted_insults,
    threatening_language: community.civility_policy?.threatening_language ?? defaults.threatening_language,
  };
}

export function getCommunityOpenAIModerationSettingsState(community: ApiCommunity) {
  const defaults = createDefaultCommunitySafetyProviderSettings();
  return {
    scanCaptions: community.openai_moderation_settings?.scan_captions ?? defaults.scanCaptions,
    scanImages: community.openai_moderation_settings?.scan_images ?? defaults.scanImages,
    scanLinkPreviewText: community.openai_moderation_settings?.scan_link_preview_text ?? defaults.scanLinkPreviewText,
    scanPostBodies: community.openai_moderation_settings?.scan_post_bodies ?? defaults.scanPostBodies,
    scanTitles: community.openai_moderation_settings?.scan_titles ?? defaults.scanTitles,
  };
}
