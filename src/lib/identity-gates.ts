import type {
  GateFailureDetails,
  JoinEligibility,
  MembershipGateSummary,
  RequestedVerificationCapability,
  VerificationCapabilities,
  VerificationRequirement,
} from "@pirate/api-contracts";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countries";
import { formatAssetAmount } from "@/lib/asset-amount";
import { isUiLocaleCode, type UiLocaleCode } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";

type IdentityGateAudience = "public" | "admin";
type VerificationProvider = "self" | "very" | "passport" | "zkpassport";
export type HumanVerificationProvider = "self" | "very" | "zkpassport";
type RequirementProviderContext = VerificationProvider | null;
type MissingCapability = "unique_human" | "age_over_18" | "minimum_age" | "nationality" | "gender" | "wallet_score" | "altcha_pow";
type RequiredActionNode = Omit<NonNullable<NonNullable<JoinEligibility["gate_evaluation"]>["required_action_set"]>["items"][number], "items"> & {
  items?: RequiredActionNode[];
};
export type RequiredActionCapability = MissingCapability | "erc721_holding" | "erc721_inventory_match" | "asset_balance";

const SELF_CAPABILITY_ORDER: RequestedVerificationCapability[] = [
  "unique_human",
  "age_over_18",
  "minimum_age",
  "nationality",
  "gender",
];
const REQUESTED_CAPABILITY_ORDER_BY_PROVIDER: Record<
  HumanVerificationProvider,
  readonly RequestedVerificationCapability[]
> = {
  self: ["unique_human", "age_over_18", "nationality", "gender"],
  very: ["unique_human"],
  zkpassport: ["unique_human", "minimum_age", "nationality", "gender"],
};

function resolveGateLocale(locale: string | null | undefined): UiLocaleCode {
  const normalized = String(locale ?? "").toLowerCase();
  if (normalized === "ar" || normalized.startsWith("ar-")) return "ar";
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (isUiLocaleCode(normalized)) return normalized;
  return "en";
}

