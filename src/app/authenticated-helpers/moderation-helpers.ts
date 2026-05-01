"use client";

import { CurrencyDollar, Database, Gavel, Heart, ImageSquare, LinkSimple, Lock, Robot, SealCheck, Shield, Tag, UserPlus } from "@phosphor-icons/react";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPricingPolicy as ApiCommunityPricingPolicy } from "@pirate/api-contracts";

import { navigate } from "@/app/router";
import type { DonationPartnerPreview } from "@/components/compositions/community/donations-editor/community-donations-editor-page";
import type { CommunityLinkEditorItem } from "@/components/compositions/community/links-editor/community-links-editor-page";
import type { IdentityGateDraft } from "@/components/compositions/community/create-composer/create-community-composer.types";
import type { PricingTier, CountryAssignment as PricingCountryAssignment } from "@/components/compositions/community/pricing-editor/community-pricing-editor-page";
import { buildCommunityPath } from "@/lib/community-routing";
import { createDefaultCourtyardInventoryDraft } from "@/lib/courtyard-inventory-gates";
import { COUNTRIES, normalizeCountryCode } from "@/lib/countries";
import { flattenGatePolicyAtoms } from "@/lib/gate-policy-utils";
import {
  createDefaultCommunitySafetyAdultContentPolicy,
  createDefaultCommunitySafetyCivilityPolicy,
  createDefaultCommunitySafetyGraphicContentPolicy,
  createDefaultCommunitySafetyProviderSettings,
} from "@/components/compositions/community/safety-page/community-safety-page";

export type CommunityModerationSection = "profile" | "rules" | "links" | "labels" | "donations" | "pricing" | "requests" | "gates" | "safety" | "agents" | "machine-access" | "namespace";

export const DEFAULT_COMMUNITY_MODERATION_SECTION: CommunityModerationSection = "profile";

export function buildCommunityModerationIndexPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return `${buildCommunityPath(communityId, routeSlug)}/mod`;
}

export function buildCommunityModerationPath(
  communityId: string,
  section: CommunityModerationSection,
  routeSlug?: string | null,
): string {
  return `${buildCommunityPath(communityId, routeSlug)}/mod/${section}`;
}

export function buildDefaultCommunityModerationPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return buildCommunityModerationPath(communityId, DEFAULT_COMMUNITY_MODERATION_SECTION, routeSlug);
}

export function buildCommunityModerationEntryPath(
  communityId: string,
  isMobileWeb: boolean,
  routeSlug?: string | null,
): string {
  return isMobileWeb
    ? buildCommunityModerationIndexPath(communityId, routeSlug)
    : buildDefaultCommunityModerationPath(communityId, routeSlug);
}

export function buildCommunityModerationSections(
  activeSection: CommunityModerationSection | null,
  communityId: string,
  copy: { nav: Record<string, string> },
  routeSlug?: string | null,
) {
  return [{
    label: copy.nav.communitySection,
    items: [
      { active: activeSection === "profile", icon: ImageSquare, label: copy.nav.profile, onSelect: () => navigate(buildCommunityModerationPath(communityId, "profile", routeSlug)) },
      { active: activeSection === "namespace", icon: SealCheck, label: copy.nav.namespace, onSelect: () => navigate(buildCommunityModerationPath(communityId, "namespace", routeSlug)) },
      { active: activeSection === "rules", icon: Gavel, label: copy.nav.rules, onSelect: () => navigate(buildCommunityModerationPath(communityId, "rules", routeSlug)) },
      { active: activeSection === "links", icon: LinkSimple, label: copy.nav.links, onSelect: () => navigate(buildCommunityModerationPath(communityId, "links", routeSlug)) },
      { active: activeSection === "labels", icon: Tag, label: copy.nav.labels, onSelect: () => navigate(buildCommunityModerationPath(communityId, "labels", routeSlug)) },
      { active: activeSection === "donations", icon: Heart, label: copy.nav.donations, onSelect: () => navigate(buildCommunityModerationPath(communityId, "donations", routeSlug)) },
      { active: activeSection === "pricing", icon: CurrencyDollar, label: copy.nav.pricing, onSelect: () => navigate(buildCommunityModerationPath(communityId, "pricing", routeSlug)) },
    ],
  }, {
    label: copy.nav.accessSection,
    items: [
      { active: activeSection === "requests", icon: UserPlus, label: "Requests", onSelect: () => navigate(buildCommunityModerationPath(communityId, "requests", routeSlug)) },
      { active: activeSection === "gates", icon: Lock, label: copy.nav.gates, onSelect: () => navigate(buildCommunityModerationPath(communityId, "gates", routeSlug)) },
      { active: activeSection === "safety", icon: Shield, label: copy.nav.safety, onSelect: () => navigate(buildCommunityModerationPath(communityId, "safety", routeSlug)) },
      { active: activeSection === "agents", icon: Robot, label: copy.nav.agents, onSelect: () => navigate(buildCommunityModerationPath(communityId, "agents", routeSlug)) },
      { active: activeSection === "machine-access", icon: Database, label: copy.nav.machineAccess, onSelect: () => navigate(buildCommunityModerationPath(communityId, "machine-access", routeSlug)) },
    ],
  }];
}

