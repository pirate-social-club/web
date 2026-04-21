"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { MembershipGateSummary as ApiMembershipGateSummary } from "@pirate/api-contracts";

import type { CommunitySidebarRule } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { getCountryDisplayName as getLocalizedCountryDisplayName } from "@/lib/countries";

function getRequirementLocale(locale: string | null | undefined): "ar" | "zh" | "en" {
  const normalized = String(locale ?? "").toLowerCase();
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  return "en";
}

function getCountryDisplayName(requiredValue: string, locale: string | null | undefined): string {
  return getLocalizedCountryDisplayName(requiredValue, locale) ?? requiredValue;
}

function formatSidebarRequirement(input: {
  gateType: string;
  requiredValue?: string | null;
  requiredValues?: string[] | null;
  requiredMinimumAge?: number | null;
  contractAddress?: string | null;
  locale?: string | null;
}): string | null {
  const locale = getRequirementLocale(input.locale);

  switch (input.gateType) {
    case "nationality": {
      const requiredValues = input.requiredValues?.length ? input.requiredValues : input.requiredValue ? [input.requiredValue] : [];
      if (requiredValues.length === 0) {
        if (locale === "ar") return "الجنسية";
        if (locale === "zh") return "国籍";
        return "Nationality";
      }
      const countries = requiredValues.map((value) => getCountryDisplayName(value, input.locale)).join(", ");
      if (locale === "ar") return `جنسية ${countries}`;
      if (locale === "zh") return `${countries} 国籍`;
      return `${countries} nationality`;
    }
    case "gender":
      if (locale === "ar") {
        return input.requiredValue
          ? `علامة الجنس في الوثيقة ${input.requiredValue}`
          : "علامة الجنس في الوثيقة";
      }
      if (locale === "zh") {
        return input.requiredValue
          ? `证件性别标记 ${input.requiredValue}`
          : "证件性别标记";
      }
      return input.requiredValue
        ? `Self document marker ${input.requiredValue}`
        : "Self document marker";
    case "age_over_18":
      return "18+";
    case "minimum_age":
      return `${input.requiredMinimumAge ?? 18}+`;
    case "unique_human":
      if (locale === "ar") return "فحص الهوية";
      if (locale === "zh") return "身份验证";
      return "ID check";
    case "wallet_score":
      if (locale === "ar") return "درجة Passport";
      if (locale === "zh") return "Passport 分数";
      return "Passport score";
    case "sanctions_clear":
      if (locale === "ar") return "خلو من العقوبات";
      if (locale === "zh") return "无制裁限制";
      return "Sanctions clear";
    case "erc721_holding":
      if (locale === "ar") return "حاملو NFT على إيثريوم";
      if (locale === "zh") return "以太坊 NFT 持有者";
      return "Ethereum NFT holder";
    case "erc721_inventory_match":
      if (locale === "ar") return "مقتنيات Courtyard";
      if (locale === "zh") return "Courtyard 藏品";
      return "Courtyard collectibles";
    default:
      return null;
  }
}

export function buildCommunitySidebarRequirements(input: {
  defaultAgeGatePolicy?: "none" | "18_plus" | null;
  gateSummaries?: Array<Pick<ApiMembershipGateSummary, "gate_type" | "required_value" | "required_values" | "required_minimum_age" | "contract_address">> | null;
  locale?: string | null;
}): string[] {
  const requirements: string[] = [];

  if (input.defaultAgeGatePolicy === "18_plus") {
    requirements.push("18+");
  }

  for (const gate of input.gateSummaries ?? []) {
      const label = formatSidebarRequirement({
        gateType: gate.gate_type,
        contractAddress: gate.contract_address ?? null,
        locale: input.locale,
        requiredValue: gate.required_value ?? null,
        requiredValues: gate.required_values ?? null,
        requiredMinimumAge: gate.required_minimum_age ?? null,
      });
    if (label && !requirements.includes(label)) {
      requirements.push(label);
    }
  }

  return requirements;
}

