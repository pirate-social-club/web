import type {
  PirateApiCommunity,
  PirateApiCommunityFlairPolicy,
  PirateApiCommunityGateRule,
  PirateApiCommunityProfile,
  PirateApiCommunityReferenceLinkAdmin,
  PirateApiUpdateCommunityFlairPolicyRequest,
  PirateApiUpdateCommunityGateRuleRequest,
  PirateApiUpdateCommunityProfileRequest,
  PirateApiUpdateCommunityRequest,
} from "@/lib/pirate-api";
import type {
  AgeGatePolicy,
  AnonymousIdentityScope,
  CommunityMembershipMode,
  CommunitySettingsFlairPolicy,
  CommunitySettingsGateRule,
  CommunitySettingsReferenceLink,
  CommunitySettingsResourceLink,
  CommunitySettingsRule,
  GateRuleType,
  SupportedChainNamespace,
} from "@/components/compositions/community-settings/community-settings.types";

type CommunitySettingsAboutState = {
  displayName: string;
  description: string;
  membershipMode: CommunityMembershipMode;
  defaultAgeGatePolicy: AgeGatePolicy;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
};

type IdentityProofProvider = "self" | "very" | "passport";

export type CommunitySettingsLoadedState = CommunitySettingsAboutState & {
  flairPolicy: CommunitySettingsFlairPolicy | null;
  gateRules: CommunitySettingsGateRule[];
  referenceLinks: CommunitySettingsReferenceLink[];
  resourceLinks: CommunitySettingsResourceLink[];
  rules: CommunitySettingsRule[];
};

const supportedChainNamespaces = new Set<SupportedChainNamespace>([
  "eip155:1",
  "eip155:137",
]);

const supportedGateTypes = new Set<GateRuleType>([
  "erc721_holding",
  "erc1155_holding",
  "erc20_balance",
  "solana_nft_holding",
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
  "sanctions_clear",
  "wallet_score",
]);

const evmAddressPattern = /^0x[a-fA-F0-9]{40}$/u;
const integerPattern = /^\d+$/u;
const isoCountryCodePattern = /^[A-Z]{2}$/u;
const identityProofProviderMatrix: Partial<Record<GateRuleType, IdentityProofProvider[]>> = {
  unique_human: ["self", "very"],
  age_over_18: ["self"],
  nationality: ["self"],
};

function readGateConfigString(
  gateConfig: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = gateConfig?.[key];
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function readGateConfigStringArray(
  gateConfig: Record<string, unknown> | null | undefined,
  key: string,
): string[] {
  const value = gateConfig?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry.length > 0);
}

function buildIdentityProofRequirements(
  rule: CommunitySettingsGateRule,
): PirateApiUpdateCommunityGateRuleRequest["proof_requirements"] {
  if (Array.isArray(rule.proofRequirements) && rule.proofRequirements.length > 0) {
    return rule.proofRequirements as PirateApiUpdateCommunityGateRuleRequest["proof_requirements"];
  }

  const acceptedProviders = identityProofProviderMatrix[rule.gateType];
  if (!acceptedProviders) {
    return null;
  }

  return [
    {
      proof_type: rule.gateType,
      accepted_providers: acceptedProviders,
    },
  ];
}

function normalizeNationalityGateConfig(
  gateConfig: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const requiredValue = readGateConfigString(gateConfig, "required_value");
  if (requiredValue.length > 0) {
    return {
      required_value: requiredValue,
    };
  }

  const excludedValues = readGateConfigStringArray(gateConfig, "excluded_values");
  if (excludedValues.length > 0) {
    return {
      excluded_values: excludedValues,
    };
  }

  return null;
}

function normalizeMembershipMode(value: PirateApiCommunity["membership_mode"]): CommunityMembershipMode {
  // Request-to-join stays intentionally out of the shared web settings UI for now.
  return value === "open" ? "open" : "gated";
}

function normalizeAgeGatePolicy(value: PirateApiCommunity["default_age_gate_policy"]): AgeGatePolicy {
  return value === "18_plus" ? "18_plus" : "none";
}

function normalizeAnonymousIdentityScope(
  value: PirateApiCommunity["anonymous_identity_scope"],
): AnonymousIdentityScope {
  return value === "thread_stable" ? "thread_stable" : "community_stable";
}

function normalizeGateType(value: string): GateRuleType {
  return supportedGateTypes.has(value as GateRuleType)
    ? value as GateRuleType
    : "unique_human";
}

function normalizeChainNamespace(value: string | null | undefined): SupportedChainNamespace | null {
  return supportedChainNamespaces.has(value as SupportedChainNamespace)
    ? value as SupportedChainNamespace
    : null;
}

function sortByPosition<T extends { position: number }>(values: T[]): T[] {
  return [...values].sort((a, b) => a.position - b.position);
}

export function mapApiGateRuleToSettings(
  rule: PirateApiCommunityGateRule,
  index = 0,
): CommunitySettingsGateRule {
  return {
    gateRuleId: rule.gate_rule_id,
    scope: rule.scope,
    gateFamily: rule.gate_family,
    gateType: normalizeGateType(rule.gate_type),
    status: rule.status,
    position: index,
    chainNamespace: normalizeChainNamespace(rule.chain_namespace),
    proofRequirements: rule.proof_requirements ?? null,
    gateConfig: rule.gate_config ?? null,
  };
}

