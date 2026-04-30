"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { MembershipGateSummary as ApiMembershipGateSummary } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { CommunitySidebarRoleHolder, CommunitySidebarRule } from "@/components/compositions/community/sidebar/community-sidebar.types";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { getCountryDisplayName as getLocalizedCountryDisplayName } from "@/lib/countries";

type SidebarGateSummary = Pick<
  ApiMembershipGateSummary,
  | "accepted_providers"
  | "contract_address"
  | "gate_type"
  | "minimum_score"
  | "required_minimum_age"
  | "required_value"
  | "required_values"
>;

function normalizeCommunityMembershipMode(mode: ApiCommunity["membership_mode"] | ApiCommunityPreview["membership_mode"]): "request" | "gated" {
  return mode === "request" ? "request" : "gated";
}

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
  acceptedProviders?: ApiMembershipGateSummary["accepted_providers"];
  gateType: string;
  requiredValue?: string | null;
  requiredValues?: string[] | null;
  requiredMinimumAge?: number | null;
  minimumScore?: number | null;
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
        ? `Document sex marker ${input.requiredValue}`
        : "Document sex marker";
    case "age_over_18":
      return "18+";
    case "minimum_age":
      return `${input.requiredMinimumAge ?? 18}+`;
    case "unique_human": {
      const acceptedProviders = input.acceptedProviders ?? [];
      const isVeryOnly = acceptedProviders.length === 1 && acceptedProviders[0] === "very";
      const isSelfOnly = acceptedProviders.length === 1 && acceptedProviders[0] === "self";
      if (isVeryOnly) {
        if (locale === "ar") return "فحص راحة اليد";
        if (locale === "zh") return "掌纹扫描";
        return "Palm scan";
      }
      if (isSelfOnly) {
        if (locale === "ar") return "إثبات الهوية الخاص";
        if (locale === "zh") return "私密身份证明";
        return "Private ID proof";
      }
      if (locale === "ar") return "إثبات أنك إنسان";
      if (locale === "zh") return "真人证明";
      return "Human proof";
    }
    case "wallet_score":
      if (typeof input.minimumScore === "number") {
        if (locale === "ar") return `درجة Passport ${input.minimumScore}+`;
        if (locale === "zh") return `Passport 分数 ${input.minimumScore}+`;
        return `Passport score ${input.minimumScore}+`;
      }
      if (locale === "ar") return "درجة Passport";
      if (locale === "zh") return "Passport 分数";
      return "Passport score";
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
  gateSummaries?: SidebarGateSummary[] | null;
  locale?: string | null;
}): string[] {
  const requirements: string[] = [];

  if (input.defaultAgeGatePolicy === "18_plus") {
    requirements.push("18+");
  }

  for (const gate of input.gateSummaries ?? []) {
      const label = formatSidebarRequirement({
        acceptedProviders: gate.accepted_providers ?? null,
        gateType: gate.gate_type,
        contractAddress: gate.contract_address ?? null,
        locale: input.locale,
        requiredValue: gate.required_value ?? null,
        requiredValues: gate.required_values ?? null,
        requiredMinimumAge: gate.required_minimum_age ?? null,
        minimumScore: gate.minimum_score ?? null,
      });
    if (label && !requirements.includes(label)) {
      requirements.push(label);
    }
  }

  return requirements;
}

function getCommunityGateSummaries(
  community: ApiCommunity,
): SidebarGateSummary[] {
  const policy = community.gate_policy;
  if (!policy) return [];
  type ApiGateAtom = NonNullable<typeof policy.expression.gate>;
  type ApiGateExpression = Omit<typeof policy.expression, "children" | "gate"> & {
    children?: ApiGateExpression[];
    gate?: ApiGateAtom;
  };
  const atoms: ApiGateAtom[] = [];
  const collect = (expression: ApiGateExpression): void => {
    if (expression.op === "gate" && expression.gate) {
      atoms.push(expression.gate);
      return;
    }
    expression.children?.forEach(collect);
  };
  collect(policy.expression as ApiGateExpression);
  return atoms.map((atom) => ({
    accepted_providers: "provider" in atom && (atom.provider === "self" || atom.provider === "very" || atom.provider === "passport")
      ? [atom.provider]
      : null,
    gate_type: atom.type as ApiMembershipGateSummary["gate_type"],
    contract_address: "contract_address" in atom ? atom.contract_address : null,
    required_value: atom.type === "gender" ? atom.allowed?.[0] ?? null : atom.type === "nationality" && atom.allowed?.length === 1 ? atom.allowed[0] : null,
    required_values: atom.type === "nationality" && (atom.allowed?.length ?? 0) > 1 ? atom.allowed : atom.type === "gender" && (atom.allowed?.length ?? 0) > 1 ? atom.allowed : null,
    required_minimum_age: atom.type === "minimum_age" ? atom.minimum_age : null,
    minimum_score: atom.type === "wallet_score" ? atom.minimum_score : null,
  }));
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
    createdAt: community.created,
    communityId: community.id,
    description: resolveCommunityLocalizedText(community, "community.description", community.description),
    displayName: community.display_name,
    memberCount: community.member_count ?? undefined,
    membershipMode: normalizeCommunityMembershipMode(community.membership_mode),
    requirements: buildCommunitySidebarRequirements({
      defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
      gateSummaries: getCommunityGateSummaries(community),
      locale,
    }),
    referenceLinks: community.reference_links?.map((link) => ({
      communityReferenceLinkId: link.community_reference_link,
      label: resolveCommunityLocalizedText(
        community,
        `community.reference_link.${link.community_reference_link}.label`,
        link.label,
      ) || null,
      linkStatus: link.link_status,
      metadata: {
        displayName: resolveCommunityLocalizedText(
          community,
          `community.reference_link.${link.community_reference_link}.metadata.display_name`,
          link.metadata.display_name,
        ) || null,
        imageUrl: link.metadata.image_url ?? null,
      },
      platform: link.platform,
      position: link.position,
      url: link.url,
      verified: link.verified,
    })),
    owner: undefined,
    moderators: [],
    rules: getCommunitySidebarRules(community),
  };
}