function getCommunityGateSummaries(
  community: ApiCommunity,
): Array<Pick<ApiMembershipGateSummary, "gate_type" | "required_value" | "required_values" | "required_minimum_age" | "contract_address">> {
  return (community.gate_rules ?? [])
    .filter((rule) => rule.scope === "membership" && rule.status === "active")
    .map((rule) => {
      const config = rule.proof_requirements?.[0]?.config ?? rule.gate_config ?? null;
      const requiredValue = config && typeof config === "object" && "required_value" in config
        ? typeof config.required_value === "string"
          ? config.required_value
          : null
        : null;
      const rawRequiredValues = config && typeof config === "object" && Array.isArray((config as Record<string, unknown>).required_values)
        ? (config as Record<string, unknown>).required_values as unknown[]
        : null;
      const requiredValues = rawRequiredValues?.filter((value): value is string => typeof value === "string") ?? null;
      const requiredMinimumAge = config && typeof config === "object" && Number.isInteger((config as Record<string, unknown>).minimum_age)
        ? (config as Record<string, unknown>).minimum_age as number
        : null;

      return {
        gate_type: rule.gate_type as ApiMembershipGateSummary["gate_type"],
        contract_address: config && typeof config === "object" && "contract_address" in config
          ? typeof config.contract_address === "string"
            ? config.contract_address
            : null
          : null,
        required_value: requiredValue,
        required_values: requiredValues,
        required_minimum_age: requiredMinimumAge,
      };
    });
}

export function buildCommunitySidebar(community: ApiCommunity, locale?: string | null) {
  const charityHref = community.donation_partner?.provider_partner_ref
    ? `https://app.endaoment.org/orgs/${community.donation_partner.provider_partner_ref}`
    : undefined;

  return {
    avatarSrc: community.avatar_ref ?? undefined,
    charity: community.donation_policy_mode !== "none" && community.donation_partner
      ? {
        avatarSrc: community.donation_partner.image_url ?? undefined,
        href: charityHref,
        name: community.donation_partner.display_name,
      }
      : null,
    createdAt: community.created_at,
    description: resolveCommunityLocalizedText(community, "community.description", community.description),
    displayName: community.display_name,
    memberCount: community.member_count ?? undefined,
    membershipMode: community.membership_mode,
    requirements: buildCommunitySidebarRequirements({
      defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
      gateSummaries: getCommunityGateSummaries(community),
      locale,
    }),
    referenceLinks: community.reference_links?.map((link) => ({
      communityReferenceLinkId: link.community_reference_link_id,
      label: resolveCommunityLocalizedText(
        community,
        `community.reference_link.${link.community_reference_link_id}.label`,
        link.label,
      ) || null,
      linkStatus: link.link_status,
      metadata: {
        displayName: resolveCommunityLocalizedText(
          community,
          `community.reference_link.${link.community_reference_link_id}.metadata.display_name`,
          link.metadata.display_name,
        ) || null,
        imageUrl: link.metadata.image_url ?? null,
      },
      platform: link.platform,
      position: link.position,
      url: link.url,
      verified: link.verified,
    })),
    rules: getCommunitySidebarRules(community),
  };
}

export function getCommunitySidebarRules(community: ApiCommunity | null): CommunitySidebarRule[] {
  return community?.community_profile?.rules?.map((rule) => ({
    body: resolveCommunityLocalizedText(
      community,
      `community.rule.${rule.rule_id}.body`,
      rule.body,
    ),
    position: rule.position,
    ruleId: rule.rule_id,
    status: rule.status,
    title: resolveCommunityLocalizedText(
      community,
      `community.rule.${rule.rule_id}.title`,
      rule.title,
    ),
  })) ?? [];
}

export function getCommunityActionLabel(status: ApiJoinEligibility["status"]): string {
  if (status === "requestable") return "Request to Join";
  if (status === "verification_required") return "Verify to Join";
  if (status === "already_joined") return "Joined";
  if (status === "banned") return "Unavailable";
  if (status === "gate_failed") return "Not eligible";
  return "Join";
}

export function getNamespaceActionLabel(community: ApiCommunity): string | null {
  if (community.namespace_verification_id) {
    return null;
  }

  return community.pending_namespace_verification_session_id
    ? "Resume verification"
    : "Verify namespace";
}
