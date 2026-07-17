"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { JoinEligibility as ApiJoinEligibility } from "@pirate/api-contracts";
import type { MembershipGateSummary as ApiMembershipGateSummary } from "@pirate/api-contracts";
import type { MembershipGateExpressionSummary as ApiMembershipGateExpressionSummary } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { CommunitySidebarGateItem, CommunitySidebarRoleHolder, CommunitySidebarRule } from "@/components/compositions/community/sidebar/community-sidebar.types";
import type { CommunityDefaultAgeGatePolicy } from "@/lib/community-access-types";
import { resolveCommunityLocalizedText } from "@/lib/community-localization";
import { getCountryDisplayName as getLocalizedCountryDisplayName } from "@/lib/countries";
import { hasActionTimeCheck, isJoinSurfaceGate } from "@/lib/identity-gates";
import { flattenGatePolicyAtoms, getGatePolicyMatchMode, isFlatOrGateExpression } from "@/lib/gate-policy-utils";
import { deriveGateStatuses } from "@/lib/community-gate-statuses";
import { formatAssetAmount } from "@/lib/asset-amount";

type SidebarGateSummary = Pick<
  ApiMembershipGateSummary,
  | "accepted_providers"
  | "asset_category"
  | "asset_decimals"
  | "asset_filter_label"
  | "asset_id"
  | "asset_symbol"
  | "contract_address"
  | "gate_type"
  | "min_amount_atomic"
  | "min_quantity"
  | "minimum_score"
  | "required_minimum_age"
  | "required_value"
  | "required_values"
>;

type RecursiveGateExpression = {
  op: "and" | "or" | "gate";
  children?: RecursiveGateExpression[];
};

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

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Renders an asset-balance requirement as a human amount, e.g. `0.5 ETH`.
 *
 * Returns null unless the summary carries everything needed to be exact. The
 * atomic amount is meaningless without its asset's decimals, so a partial
 * summary must degrade to a vaguer label rather than guess a scale.
 */
function formatBalanceGateAmount(input: {
  assetDecimals?: number | null;
  assetSymbol?: string | null;
  minAmountAtomic?: string | null;
}): string | null {
  if (!input.minAmountAtomic || typeof input.assetDecimals !== "number" || !input.assetSymbol) return null;
  const amount = formatAssetAmount(input.minAmountAtomic, input.assetDecimals);
  return amount ? `${amount} ${input.assetSymbol}` : null;
}

function formatInventoryAssetLabel(input: {
  assetFilterLabel?: string | null;
  assetCategory?: string | null;
  minQuantity?: number | null;
}): string {
  if (input.assetFilterLabel?.trim()) return input.assetFilterLabel.trim();
  const plural = (input.minQuantity ?? 1) !== 1;
  if (input.assetCategory === "watch") return plural ? "watches" : "watch";
  return plural ? "cards" : "card";
}