function joinWithAnd(values: string[], locale: UiLocaleCode): string {
  if (values.length <= 1) return values[0] ?? "";
  if (locale === "ar") {
    if (values.length === 2) return `${values[0]} و${values[1]}`;
    return `${values.slice(0, -1).join("، ")}، و${values[values.length - 1]}`;
  }
  if (locale === "zh") {
    if (values.length === 2) return `${values[0]}和${values[1]}`;
    return `${values.slice(0, -1).join("、")}和${values[values.length - 1]}`;
  }
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatCountryName(code: string, locale: UiLocaleCode): string {
  return getCountryDisplayName(code, locale) ?? code;
}

function shortenAddress(address: string): string {
  return formatCompactAddress(address);
}

function formatInventoryAssetLabel(gate: MembershipGateSummary, pluralize = false): string {
  if (gate.asset_filter_label?.trim()) {
    return gate.asset_filter_label.trim();
  }
  if (gate.asset_category === "watch") {
    return pluralize && (gate.min_quantity ?? 1) !== 1 ? "watches" : "watch";
  }
  return pluralize && (gate.min_quantity ?? 1) !== 1 ? "cards" : "card";
}

function getVisibleSelfCapabilities(capabilities: MissingCapability[]): MissingCapability[] {
  const ordered = SELF_CAPABILITY_ORDER.filter((capability) => capabilities.includes(capability));
  if (ordered.some((capability) => capability !== "unique_human")) {
    return ordered.filter((capability) => capability !== "unique_human");
  }
  return ordered;
}

function getSelfMinimumAgeRequirement(gates: MembershipGateSummary[] | null | undefined): string | null {
  const ages = (gates ?? [])
    .filter((gate) => gate.gate_type === "minimum_age")
    .map((gate) => gate.required_minimum_age)
    .filter((age): age is number => Number.isInteger(age));
  if (ages.length === 0) return null;
  return `you are ${Math.max(...ages)} or older`;
}

function formatSelfNationalityRequirement(gates: MembershipGateSummary[] | null | undefined, locale: UiLocaleCode): string | null {
  const countryNames = (gates ?? [])
    .filter((gate) => gate.gate_type === "nationality")
    .flatMap((gate) => gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [])
    .map((value) => formatCountryName(value, locale))
    .filter((value, index, all) => value.trim() && all.indexOf(value) === index);
  if (countryNames.length === 0) return null;
  return `${joinWithAnd(countryNames, locale)} nationality`;
}

function formatSelfVerificationRequirement(
  capabilities: MissingCapability[],
  gates: MembershipGateSummary[] | null | undefined,
  locale: UiLocaleCode,
): string {
  const visibleCapabilities = getVisibleSelfCapabilities(capabilities);
  const labels = visibleCapabilities.map((capability) => {
    switch (capability) {
      case "nationality":
        return formatSelfNationalityRequirement(gates, locale) ?? "your nationality";
      case "age_over_18":
        return "you are over 18";
      case "minimum_age":
        return getSelfMinimumAgeRequirement(gates) ?? "you meet the minimum age";
      case "gender":
        return "your gender eligibility";
      case "unique_human":
        return "you are a real person";
      case "wallet_score":
        return "your Passport wallet score";
      case "altcha_pow":
        return "proof-of-work";
    }
  }).filter((label, index, all) => all.indexOf(label) === index);

  if (labels.length === 0) return "your eligibility";
  return joinWithAnd(labels, locale);
}

function hasSelfDocumentCapability(capabilities: MissingCapability[]): boolean {
  return capabilities.some((capability) =>
    capability === "nationality"
    || capability === "age_over_18"
    || capability === "minimum_age"
    || capability === "gender"
  );
}

/**
 * Canonical requested-capability vocabulary for interactive human providers.
 * Gate planners use it to build requests; launch hooks use it defensively at
 * their API boundary. Provider-specific verification requirements remain
 * separate because minimum-age thresholds and nationality predicates carry
 * values rather than just capability names.
 */
export function normalizeRequestedVerificationCapabilities(
  provider: HumanVerificationProvider,
  capabilities: readonly unknown[],
): RequestedVerificationCapability[] {
  const requested = new Set(capabilities.filter((capability): capability is string => typeof capability === "string"));
  return REQUESTED_CAPABILITY_ORDER_BY_PROVIDER[provider]
    .filter((capability) => requested.has(capability));
}

function resolveUniqueHumanRequirementProvider(
  gate: MembershipGateSummary,
  provider: RequirementProviderContext,
): "self" | "zkpassport" | "very" | null {
  if (provider === "self" || provider === "zkpassport" || provider === "very") {
    return provider;
  }
  const acceptedProviders = gate.accepted_providers ?? [];
  if (acceptedProviders.length === 1) {
    const [acceptedProvider] = acceptedProviders;
    if (acceptedProvider === "self" || acceptedProvider === "zkpassport" || acceptedProvider === "very") {
      return acceptedProvider;
    }
  }
  return null;
}

export function isJoinSurfaceGate(_gate: Pick<MembershipGateSummary, "gate_type">): boolean {
  return true;
}

export function hasActionTimeCheck(gates: Array<Pick<MembershipGateSummary, "gate_type">> | null | undefined): boolean {
  return (gates ?? []).some((gate) => gate.gate_type === "altcha_pow");
}

/**
 * A community whose entire membership gate is proof-of-work admits non-member
 * votes, comments and posts: each write carries its own action-scoped proof,
 * so joining first proves nothing more (the API mirrors this predicate in
 * open-participation.ts and auto-follows the actor instead). This also applies
 * to mixed OR-trees when the PoW branch alone can satisfy the gate.
 */
export function isPowSatisfiableGate(
  gates: Array<Pick<MembershipGateSummary, "gate_type">> | null | undefined,
  matchMode?: "all" | "any" | null,
): boolean {
  const summaries = gates ?? [];
  if (summaries.length === 0) {
    return false;
  }
  // Summaries are the flattened atoms; match mode says how they combine. Any
  // branch clears an "any" gate, so one altcha_pow makes it PoW-satisfiable;
  // an "all" gate needs every atom to be PoW.
  return matchMode === "any"
    ? summaries.some((gate) => gate.gate_type === "altcha_pow")
    : summaries.every((gate) => gate.gate_type === "altcha_pow");
}

export function formatGateRequirement(
  gate: MembershipGateSummary,
  options?: {
    audience?: IdentityGateAudience;
    locale?: string | null;
    presentation?: "requirement" | "compact";
    provider?: RequirementProviderContext;
  },
): string {
  const audience = options?.audience ?? "public";
  const locale = resolveGateLocale(options?.locale);
  const provider = options?.provider ?? null;
  const copy = getLocaleMessages(locale, "gates").requirements;
  const compact = options?.presentation === "compact" ? copy.compact : null;

  switch (gate.gate_type) {
    case "nationality": {
      const requiredValues = gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [];
      if (requiredValues.length > 0) {
        const countries = requiredValues.map((value) => {
          const country = formatCountryName(value, locale);
          return audience === "admin" ? `${country} (${value})` : country;
        });
        const countryLabel = joinWithAnd(countries, locale);
        return (compact?.nationality.withValues ?? copy.nationality.withValues).replace("{countryLabel}", countryLabel);
      }
      return compact?.nationality.withoutValues ?? copy.nationality.withoutValues;
    }
    case "gender": {
      if (compact) {
        return gate.required_value
          ? compact.gender.withValue.replace("{requiredValue}", gate.required_value)
          : compact.gender.withoutValue;
      }
      if (audience === "admin" && gate.required_value) {
        return copy.gender.adminWithValue.replace("{requiredValue}", gate.required_value);
      }
      return copy.gender.public;
    }
    case "unique_human": {
      const uniqueHumanProvider = resolveUniqueHumanRequirementProvider(gate, provider);
      if (uniqueHumanProvider === "very") return copy.uniqueHuman.very;
      if (uniqueHumanProvider === "self") return copy.uniqueHuman.self;
      if (uniqueHumanProvider === "zkpassport") return copy.uniqueHuman.zkpassport;
      return copy.uniqueHuman.any;
    }
    case "age_over_18":
      return compact?.ageOver18 ?? copy.ageOver18;
    case "minimum_age": {
      const age = String(gate.required_minimum_age ?? 18);
      return (compact?.minimumAge ?? copy.minimumAge).replace("{age}", age);
    }
    case "wallet_score": {
      if (typeof gate.minimum_score === "number") {
        return (compact?.walletScore.withScore ?? copy.walletScore.withScore)
          .replace("{minimumScore}", String(gate.minimum_score));
      }
      return compact?.walletScore.withoutScore ?? copy.walletScore.withoutScore;
    }
    case "altcha_pow":
      return compact?.altchaPow ?? copy.altchaPow;
    case "erc721_holding": {
      const label = gate.contract_address ? shortenAddress(gate.contract_address) : null;
      if (compact) {
        const quantity = String(gate.min_quantity ?? 1);
        const nftLabel = (gate.min_quantity ?? 1) === 1 ? "NFT" : "NFTs";
        const template = label ? compact.erc721Holding.withLabel : compact.erc721Holding.withoutLabel;
        return template
          .replace("{quantity}", quantity)
          .replace("{nftLabel}", nftLabel)
          .replace("{label}", label ?? "");
      }
      if (label) {
        return copy.erc721Holding.withLabel.replace("{label}", label);
      }
      return copy.erc721Holding.withoutLabel;
    }
    case "erc721_inventory_match": {
      const quantity = String(gate.min_quantity ?? 1);
      const assetLabel = formatInventoryAssetLabel(gate, Boolean(compact));
      return (compact?.erc721InventoryMatch ?? copy.erc721InventoryMatch)
        .replace("{quantity}", quantity)
        .replace("{assetLabel}", assetLabel);
    }
    case "asset_balance": {
      if (gate.min_amount_atomic && typeof gate.asset_decimals === "number" && gate.asset_symbol) {
        const amount = formatAssetAmount(gate.min_amount_atomic, gate.asset_decimals);
        if (amount) {
          return (compact?.assetBalance.withAmount ?? copy.assetBalance.withAmount)
            .replace("{amount}", amount)
            .replace("{symbol}", gate.asset_symbol);
        }
      }
      return compact?.assetBalance.withoutAmount ?? copy.assetBalance.withoutAmount;
    }
    default:
      return (compact?.fallback ?? copy.fallback).replace("{gateType}", gate.gate_type);
  }
}

export function getJoinCtaLabel(
  eligibility: JoinEligibility,
  options?: { locale?: string | null },
): string {
  const locale = resolveGateLocale(options?.locale);
  const copy = getLocaleMessages(locale, "gates").joinCta;
  if (eligibility.status === "verification_required" && hasOnlyWalletGateRequirements(eligibility)) {
    return copy.walletRequired;
  }
  switch (eligibility.status) {
    case "joinable":
      return copy.joinable;
    case "requestable":
      return copy.requestable;
    case "pending_request":
      return copy.pendingRequest;
    case "verification_required":
      return copy.verificationRequired;
    case "already_joined":
      return copy.alreadyJoined;
    case "banned":
      return copy.banned;
    case "gate_failed":
      return copy.gateFailed;
  }
}

export function isJoinCtaActionable(eligibility: JoinEligibility): boolean {
  return eligibility.status === "joinable"
    || eligibility.status === "requestable"
    || eligibility.status === "verification_required";
}

export function hasOnlyWalletGateRequirements(
  input: { gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null },
): boolean {
  const capabilities = getRequiredActionCapabilities(input);
  return capabilities.length > 0 && capabilities.every((capability) =>
    capability === "erc721_holding"
    || capability === "erc721_inventory_match"
    || capability === "asset_balance"
  );
}

export function getVerificationCapabilitiesForProvider(
  eligibility: Pick<JoinEligibility, "gate_evaluation">,
  provider: VerificationProvider,
): RequestedVerificationCapability[] {
  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(eligibility);
  if (provider === "passport") {
    return [];
  }
  return normalizeRequestedVerificationCapabilities(provider, missingCapabilities);
}

export function getPassportPromptCapabilities(
  input: { gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null },
): MissingCapability[] {
  return getMissingCapabilitiesFromGateEvaluation(input)
    .filter((capability): capability is MissingCapability => capability === "wallet_score");
}

export function getMissingCapabilitiesFromGateEvaluation(
  input: { gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null },
): MissingCapability[] {
  const actions = (input.gate_evaluation?.required_action_set?.items ?? []) as RequiredActionNode[];
  if (actions.length === 0 && Array.isArray((input as { missing_capabilities?: unknown }).missing_capabilities)) {
    return ((input as { missing_capabilities?: unknown[] }).missing_capabilities ?? [])
      .filter((capability): capability is MissingCapability =>
        capability === "unique_human"
        || capability === "age_over_18"
        || capability === "minimum_age"
        || capability === "nationality"
        || capability === "gender"
        || capability === "wallet_score"
        || capability === "altcha_pow"
      );
  }
  const capabilities = new Set<MissingCapability>();
  const visit = (action: RequiredActionNode): void => {
    if (action.kind === "set") {
      action.items?.forEach(visit);
      return;
    }
    if (
      !action.capability
      || action.capability === "asset_balance"
      || action.capability === "erc721_holding"
      || action.capability === "erc721_inventory_match"
    ) {
      return;
    }
    capabilities.add(action.capability);
  };
  actions.forEach(visit);
  return Array.from(capabilities);
}

export function getRequiredActionCapabilities(
  input: { gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null },
): RequiredActionCapability[] {
  const actions = (input.gate_evaluation?.required_action_set?.items ?? []) as RequiredActionNode[];
  const capabilities = new Set<RequiredActionCapability>();
  const visit = (action: RequiredActionNode): void => {
    if (action.kind === "set") {
      action.items?.forEach(visit);
      return;
    }
    const capability = (action as { capability?: string }).capability;
    if (
      capability === "unique_human"
      || capability === "age_over_18"
      || capability === "minimum_age"
      || capability === "nationality"
      || capability === "gender"
      || capability === "wallet_score"
      || capability === "altcha_pow"
      || capability === "erc721_holding"
      || capability === "erc721_inventory_match"
      || capability === "asset_balance"
    ) {
      capabilities.add(capability);
    }
  };
  actions.forEach(visit);
  return Array.from(capabilities);
}

export function hasAltchaProofAction(
  input: { gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null },
): boolean {
  return getRequiredActionCapabilities(input).includes("altcha_pow");
}

export function getVerificationRequirementsForGates(
  gates: MembershipGateSummary[] | null | undefined,
): VerificationRequirement[] {
  const requirements: VerificationRequirement[] = [];
  const nationalityValues = new Set<string>();
  const minimumAges = (gates ?? []).reduce<number[]>((result, gate) => {
    if (gate.gate_type === "minimum_age" && Number.isInteger(gate.required_minimum_age)) {
      result.push(gate.required_minimum_age as number);
    }
    return result;
  }, []);
  if (minimumAges.length > 0) {
    requirements.push({ proof_type: "minimum_age", minimum_age: Math.max(...minimumAges) });
  }
  for (const gate of gates ?? []) {
    if (gate.gate_type !== "nationality") {
      continue;
    }
    const requiredValues = gate.required_values?.length
      ? gate.required_values
      : gate.required_value
        ? [gate.required_value]
        : [];
    for (const value of requiredValues) {
      const normalized = normalizeCountryCode(value);
      if (normalized) {
        nationalityValues.add(normalized.alpha3);
      }
    }
  }
  if (nationalityValues.size > 0) {
    requirements.push({
      proof_type: "nationality",
      required_values: Array.from(nationalityValues),
    });
  }
  return requirements;
}

function getRequiredNationalityValues(gate: MembershipGateSummary): string[] {
  return (gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [])
    .flatMap((value) => {
      const requiredValue = value.trim().toUpperCase();
      return requiredValue ? [requiredValue] : [];
    });
}

function getCountryCodeAliases(value: string | null | undefined): Set<string> {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return new Set();
  }

  const country = normalizeCountryCode(normalized);
  if (!country) {
    return new Set([normalized]);
  }

  return new Set([country.alpha2, country.alpha3]);
}