export function mapApiFlairPolicyToSettings(
  policy: PirateApiCommunityFlairPolicy | null | undefined,
): CommunitySettingsFlairPolicy | null {
  if (!policy) {
    return null;
  }

  return {
    flairEnabled: policy.flair_enabled,
    definitions: sortByPosition(
      policy.definitions.map((definition) => ({
        flairId: definition.flair_id,
        label: definition.label,
        colorToken: definition.color_token ?? null,
        position: definition.position,
        status: definition.status,
      })),
    ),
  };
}

export function mapApiCommunityProfileToSettings(profile: PirateApiCommunityProfile): Pick<
  CommunitySettingsLoadedState,
  "resourceLinks" | "rules"
> {
  return {
    rules: sortByPosition(
      profile.rules.map((rule) => ({
        ruleId: rule.rule_id,
        title: rule.title,
        body: rule.body,
        position: rule.position,
        status: rule.status,
      })),
    ),
    resourceLinks: sortByPosition(
      profile.resource_links.map((link) => ({
        resourceLinkId: link.resource_link_id,
        label: link.label,
        url: link.url,
        resourceKind: link.resource_kind,
        position: link.position,
        status: link.status,
      })),
    ),
  };
}

export function mapApiReferenceLinkToSettings(
  link: PirateApiCommunityReferenceLinkAdmin,
): CommunitySettingsReferenceLink {
  return {
    communityReferenceLinkId: link.community_reference_link_id,
    platform: link.platform,
    url: link.url,
    externalId: link.external_id ?? null,
    label: link.label ?? null,
    linkStatus: link.link_status,
    verified: link.verification_state === "verified",
    verifiedAt: link.verified_at ?? null,
    metadata: {
      displayName: link.metadata.display_name ?? null,
      imageUrl: link.metadata.image_url ?? null,
    },
    position: link.position,
  };
}

export function mapApiCommunityToSettings(
  community: PirateApiCommunity,
): CommunitySettingsAboutState {
  return {
    displayName: community.display_name,
    description: community.description ?? "",
    membershipMode: normalizeMembershipMode(community.membership_mode),
    defaultAgeGatePolicy: normalizeAgeGatePolicy(community.default_age_gate_policy),
    allowAnonymousIdentity: community.allow_anonymous_identity ?? false,
    anonymousIdentityScope: normalizeAnonymousIdentityScope(community.anonymous_identity_scope),
  };
}

export function buildCommunitySettingsState(input: {
  community: PirateApiCommunity;
  flairPolicy: PirateApiCommunityFlairPolicy | null;
  gateRules: PirateApiCommunityGateRule[];
  profile: PirateApiCommunityProfile;
  referenceLinks: PirateApiCommunityReferenceLinkAdmin[];
}): CommunitySettingsLoadedState {
  const about = mapApiCommunityToSettings(input.community);
  const profile = mapApiCommunityProfileToSettings(input.profile);

  return {
    ...about,
    ...profile,
    flairPolicy: mapApiFlairPolicyToSettings(input.flairPolicy),
    gateRules: input.gateRules.map((rule, index) => mapApiGateRuleToSettings(rule, index)),
    referenceLinks: sortByPosition(input.referenceLinks.map(mapApiReferenceLinkToSettings)),
  };
}

export function mapSettingsRuleToGateRuleRequest(
  rule: CommunitySettingsGateRule,
): PirateApiUpdateCommunityGateRuleRequest {
  return {
    gate_rule_id: rule.gateRuleId,
    scope: rule.scope,
    gate_family: rule.gateFamily,
    gate_type: rule.gateType,
    proof_requirements:
      rule.gateFamily === "identity_proof"
        ? buildIdentityProofRequirements(rule)
        : (rule.proofRequirements as PirateApiUpdateCommunityGateRuleRequest["proof_requirements"]) ?? null,
    chain_namespace: rule.chainNamespace ?? null,
    gate_config:
      rule.gateType === "nationality"
        ? normalizeNationalityGateConfig(rule.gateConfig)
        : rule.gateConfig ?? null,
    status: rule.status,
  };
}

export function mapSettingsToCommunityPatch(input: {
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  defaultAgeGatePolicy: AgeGatePolicy;
  description: string;
  membershipMode: CommunityMembershipMode;
}): PirateApiUpdateCommunityRequest {
  return {
    description: input.description.trim(),
    membership_mode: input.membershipMode,
    allow_anonymous_identity: input.allowAnonymousIdentity,
    anonymous_identity_scope: input.allowAnonymousIdentity
      ? input.anonymousIdentityScope
      : null,
    default_age_gate_policy: input.defaultAgeGatePolicy,
  };
}