export function getCommunityLinkDrafts(community: ApiCommunity): CommunityLinkEditorItem[] {
  return (community.reference_links ?? []).map((link) => ({
    id: link.community_reference_link,
    label: link.label ?? link.metadata.display_name ?? "",
    platform: link.platform,
    url: link.url,
    verified: link.verified,
  }));
}

export function getCommunityDonationPartnerPreview(community: ApiCommunity): DonationPartnerPreview | null {
  if (!community.donation_partner || !community.donation_partner) {
    return null;
  }

  return {
    donationPartnerId: community.donation_partner.donation_partner,
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

export function getCommunityGateDrafts(community: ApiCommunity): IdentityGateDraft[] {
  return flattenGatePolicyAtoms(community.gate_policy ?? null)
    .map((atom) => getCommunityGateDraft(atom))
    .filter((draft): draft is IdentityGateDraft => draft != null);
}

function getCommunityGateDraft(atom: ReturnType<typeof flattenGatePolicyAtoms>[number]): IdentityGateDraft | null {
  if (atom.type === "erc721_holding" && atom.chain_namespace === "eip155:1" && atom.contract_address) {
    return {
      gateType: "erc721_holding",
      chainNamespace: "eip155:1",
      contractAddress: atom.contract_address,
    };
  }

  if (
    atom.type === "erc721_inventory_match"
    && atom.chain_namespace === "eip155:137"
    && atom.contract_address
    && Number.isInteger(atom.min_quantity)
  ) {
    const match = atom.match ?? {};
    const category = typeof match.category === "string" ? match.category : null;
    if (category !== "trading_card" && category !== "watch") return null;
    return createDefaultCourtyardInventoryDraft({
      contractAddress: atom.contract_address,
      minQuantity: atom.min_quantity,
      assetFilter: {
        category,
        franchise: typeof match.franchise === "string" ? match.franchise : undefined,
        subject: typeof match.subject === "string" ? match.subject : undefined,
        brand: typeof match.brand === "string" ? match.brand : undefined,
        model: typeof match.model === "string" ? match.model : undefined,
        reference: typeof match.reference === "string" ? match.reference : undefined,
        set: typeof match.set === "string" ? match.set : undefined,
        year: typeof match.year === "string" ? match.year : undefined,
        grader: typeof match.grader === "string" ? match.grader : undefined,
        grade: typeof match.grade === "string" ? match.grade : undefined,
        condition: typeof match.condition === "string" ? match.condition : undefined,
      },
    });
  }

  if (atom.type === "nationality") {
    return { gateType: "nationality", provider: "self", requiredValues: atom.allowed ?? [] };
  }

  if (atom.type === "minimum_age") {
    return typeof atom.minimum_age === "number" && Number.isInteger(atom.minimum_age)
      ? { gateType: "minimum_age", provider: "self", minimumAge: atom.minimum_age }
      : null;
  }

  if (atom.type === "wallet_score") {
    return typeof atom.minimum_score === "number" ? { gateType: "wallet_score", provider: "passport", minimumScore: atom.minimum_score } : null;
  }

  if (atom.type === "gender") {
    const marker = atom.allowed?.[0];
    return marker === "M" || marker === "F" ? { gateType: "gender", provider: "self", requiredValue: marker } : null;
  }

  return null;
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

type StarterPricingTierKey = "high_income" | "standard" | "reduced" | "lower" | "lowest";

const STARTER_PRICING_COUNTRY_CODES_BY_TIER: Record<StarterPricingTierKey, string[]> = {
  high_income: [
    "AD", "AE", "AG", "AI", "AQ", "AS", "AT", "AU", "AW", "AX", "BB", "BE", "BH", "BL", "BM", "BN", "BQ", "BS", "BV", "CA",
    "CC", "CH", "CK", "CW", "CX", "CY", "DE", "DK", "FK", "FI", "FO", "FR", "GB", "GF", "GG", "GI", "GL", "GP", "GS", "GU", "HK",
    "HM", "IE", "IL", "IM", "IO", "IS", "JE", "JP", "KR", "KW", "KY", "LI", "LU", "MC", "MF", "MO", "MP", "MQ", "MS", "NC",
    "NF", "NL", "NO", "NU", "NZ", "OM", "PF", "PM", "PN", "PR", "QA", "RE", "SA", "SE", "SG", "SH", "SJ", "SM", "SX", "TC",
    "TF", "TK", "TW", "UM", "US", "VA", "VG", "VI", "WF", "YT",
  ],
  standard: [
    "AR", "AZ", "BG", "BR", "BW", "BY", "CL", "CN", "CR", "CZ", "DM", "EE", "ES", "GD", "GR", "HR", "HU", "IT", "KN", "KZ",
    "LC", "LT", "LV", "MT", "MU", "MV", "MX", "MY", "PA", "PL", "PT", "RO", "RU", "SC", "SK", "SI", "TH", "TR", "TT", "UY",
    "VC", "ZA",
  ],
  reduced: [
    "AL", "AM", "BA", "BZ", "CO", "CU", "DO", "DZ", "EC", "FJ", "FM", "GA", "GE", "GQ", "GT", "GY", "ID", "IR", "IQ", "JM",
    "JO", "LB", "LK", "LY", "MA", "MD", "ME", "MH", "MK", "MN", "NA", "NR", "PE", "PS", "PW", "PY", "RS", "SB", "SR", "SV",
    "TN", "TM", "TO", "UA", "UZ", "VE", "VU", "WS", "XK",
  ],
  lower: [
    "AO", "BO", "BT", "CV", "DJ", "HN", "KG", "KI", "LS", "MR", "NI", "PG", "SZ", "TJ", "TL", "TV",
  ],
  lowest: [
    "AF", "BD", "BF", "BI", "BJ", "CD", "CF", "CG", "CI", "CM", "EG", "EH", "ER", "ET", "GH", "GM", "GN", "GW", "HT", "IN",
    "KE", "KH", "KM", "KP", "LA", "LR", "MG", "ML", "MM", "MW", "MZ", "NE", "NG", "NP", "PH", "PK", "RW", "SD", "SL", "SN",
    "SO", "SS", "ST", "SY", "TD", "TG", "TZ", "UG", "VN", "YE", "ZM", "ZW",
  ],
};

const STARTER_PRICING_TIER_BY_COUNTRY_CODE = Object.fromEntries(
  Object.entries(STARTER_PRICING_COUNTRY_CODES_BY_TIER).flatMap(([tierKey, countryCodes]) =>
    countryCodes.map((countryCode) => [countryCode, tierKey]),
  ),
) as Record<string, StarterPricingTierKey | undefined>;

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
  const baseCountryAssignments: PricingCountryAssignment[] = COUNTRIES.map((country) => {
    const tierKey = STARTER_PRICING_TIER_BY_COUNTRY_CODE[country.code];
    if (!tierKey) {
      throw new Error(`Missing starter pricing tier for ${country.code}.`);
    }
    return {
      country_code: country.code,
      tier_key: tierKey,
    };
  });
  const tiers: PricingTier[] = [
    { id: "starter-high_income", tier_key: "high_income", display_name: "High income", adjustment_type: "multiplier", adjustment_value: 1 },
    { id: "starter-standard", tier_key: "standard", display_name: "Standard", adjustment_type: "multiplier", adjustment_value: 0.65 },
    { id: "starter-reduced", tier_key: "reduced", display_name: "Reduced", adjustment_type: "multiplier", adjustment_value: 0.4 },
    { id: "starter-lower", tier_key: "lower", display_name: "Lower", adjustment_type: "multiplier", adjustment_value: 0.25 },
    { id: "starter-lowest", tier_key: "lowest", display_name: "Lowest", adjustment_type: "multiplier", adjustment_value: 0.1 },
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
        { id: "starter-local_members", tier_key: "local_members", display_name: "Local members", adjustment_type: "multiplier", adjustment_value: 0.08 },
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