function countryCodeMatchesAny(value: string, candidates: string[]): boolean {
  const valueAliases = getCountryCodeAliases(value);
  if (valueAliases.size === 0) {
    return false;
  }

  return candidates.some((candidate) => {
    const candidateAliases = getCountryCodeAliases(candidate);
    for (const alias of candidateAliases) {
      if (valueAliases.has(alias)) {
        return true;
      }
    }
    return false;
  });
}

function nationalityCapabilitySatisfiesGate(
  capability: VerificationCapabilities["nationality"] | null | undefined,
  gate: MembershipGateSummary,
): boolean {
  if (capability?.state !== "verified" || capability.provider !== "self") {
    return false;
  }
  const value = capability.value?.trim().toUpperCase();
  if (!value) {
    return false;
  }
  const requiredValues = getRequiredNationalityValues(gate);
  if (requiredValues.length > 0 && !countryCodeMatchesAny(value, requiredValues)) {
    return false;
  }
  const excludedValues = (gate.excluded_values ?? []).flatMap((item) => {
    const excludedValue = item.trim().toUpperCase();
    return excludedValue ? [excludedValue] : [];
  });
  return !countryCodeMatchesAny(value, excludedValues);
}

function genderCapabilitySatisfiesGate(
  capability: VerificationCapabilities["gender"] | null | undefined,
  gate: MembershipGateSummary,
): boolean {
  if (capability?.state !== "verified" || capability.provider !== "self") {
    return false;
  }
  const requiredValue = gate.required_value?.trim().toUpperCase();
  return !requiredValue || capability.value === requiredValue;
}