export function buildCommunitySidebarRoleHolderFromProfile(profile: ApiProfile | null | undefined): CommunitySidebarRoleHolder | null {
  if (!profile) {
    return null;
  }

  const handle = profile.primary_public_handle?.label?.trim()
    || profile.global_handle.label.trim();
  const displayName = profile.display_name?.trim() || handle;
  if (!handle || !displayName) {
    return null;
  }

  return {
    user: profile.id,
    avatarSeed: profile.id,
    avatarSrc: profile.avatar_ref ?? undefined,
    displayName,
    handle,
    nationalityBadgeCountryCode: profile.nationality_badge_country ?? undefined,
    nationalityBadgeLabel: profile.nationality_badge_country ?? undefined,
    role: "owner" as const,
  };
}

export function buildCommunityPreviewSidebar(preview: ApiCommunityPreview, locale?: string | null) {
  const charityHref = preview.donation_partner?.provider_partner_ref
    ? `https://app.endaoment.org/orgs/${preview.donation_partner.provider_partner_ref}`
    : undefined;

  return {
    avatarSrc: preview.avatar_ref ?? undefined,
    charity: preview.donation_policy_mode !== "none" && preview.donation_partner
      ? {
        avatarSrc: preview.donation_partner.image_url ?? undefined,
        href: charityHref,
        name: preview.donation_partner.display_name,
      }
      : null,
    createdAt: preview.created,
    communityId: preview.id,
    description: resolveCommunityLocalizedText(preview, "community.description", preview.description),
    displayName: preview.display_name,
    followerCount: preview.follower_count ?? undefined,
    memberCount: preview.member_count ?? undefined,
    membershipMode: normalizeCommunityMembershipMode(preview.membership_mode),
    owner: preview.owner
      ? {
        user: preview.owner.user,
        avatarSeed: preview.owner.user,
        avatarSrc: preview.owner.avatar_ref ?? undefined,
        displayName: preview.owner.display_name,
        handle: preview.owner.handle,
        nationalityBadgeCountryCode: preview.owner.nationality_badge_country ?? undefined,
        nationalityBadgeLabel: preview.owner.nationality_badge_country ?? undefined,
        role: preview.owner.role,
      }
      : null,
    moderators: preview.moderators.map((mod) => ({
      user: mod.user,
      avatarSeed: mod.user,
      avatarSrc: mod.avatar_ref ?? undefined,
      displayName: mod.display_name,
      handle: mod.handle,
      nationalityBadgeCountryCode: mod.nationality_badge_country ?? undefined,
      nationalityBadgeLabel: mod.nationality_badge_country ?? undefined,
      role: mod.role,
    })),
    requirements: buildCommunitySidebarRequirements({
      gateSummaries: preview.membership_gate_summaries,
      locale,
    }),
    referenceLinks: preview.reference_links?.map((link) => ({
      communityReferenceLinkId: link.community_reference_link,
      label: resolveCommunityLocalizedText(
        preview,
        `community.reference_link.${link.community_reference_link}.label`,
        link.label,
      ) || null,
      linkStatus: link.link_status,
      metadata: {
        displayName: resolveCommunityLocalizedText(
          preview,
          `community.reference_link.${link.community_reference_link}.metadata.display_name`,
          link.metadata.display_name,
        ) || null,
        imageUrl: link.metadata.image_url ?? null,
      },
      platform: link.platform,
      position: link.position,
      url: link.url,
      verified: link.verified,
    })),
    rules: preview.rules.map((rule) => ({
      body: resolveCommunityLocalizedText(preview, `community.rule.${rule.id}.body`, rule.body),
      position: rule.position,
      ruleId: rule.id,
      status: rule.status,
      title: resolveCommunityLocalizedText(preview, `community.rule.${rule.id}.title`, rule.title),
    })),
  };
}

export function getCommunitySidebarRules(community: ApiCommunity | null): CommunitySidebarRule[] {
  return community?.community_profile?.rules?.map((rule) => ({
    body: resolveCommunityLocalizedText(
      community,
      `community.rule.${rule.id}.body`,
      rule.body,
    ),
    position: rule.position,
    ruleId: rule.id,
    status: rule.status,
    title: resolveCommunityLocalizedText(
      community,
      `community.rule.${rule.id}.title`,
      rule.title,
    ),
  })) ?? [];
}

export function getCommunityActionLabel(status: ApiJoinEligibility["status"]): string {
  if (status === "requestable") return "Request to Join";
  if (status === "pending_request") return "Request pending";
  if (status === "verification_required") return "Verify to Join";
  if (status === "already_joined") return "Joined";
  if (status === "banned") return "Unavailable";
  if (status === "gate_failed") return "Not eligible";
  return "Join";
}

export function getNamespaceActionLabel(community: ApiCommunity): string | null {
  if (community.namespace_verification) {
    return null;
  }

  return community.pending_namespace_verification_session
    ? "Resume verification"
    : "Verify namespace";
}
