"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { MembershipGateSummary as ApiMembershipGateSummary } from "@pirate/api-contracts";

import type { CommunitySidebarRule } from "@/components/compositions/community-sidebar/community-sidebar.types";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { getCountryName } from "@/lib/countries";

function formatSidebarRequirement(input: {
  gateType: string;
  requiredValue?: string | null;
}): string | null {
  switch (input.gateType) {
    case "nationality": {
      if (!input.requiredValue) {
        return "Nationality";
      }
      return `${getCountryName(input.requiredValue) ?? input.requiredValue} nationality`;
    }
    case "gender":
      return input.requiredValue
        ? `Self document marker ${input.requiredValue}`
        : "Self document marker";
    case "age_over_18":
      return "18+";
    case "unique_human":
      return "ID check";
    case "wallet_score":
      return "Passport score";
    case "erc721_holding":
    case "erc1155_holding":
    case "solana_nft_holding":
      return "NFT";
    case "erc20_balance":
      return "Token balance";
    case "sanctions_clear":
      return "Sanctions clear";
    default:
      return null;
  }
}

export function buildCommunitySidebarRequirements(input: {
  defaultAgeGatePolicy?: "none" | "18_plus" | null;
  gateSummaries?: Array<Pick<ApiMembershipGateSummary, "gate_type" | "required_value">> | null;
}): string[] {
  const requirements: string[] = [];

  if (input.defaultAgeGatePolicy === "18_plus") {
    requirements.push("18+");
  }

  for (const gate of input.gateSummaries ?? []) {
    const label = formatSidebarRequirement({
      gateType: gate.gate_type,
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

export function buildCommunitySidebar(community: ApiCommunity) {
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