export function getSelfVerificationRequestForGates(input: {
  gates: MembershipGateSummary[] | null | undefined;
  includeUniqueHuman?: boolean;
  verificationCapabilities: VerificationCapabilities | null | undefined;
}): {
  requestedCapabilities: RequestedVerificationCapability[];
  verificationRequirements: VerificationRequirement[];
} {
  const capabilities = input.verificationCapabilities;
  const requestedCapabilities = new Set<RequestedVerificationCapability>();
  const minimumAges: number[] = [];
  const nationalityValues = new Set<string>();

  if (input.includeUniqueHuman && capabilities?.unique_human?.state !== "verified") {
    requestedCapabilities.add("unique_human");
  }

  for (const gate of input.gates ?? []) {
    switch (gate.gate_type) {
      case "unique_human":
        if (capabilities?.unique_human?.state !== "verified") {
          requestedCapabilities.add("unique_human");
        }
        break;
      case "age_over_18":
        if (capabilities?.age_over_18?.state !== "verified") {
          requestedCapabilities.add("age_over_18");
        }
        break;
      case "minimum_age": {
        const requiredAge = gate.required_minimum_age;
        const verifiedAge = capabilities?.minimum_age?.state === "verified" ? capabilities.minimum_age.value : null;
        if (typeof requiredAge === "number" && Number.isInteger(requiredAge) && (typeof verifiedAge !== "number" || verifiedAge < requiredAge)) {
          minimumAges.push(requiredAge);
        }
        break;
      }
      case "nationality":
        if (!nationalityCapabilitySatisfiesGate(capabilities?.nationality, gate)) {
          requestedCapabilities.add("nationality");
          const requiredValues = getRequiredNationalityValues(gate);
          for (const value of requiredValues) {
            const normalized = normalizeCountryCode(value);
            if (normalized) {
              nationalityValues.add(normalized.alpha3);
            }
          }
        }
        break;
      case "gender":
        if (!genderCapabilitySatisfiesGate(capabilities?.gender, gate)) {
          requestedCapabilities.add("gender");
        }
        break;
      default:
        break;
    }
  }

  const verificationRequirements: VerificationRequirement[] = [];
  if (minimumAges.length > 0) {
    verificationRequirements.push({ proof_type: "minimum_age", minimum_age: Math.max(...minimumAges) });
  }
  if (nationalityValues.size > 0) {
    verificationRequirements.push({
      proof_type: "nationality",
      required_values: Array.from(nationalityValues),
    });
  }

  return {
    requestedCapabilities: normalizeRequestedVerificationCapabilities("self", Array.from(requestedCapabilities)),
    verificationRequirements,
  };
}