export function mapSettingsToProfilePatch(input: {
  resourceLinks: CommunitySettingsResourceLink[];
  rules: CommunitySettingsRule[];
}): PirateApiUpdateCommunityProfileRequest {
  return {
    rules: sortByPosition(input.rules).map((rule) => ({
      rule_id: rule.ruleId,
      title: rule.title.trim(),
      body: rule.body.trim(),
      position: rule.position,
      status: rule.status,
    })),
    resource_links: sortByPosition(input.resourceLinks).map((link) => ({
      resource_link_id: link.resourceLinkId,
      label: link.label.trim(),
      url: link.url.trim(),
      resource_kind: link.resourceKind,
      position: link.position,
      status: link.status,
    })),
  };
}

export function mapSettingsToFlairPatch(
  policy: CommunitySettingsFlairPolicy | null,
): PirateApiUpdateCommunityFlairPolicyRequest {
  const normalized = policy ?? {
    flairEnabled: false,
    definitions: [],
  };

  return {
    flair_enabled: normalized.flairEnabled,
    // The current web settings UI intentionally narrows flair policy editing.
    require_flair_on_top_level_posts: false,
    definitions: sortByPosition(normalized.definitions).map((definition) => ({
      flair_id: definition.flairId,
      label: definition.label.trim(),
      description: null,
      color_token: definition.colorToken ?? null,
      position: definition.position,
      allowed_post_types: null,
      status: definition.status,
    })),
  };
}

export function validateCommunitySettingsGateRule(rule: CommunitySettingsGateRule): string[] {
  if (rule.status !== "active") {
    return [];
  }

  if (rule.gateFamily === "identity_proof" && rule.gateType === "nationality") {
    const errors: string[] = [];
    const requiredValue = readGateConfigString(rule.gateConfig, "required_value");
    const excludedValues = readGateConfigStringArray(rule.gateConfig, "excluded_values");

    if (requiredValue.length === 0 && excludedValues.length === 0) {
      errors.push("Enter a country code.");
      return errors;
    }

    if (requiredValue.length > 0 && !isoCountryCodePattern.test(requiredValue)) {
      errors.push("Country code must be a 2-letter ISO code.");
    }

    if (excludedValues.some((value) => !isoCountryCodePattern.test(value))) {
      errors.push("Country codes must be 2-letter ISO codes.");
    }

    return errors;
  }

  if (rule.gateFamily !== "token_holding") {
    return [];
  }

  const errors: string[] = [];
  if (!rule.chainNamespace) {
    errors.push("Select a chain.");
  }

  const contractAddress = typeof rule.gateConfig?.contract_address === "string"
    ? rule.gateConfig.contract_address.trim()
    : "";
  if (!evmAddressPattern.test(contractAddress)) {
    errors.push("Enter a valid contract address.");
  }

  if (rule.gateType === "erc1155_holding") {
    const tokenId = typeof rule.gateConfig?.token_id === "string"
      ? rule.gateConfig.token_id.trim()
      : typeof rule.gateConfig?.token_id === "number"
        ? String(rule.gateConfig.token_id)
        : "";
    if (!integerPattern.test(tokenId)) {
      errors.push("Token ID must be a non-negative integer.");
    }

    const minBalance = typeof rule.gateConfig?.min_balance === "string"
      ? rule.gateConfig.min_balance.trim()
      : typeof rule.gateConfig?.min_balance === "number"
        ? String(rule.gateConfig.min_balance)
        : "";
    if (!integerPattern.test(minBalance) || BigInt(minBalance || "0") < 1n) {
      errors.push("Min balance must be at least 1.");
    }
  }

  return errors;
}

export function validateCommunitySettingsGateRules(
  rules: CommunitySettingsGateRule[],
): Record<string, string[]> {
  const next: Record<string, string[]> = {};

  for (const rule of rules) {
    const errors = validateCommunitySettingsGateRule(rule);
    if (errors.length > 0) {
      next[rule.gateRuleId] = errors;
    }
  }

  return next;
}

export function hasCommunitySettingsGateRuleErrors(
  errors: Record<string, string[]>,
): boolean {
  return Object.keys(errors).length > 0;
}

export function buildCommunityGateRuleSaveRequests(input: {
  initialRules: CommunitySettingsGateRule[];
  currentRules: CommunitySettingsGateRule[];
}): PirateApiUpdateCommunityGateRuleRequest[] {
  const initialById = new Map(
    input.initialRules.map((rule) => [rule.gateRuleId, mapSettingsRuleToGateRuleRequest(rule)]),
  );
  const currentById = new Map(
    input.currentRules.map((rule) => [rule.gateRuleId, mapSettingsRuleToGateRuleRequest(rule)]),
  );
  const next: PirateApiUpdateCommunityGateRuleRequest[] = [];

  for (const rule of input.currentRules) {
    const current = currentById.get(rule.gateRuleId);
    const initial = initialById.get(rule.gateRuleId);
    if (!current) {
      continue;
    }
    if (!initial || JSON.stringify(initial) !== JSON.stringify(current)) {
      next.push(current);
    }
  }

  for (const rule of input.initialRules) {
    if (currentById.has(rule.gateRuleId)) {
      continue;
    }
    next.push({
      ...mapSettingsRuleToGateRuleRequest(rule),
      status: "disabled",
    });
  }

  return next;
}

export function isTabDirty(current: unknown, initial: unknown): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}
