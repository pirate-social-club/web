"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { MembershipGateSummary as ApiMembershipGateSummary } from "@pirate/api-contracts";

import type { CommunitySidebarRule } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { getCountryName } from "@/lib/countries";

function getRequirementLocale(locale: string | null | undefined): "ar" | "zh" | "en" {
  const normalized = String(locale ?? "").toLowerCase();
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  return "en";
}

function getCountryDisplayName(requiredValue: string, locale: string | null | undefined): string {
  const normalizedCode = requiredValue.toUpperCase();
  const requirementLocale = getRequirementLocale(locale);
  if (normalizedCode === "PS") {
    if (requirementLocale === "ar") return "فلسطين";
    if (requirementLocale === "zh") return "巴勒斯坦";
    return "Palestine";
  }

  if (requirementLocale === "en") {
    return getCountryName(requiredValue) ?? requiredValue;
  }

  try {
    const displayNames = new Intl.DisplayNames([locale ?? "en"], { type: "region" });
    return displayNames.of(normalizedCode) ?? getCountryName(requiredValue) ?? requiredValue;
  } catch {
    return getCountryName(requiredValue) ?? requiredValue;
  }
}

function formatSidebarRequirement(input: {
  gateType: string;
  requiredValue?: string | null;
  locale?: string | null;
}): string | null {
  const locale = getRequirementLocale(input.locale);

  switch (input.gateType) {
    case "nationality": {
      if (!input.requiredValue) {
        if (locale === "ar") return "الجنسية";
        if (locale === "zh") return "国籍";
        return "Nationality";
      }
      const country = getCountryDisplayName(input.requiredValue, input.locale);
      if (locale === "ar") return `جنسية ${country}`;
      if (locale === "zh") return `${country} 国籍`;
      return `${country} nationality`;
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
    case "unique_human":
      if (locale === "ar") return "فحص الهوية";
      if (locale === "zh") return "身份验证";
      return "ID check";
    case "wallet_score":
      if (locale === "ar") return "درجة Passport";
      if (locale === "zh") return "Passport 分数";
      return "Passport score";
    case "erc721_holding":
    case "erc1155_holding":
    case "solana_nft_holding":
      return "NFT";
    case "erc20_balance":
      if (locale === "ar") return "رصيد الرمز";
      if (locale === "zh") return "代币余额";
      return "Token balance";
    case "sanctions_clear":
      if (locale === "ar") return "خلو من العقوبات";
      if (locale === "zh") return "无制裁限制";
      return "Sanctions clear";
    default:
      return null;
  }
}

export function buildCommunitySidebarRequirements(input: {
  defaultAgeGatePolicy?: "none" | "18_plus" | null;
  gateSummaries?: Array<Pick<ApiMembershipGateSummary, "gate_type" | "required_value">> | null;
  locale?: string | null;
}): string[] {
  const requirements: string[] = [];

  if (input.defaultAgeGatePolicy === "18_plus") {
    requirements.push("18+");
  }

  for (const gate of input.gateSummaries ?? []) {
    const label = formatSidebarRequirement({
      gateType: gate.gate_type,
      locale: input.locale,
      requiredValue: gate.required_value ?? null,
    });
    if (label && !requirements.includes(label)) {
      requirements.push(label);
    }
  }

  return requirements;
}

function getCommunityGateSummaries(
  community: ApiCommunity,
): Array<Pick<ApiMembershipGateSummary, "gate_type" | "required_value">> {
  return (community.gate_rules ?? [])
    .filter((rule) => rule.scope === "membership" && rule.status === "active")
    .map((rule) => {
      const config = rule.proof_requirements?.[0]?.config ?? rule.gate_config ?? null;
      const requiredValue = config && typeof config === "object" && "required_value" in config
        ? typeof config.required_value === "string"
          ? config.required_value
          : null
        : null;

      return {
        gate_type: rule.gate_type as ApiMembershipGateSummary["gate_type"],
        required_value: requiredValue,
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