export function hasSelfDocumentFactVerificationRequest(input: {
  requestedCapabilities: RequestedVerificationCapability[];
  verificationRequirements: VerificationRequirement[];
}): boolean {
  return input.verificationRequirements.length > 0
    || input.requestedCapabilities.some((capability) => capability !== "unique_human");
}

export function resolveSuggestedVerificationProvider(
  eligibility: {
    membership_gate_summaries?: MembershipGateSummary[] | null;
    gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null;
    missing_capabilities?: readonly string[] | null;
  },
): VerificationProvider | null {
  const availableHumanProviders = resolveAvailableHumanVerificationProviders(eligibility);
  const preferredProvider = (eligibility as {
    preferred_verification_provider?: HumanVerificationProvider | null;
  }).preferred_verification_provider;
  if (preferredProvider && availableHumanProviders.includes(preferredProvider)) {
    return preferredProvider;
  }
  if (availableHumanProviders.length === 1) {
    return availableHumanProviders[0] ?? null;
  }
  if (availableHumanProviders.length > 1) {
    return null;
  }

  const legacyProvider = (eligibility as { suggested_verification_provider?: VerificationProvider | null }).suggested_verification_provider;
  if (legacyProvider) {
    return legacyProvider;
  }
  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(eligibility);
  const gateSummaries = eligibility.membership_gate_summaries ?? [];

  if (missingCapabilities.some((capability) => capability === "wallet_score")) {
    return "passport";
  }

  if (missingCapabilities.some((capability) =>
    capability === "age_over_18"
    || capability === "minimum_age"
    || capability === "nationality"
    || capability === "gender"
  )) {
    return "self";
  }

  if (missingCapabilities.includes("unique_human")) {
    const requiredActionProviders = new Set<VerificationProvider>();
    const visit = (action: RequiredActionNode): void => {
      if (action.kind === "set") {
        action.items?.forEach(visit);
        return;
      }
      if (action.capability !== "unique_human") return;
      const provider = (action as { provider?: unknown }).provider;
      if (provider === "self" || provider === "very" || provider === "zkpassport") {
        requiredActionProviders.add(provider);
      }
    };
    ((eligibility.gate_evaluation?.required_action_set?.items ?? []) as RequiredActionNode[]).forEach(visit);
    if (requiredActionProviders.size === 1) {
      return Array.from(requiredActionProviders)[0] ?? null;
    }

    const uniqueHumanGates = gateSummaries.filter((gate) => gate.gate_type === "unique_human");
    if (uniqueHumanGates.some((gate) => gate.accepted_providers?.includes("very") ?? false)) {
      return "very";
    }
    if (uniqueHumanGates.some((gate) => gate.accepted_providers?.includes("self") ?? false)) {
      return "self";
    }
    if (uniqueHumanGates.some((gate) => gate.accepted_providers?.includes("zkpassport") ?? false)) {
      return "zkpassport";
    }
    return null;
  }

  return null;
}