function formatSidebarRequirement(input: {
  acceptedProviders?: ApiMembershipGateSummary["accepted_providers"];
  assetCategory?: string | null;
  assetDecimals?: number | null;
  assetFilterLabel?: string | null;
  assetSymbol?: string | null;
  gateType: string;
  minAmountAtomic?: string | null;
  requiredValue?: string | null;
  requiredValues?: string[] | null;
  requiredMinimumAge?: number | null;
  minimumScore?: number | null;
  contractAddress?: string | null;
  minQuantity?: number | null;
  locale?: string | null;
}): string | null {
  const locale = getRequirementLocale(input.locale);

  switch (input.gateType) {
    case "nationality": {
      const requiredValues = input.requiredValues?.length ? input.requiredValues : input.requiredValue ? [input.requiredValue] : [];
      if (requiredValues.length === 0) {
        if (locale === "ar") return "التحقق من الجنسية";
        if (locale === "zh") return "国籍验证";
        return "Nationality verification";
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
    case "altcha_pow":
      if (locale === "ar") return "إثبات العمل";
      if (locale === "zh") return "工作量证明";
      return "Proof of work";
    case "wallet_score":
      if (typeof input.minimumScore === "number") {
        if (locale === "ar") return `درجة Passport ${input.minimumScore}+`;
        if (locale === "zh") return `Passport 分数 ${input.minimumScore}+`;
        return `Passport score ${input.minimumScore}+`;
      }
      if (locale === "ar") return "درجة Passport";
      if (locale === "zh") return "Passport 分数";
      return "Passport score";
    case "erc721_holding": {
      const label = input.contractAddress ? shortenAddress(input.contractAddress) : null;
      const quantity = input.minQuantity ?? 1;
      if (label) {
        if (locale === "ar") return `${quantity} NFT على إيثريوم من ${label}`;
        if (locale === "zh") return `${quantity} 个来自 ${label} 的以太坊 NFT`;
        return `${quantity} Ethereum NFT${quantity === 1 ? "" : "s"} from ${label}`;
      }
      if (locale === "ar") return `${quantity} NFT على إيثريوم`;
      if (locale === "zh") return `${quantity} 个以太坊 NFT`;
      return `${quantity} Ethereum NFT${quantity === 1 ? "" : "s"}`;
    }
    case "erc721_inventory_match": {
      const quantity = String(input.minQuantity ?? 1);
      const assetLabel = formatInventoryAssetLabel(input);
      if (locale === "ar") return `${quantity} مقتنيات Courtyard ${assetLabel}`;
      if (locale === "zh") return `${quantity} Courtyard ${assetLabel}`;
      return `${quantity} Courtyard ${assetLabel}`;
    }
    case "asset_balance": {
      const amount = formatBalanceGateAmount(input);
      // Symbol and decimals ride on the API summary. Without them an atomic
      // integer cannot be rendered as an amount at all, so say only what is
      // known rather than showing raw atomic units as if they were tokens.
      if (!amount) {
        if (locale === "ar") return "رصيد رمز مطلوب";
        if (locale === "zh") return "需要代币余额";
        return "Token balance required";
      }
      if (locale === "ar") return `${amount} على الأقل`;
      if (locale === "zh") return `至少 ${amount}`;
      return `At least ${amount}`;
    }
    default:
      return null;
  }
}

function formatGateExpressionLabel(
  expression: ApiMembershipGateExpressionSummary | null | undefined,
  locale: string | null | undefined,
): string | null {
  if (!expression) return null;
  const operators = new Set<"and" | "or">();
  const collectOperators = (node: ApiMembershipGateExpressionSummary): void => {
    if (node.op === "gate") return;
    operators.add(node.op);
    node.children.forEach(collectOperators);
  };
  collectOperators(expression);
  if (operators.size < 2) return null;

  const listLocale = locale === "pseudo" ? "en" : locale || "en";

  const visit = (
    node: ApiMembershipGateExpressionSummary,
    parentOp?: "and" | "or",
  ): string | null => {
    if (node.op === "gate") {
      return formatSidebarRequirement({
        acceptedProviders: node.gate.accepted_providers,
        assetCategory: node.gate.asset_category,
        assetFilterLabel: node.gate.asset_filter_label,
        assetDecimals: node.gate.asset_decimals,
        assetSymbol: node.gate.asset_symbol,
        minAmountAtomic: node.gate.min_amount_atomic,
        contractAddress: node.gate.contract_address,
        gateType: node.gate.gate_type,
        minQuantity: node.gate.min_quantity,
        minimumScore: node.gate.minimum_score,
        requiredMinimumAge: node.gate.required_minimum_age,
        requiredValue: node.gate.required_value,
        requiredValues: node.gate.required_values,
        locale,
      });
    }

    const parts = node.children.flatMap((child) => {
      const label = visit(child, node.op);
      return label ? [label] : [];
    });
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    const label = new Intl.ListFormat(listLocale, {
      style: "long",
      type: node.op === "or" ? "disjunction" : "conjunction",
    }).format(parts);
    return parentOp && parentOp !== node.op ? `(${label})` : label;
  };

  return visit(expression);
}

function buildGateExpressionSummary(
  policy: ApiCommunity["gate_policy"],
  gateSummaries: SidebarGateSummary[],
): ApiMembershipGateExpressionSummary | null {
  if (!policy) return null;
  let gateIndex = 0;

  const visit = (expression: RecursiveGateExpression): ApiMembershipGateExpressionSummary | null => {
    if (expression.op === "gate") {
      const gate = gateSummaries[gateIndex++];
      return gate ? { op: "gate", gate } : null;
    }

    const children = (expression.children ?? []).flatMap((child) => {
      const summary = visit(child);
      return summary ? [summary] : [];
    });
    return children.length > 0 ? { op: expression.op, children } : null;
  };

  return visit(policy.expression as RecursiveGateExpression);
}

export function buildCommunitySidebarRequirements(input: {
  defaultAgeGatePolicy?: CommunityDefaultAgeGatePolicy | null;
  gateSummaries?: SidebarGateSummary[] | null;
  locale?: string | null;
}): string[] {
  const requirements: string[] = [];
  const requirementLabels = new Set<string>();

  if (input.defaultAgeGatePolicy === "18_plus") {
    requirements.push("18+");
  }

  for (const gate of (input.gateSummaries ?? []).filter(isJoinSurfaceGate)) {
      const label = formatSidebarRequirement({
        acceptedProviders: gate.accepted_providers ?? null,
        assetCategory: gate.asset_category ?? null,
        assetFilterLabel: gate.asset_filter_label ?? null,
        assetDecimals: gate.asset_decimals ?? null,
        assetSymbol: gate.asset_symbol ?? null,
        minAmountAtomic: gate.min_amount_atomic ?? null,
        gateType: gate.gate_type,
        contractAddress: gate.contract_address ?? null,
        minQuantity: gate.min_quantity ?? null,
        locale: input.locale,
        requiredValue: gate.required_value ?? null,
        requiredValues: gate.required_values ?? null,
        requiredMinimumAge: gate.required_minimum_age ?? null,
        minimumScore: gate.minimum_score ?? null,
      });
    if (label && !requirementLabels.has(label)) {
      requirementLabels.add(label);
      requirements.push(label);
    }
  }

  return requirements;
}

function resolveGateProvider(gate: SidebarGateSummary): CommunitySidebarGateItem["provider"] {
  const providers = gate.accepted_providers;
  if (providers && providers.length === 1) {
    const p = providers[0];
    if (p === "self" || p === "very" || p === "passport") {
      return p;
    }
  }
  return null;
}

function applyGateStatuses(
  items: CommunitySidebarGateItem[],
  eligibility: ApiJoinEligibility | null | undefined,
  gateMatchMode?: "all" | "any" | null,
  traceExcludedIndexes: number[] = [],
): CommunitySidebarGateItem[] {
  const excluded = new Set(traceExcludedIndexes);
  const statuses = deriveGateStatuses({
    eligibility,
    gateMatchMode,
    requirements: items.map((item, index) => ({
      gate_type: item.gateType as ApiMembershipGateSummary["gate_type"],
      trace_match: !excluded.has(index),
    })),
  });
  return items.map((item, index) => ({ ...item, status: statuses[index] ?? "unknown" }));
}

export function buildCommunitySidebarGateItems(input: {
  defaultAgeGatePolicy?: CommunityDefaultAgeGatePolicy | null;
  gateSummaries?: SidebarGateSummary[] | null;
  locale?: string | null;
  eligibility?: ApiJoinEligibility | null;
  gateMatchMode?: "all" | "any" | null;
}): CommunitySidebarGateItem[] {
  const items: CommunitySidebarGateItem[] = [];
  const seenLabels = new Set<string>();
  const traceExcludedIndexes: number[] = [];

  if (input.defaultAgeGatePolicy === "18_plus") {
    const label = formatSidebarRequirement({ gateType: "age_over_18", locale: input.locale });
    if (label) {
      seenLabels.add(label);
      traceExcludedIndexes.push(items.length);
      items.push({
        gateType: "age_over_18",
        label,
        provider: null,
        status: "unknown",
      });
    }
  }

  for (const gate of (input.gateSummaries ?? []).filter(isJoinSurfaceGate)) {
    const label = formatSidebarRequirement({
      acceptedProviders: gate.accepted_providers ?? null,
      assetCategory: gate.asset_category ?? null,
      assetFilterLabel: gate.asset_filter_label ?? null,
      assetDecimals: gate.asset_decimals ?? null,
      assetSymbol: gate.asset_symbol ?? null,
      minAmountAtomic: gate.min_amount_atomic ?? null,
      contractAddress: gate.contract_address ?? null,
      gateType: gate.gate_type,
      locale: input.locale,
      minQuantity: gate.min_quantity ?? null,
      requiredValue: gate.required_value ?? null,
      requiredValues: gate.required_values ?? null,
      requiredMinimumAge: gate.required_minimum_age ?? null,
      minimumScore: gate.minimum_score ?? null,
    });
    if (label && !seenLabels.has(label)) {
      seenLabels.add(label);
      items.push({
        gateType: gate.gate_type,
        label,
        provider: resolveGateProvider(gate),
        status: "unknown",
      });
    }
  }

  return applyGateStatuses(items, input.eligibility, input.gateMatchMode, traceExcludedIndexes);
}

/**
 * Indexes asset display metadata from API-built gate summaries by asset id.
 *
 * The authenticated sidebar projects its rows from raw `gate_policy` atoms, but
 * an `asset_balance` atom carries only an id and an atomic amount — symbol and
 * decimals live on the API summary. An asset id fully determines both (it is
 * the server registry's key), so matching by id avoids depending on the two
 * lists being ordered alike.
 */
function indexAssetDisplayByAssetId(
  gateSummaries: ApiMembershipGateSummary[] | null | undefined,
): Map<string, { symbol: string | null; decimals: number | null }> {
  const byAssetId = new Map<string, { symbol: string | null; decimals: number | null }>();
  for (const summary of gateSummaries ?? []) {
    if (summary.gate_type !== "asset_balance" || !summary.asset_id) continue;
    byAssetId.set(summary.asset_id, {
      symbol: summary.asset_symbol ?? null,
      decimals: typeof summary.asset_decimals === "number" ? summary.asset_decimals : null,
    });
  }
  return byAssetId;
}

export function getCommunityGateSummaries(
  community: ApiCommunity,
  apiGateSummaries?: ApiMembershipGateSummary[] | null,
): SidebarGateSummary[] {
  const assetDisplay = indexAssetDisplayByAssetId(apiGateSummaries);
  return flattenGatePolicyAtoms(community.gate_policy).map((atom) => ({
    accepted_providers: "provider" in atom && (atom.provider === "self" || atom.provider === "very" || atom.provider === "passport")
      ? [atom.provider]
      : null,
    asset_category: "asset_category" in atom ? (atom.asset_category as string | null | undefined) : null,
    asset_filter_label: "asset_filter_label" in atom ? (atom.asset_filter_label as string | null | undefined) : null,
    contract_address: "contract_address" in atom ? atom.contract_address : null,
    gate_type: atom.type as ApiMembershipGateSummary["gate_type"],
    min_quantity: atom.type === "erc721_holding"
      ? ("min_count" in atom && typeof atom.min_count === "number" ? atom.min_count : 1)
      : "min_quantity" in atom ? atom.min_quantity : null,
    required_value: atom.type === "gender" ? atom.allowed?.[0] ?? null : atom.type === "nationality" && atom.allowed?.length === 1 ? atom.allowed[0] : null,
    required_values: atom.type === "nationality" && (atom.allowed?.length ?? 0) > 1 ? atom.allowed : atom.type === "gender" && (atom.allowed?.length ?? 0) > 1 ? atom.allowed : null,
    required_minimum_age: atom.type === "minimum_age" ? atom.minimum_age : null,
    minimum_score: atom.type === "wallet_score" ? atom.minimum_score : null,
    asset_id: atom.type === "asset_balance" ? atom.asset_id ?? null : null,
    min_amount_atomic: atom.type === "asset_balance" ? atom.min_amount_atomic ?? null : null,
    asset_symbol: atom.type === "asset_balance" && atom.asset_id
      ? assetDisplay.get(atom.asset_id)?.symbol ?? null
      : null,
    asset_decimals: atom.type === "asset_balance" && atom.asset_id
      ? assetDisplay.get(atom.asset_id)?.decimals ?? null
      : null,
  }));
}

export function buildCommunitySidebar(community: ApiCommunity, locale?: string | null, eligibility?: ApiJoinEligibility | null) {
  // The community payload has no API-built gate summaries, so asset display
  // metadata is sourced from the eligibility readout when it has loaded.
  const gateSummaries = getCommunityGateSummaries(community, eligibility?.membership_gate_summaries);
  const gateExpression = buildGateExpressionSummary(community.gate_policy, gateSummaries);
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
    store: community.store_url
      ? {
        label: community.store_label ?? null,
        url: community.store_url,
      }
      : null,
    requirements: buildCommunitySidebarRequirements({
      defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
      gateSummaries,
      locale,
    }),
    gates: buildCommunitySidebarGateItems({
      defaultAgeGatePolicy: community.default_age_gate_policy ?? "none",
      gateSummaries,
      locale,
      eligibility,
      gateMatchMode: getGatePolicyMatchMode(community.gate_policy),
    }),
    gateExpressionLabel: formatGateExpressionLabel(gateExpression, locale),
    showFlatGateOrMarkers: (community.default_age_gate_policy ?? "none") !== "18_plus"
      && isFlatOrGateExpression(community.gate_policy?.expression),
    hasActionTimeCheck: hasActionTimeCheck(gateSummaries),
    requirementsMode: getGatePolicyMatchMode(community.gate_policy),
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

export function buildCommunityPreviewSidebar(preview: ApiCommunityPreview, locale?: string | null, eligibility?: ApiJoinEligibility | null) {
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
    store: preview.store_url
      ? {
        label: preview.store_label ?? null,
        url: preview.store_url,
      }
      : null,
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
    gates: buildCommunitySidebarGateItems({
      gateSummaries: preview.membership_gate_summaries,
      locale,
      eligibility,
      gateMatchMode: preview.gate_match_mode ?? null,
    }),
    gateExpressionLabel: formatGateExpressionLabel(preview.membership_gate_expression, locale),
    showFlatGateOrMarkers: !preview.membership_gate_summaries.some((summary) => summary.gate_type === "age_over_18")
      && isFlatOrGateExpression(preview.membership_gate_expression),
    hasActionTimeCheck: hasActionTimeCheck(preview.membership_gate_summaries),
    requirementsMode: preview.gate_match_mode ?? undefined,
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