const HUMAN_VERIFICATION_PROVIDER_ORDER: HumanVerificationProvider[] = [
  "self",
  "zkpassport",
  "very",
];

function defaultHumanProvidersForCapability(
  capability: MissingCapability,
): HumanVerificationProvider[] {
  switch (capability) {
    case "unique_human":
      return [...HUMAN_VERIFICATION_PROVIDER_ORDER];
    case "minimum_age":
    case "nationality":
    case "gender":
      return ["self", "zkpassport"];
    case "age_over_18":
      return ["self"];
    default:
      return [];
  }
}

function isHumanVerificationProvider(value: string): value is HumanVerificationProvider {
  return value === "self" || value === "zkpassport" || value === "very";
}

function humanProvidersForCapability(input: {
  capability: MissingCapability;
  gateSummaries: MembershipGateSummary[];
  requiredActionItems?: RequiredActionNode[];
}): HumanVerificationProvider[] {
  const defaults = defaultHumanProvidersForCapability(input.capability);
  if (defaults.length === 0) return [];
  const matchingGates = input.gateSummaries.filter((gate) => gate.gate_type === input.capability);
  if (matchingGates.length === 0) {
    const requiredActionProviders = new Set<HumanVerificationProvider>();
    const visit = (action: RequiredActionNode): void => {
      if (action.kind === "set") {
        action.items?.forEach(visit);
        return;
      }
      if (action.capability !== input.capability) return;
      const provider = (action as { provider?: string }).provider;
      if (provider && isHumanVerificationProvider(provider) && defaults.includes(provider)) {
        requiredActionProviders.add(provider);
      }
    };
    input.requiredActionItems?.forEach(visit);
    if (requiredActionProviders.size > 0) {
      return HUMAN_VERIFICATION_PROVIDER_ORDER.filter((provider) =>
        requiredActionProviders.has(provider)
      );
    }
    return defaults;
  }

  const accepted = new Set<HumanVerificationProvider>();
  for (const gate of matchingGates) {
    const gateProviders = gate.accepted_providers?.filter(isHumanVerificationProvider) ?? [];
    for (const provider of gateProviders.length > 0 ? gateProviders : defaults) {
      if (defaults.includes(provider)) accepted.add(provider);
    }
  }
  return HUMAN_VERIFICATION_PROVIDER_ORDER.filter((provider) => accepted.has(provider));
}

export function resolveAvailableHumanVerificationProviders(
  eligibility: {
    membership_gate_summaries?: MembershipGateSummary[] | null;
    gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null;
    missing_capabilities?: readonly string[] | null;
    preferred_verification_provider?: HumanVerificationProvider | null;
  },
): HumanVerificationProvider[] {
  const gateSummaries = eligibility.membership_gate_summaries ?? [];
  const requiredActionItems = (eligibility.gate_evaluation?.required_action_set?.items ?? []) as RequiredActionNode[];
  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(eligibility)
    .filter((capability) => defaultHumanProvidersForCapability(capability).length > 0);
  const capabilities = missingCapabilities.length > 0
    ? missingCapabilities
    : gateSummaries.map((gate) => gate.gate_type).filter((gateType): gateType is MissingCapability =>
      defaultHumanProvidersForCapability(gateType as MissingCapability).length > 0
    );
  if (capabilities.length === 0) return [];

  let available = new Set(humanProvidersForCapability({
    capability: capabilities[0],
    gateSummaries,
    requiredActionItems,
  }));
  for (const capability of capabilities.slice(1)) {
    const providers = new Set(humanProvidersForCapability({
      capability,
      gateSummaries,
      requiredActionItems,
    }));
    available = new Set([...available].filter((provider) => providers.has(provider)));
  }

  const ordered = HUMAN_VERIFICATION_PROVIDER_ORDER.filter((provider) => available.has(provider));
  const preferred = eligibility.preferred_verification_provider;
  if (!preferred || !ordered.includes(preferred)) return ordered;
  return [preferred, ...ordered.filter((provider) => provider !== preferred)];
}

export function hasZkPassportDocumentProviderOption(
  eligibility: {
    membership_gate_summaries?: MembershipGateSummary[] | null;
    gate_evaluation?: JoinEligibility["gate_evaluation"] | GateFailureDetails["gate_evaluation"] | null;
  },
): boolean {
  const missingCapabilities = getMissingCapabilitiesFromGateEvaluation(eligibility);
  const hasMissingDocumentCapability = missingCapabilities.some((capability) =>
    capability === "minimum_age"
    || capability === "nationality"
    || capability === "gender"
  );
  if (!hasMissingDocumentCapability) {
    return false;
  }
  return (eligibility.membership_gate_summaries ?? []).some((gate) =>
    (gate.gate_type === "minimum_age" || gate.gate_type === "nationality" || gate.gate_type === "gender")
    && (gate.accepted_providers?.includes("zkpassport") ?? false)
  );
}

export function getVerificationPromptCopy(
  provider: VerificationProvider,
  capabilities: MissingCapability[],
  options?: { locale?: string | null; membershipGateSummaries?: MembershipGateSummary[] | null },
): {
  title: string;
  description: string;
  actionLabel: string;
} {
  const locale = resolveGateLocale(options?.locale);
  const gates = getLocaleMessages(locale, "gates");

  if (provider === "very") {
    return gates.verificationPrompt.very;
  }

  if (provider === "passport") {
    return gates.verificationPrompt.passport;
  }

  if (provider === "zkpassport") {
    return {
      title: "Verify with ZKPassport",
      description: "ZKPassport lets you prove document facts for this community without sharing your name, photo, or document details with Pirate.",
      actionLabel: "Verify with ZKPassport",
    };
  }

  const visibleCapabilities = getVisibleSelfCapabilities(capabilities);
  const selfPrompt = gates.verificationPrompt.self;

  if (options?.membershipGateSummaries && hasSelfDocumentCapability(visibleCapabilities)) {
    const requirement = formatSelfVerificationRequirement(visibleCapabilities, options?.membershipGateSummaries, locale);
    return {
      title: "Verify to join",
      description: [
        `This community requires you to prove ${requirement} before joining.`,
        "To prove this privately, Pirate uses Self.xyz. Your name, photo, and document details are not shared with this community.",
        "Passports and national IDs are supported.",
      ].join("\n\n"),
      actionLabel: "Start private verification",
    };
  }

  if (visibleCapabilities.length === 0 || visibleCapabilities[0] === "unique_human") {
    return {
      title: selfPrompt.title,
      description: selfPrompt.descriptions.default,
      actionLabel: selfPrompt.actionLabel,
    };
  }

  if (visibleCapabilities.length === 1) {
    switch (visibleCapabilities[0]) {
      case "age_over_18":
        return {
          title: selfPrompt.title,
          description: selfPrompt.descriptions.ageOver18,
          actionLabel: selfPrompt.actionLabel,
        };
      case "minimum_age":
        return {
          title: selfPrompt.title,
          description: selfPrompt.descriptions.minimumAge,
          actionLabel: selfPrompt.actionLabel,
        };
      case "nationality":
        return {
          title: selfPrompt.title,
          description: selfPrompt.descriptions.nationality,
          actionLabel: selfPrompt.actionLabel,
        };
      case "gender":
        return {
          title: selfPrompt.title,
          description: selfPrompt.descriptions.gender,
          actionLabel: selfPrompt.actionLabel,
        };
      default:
        break;
    }
  }

  const labels = gates.capabilityLabels;
  const capabilityLabels = visibleCapabilities.map((capability) => {
    switch (capability) {
      case "age_over_18": return labels.ageOver18;
      case "minimum_age": return labels.minimumAge;
      case "nationality": return labels.nationality;
      case "gender": return labels.gender;
      case "unique_human": return labels.uniqueHuman;
      case "wallet_score": return labels.walletScore;
      case "altcha_pow": return labels.altchaPow;
    }
  });

  return {
    title: selfPrompt.title,
    description: selfPrompt.descriptions.multiple.replace("{capabilities}", joinWithAnd(capabilityLabels, locale)),
    actionLabel: selfPrompt.actionLabel,
  };
}

export function getGateFailureMessage(
  details: Pick<GateFailureDetails, "failure_reason">,
  options?: { locale?: string | null },
): string | null {
  const locale = resolveGateLocale(options?.locale);
  const copy = getLocaleMessages(locale, "gates").gateFailure;
  switch (details.failure_reason) {
    case "nationality_mismatch":
      return copy.nationalityMismatch;
    case "gender_mismatch":
      return copy.genderMismatch;
    case "minimum_age_mismatch":
      return copy.minimumAgeMismatch;
    case "provider_not_accepted":
      return copy.providerNotAccepted;
    case "unsupported":
      return copy.unsupported;
    case "erc721_holding_required":
      return copy.erc721HoldingRequired;
    case "erc721_inventory_match_required":
      return copy.erc721InventoryMatchRequired;
    case "token_inventory_unavailable":
      return copy.tokenInventoryUnavailable;
    case "wallet_score_too_low":
      return copy.walletScoreTooLow;
    case "asset_balance_too_low":
      return copy.assetBalanceTooLow;
    case "banned":
      return copy.banned;
    default:
      return null;
  }
}
import { formatCompactAddress } from "@/lib/formatting/address";
