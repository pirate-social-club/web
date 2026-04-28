import type {
  GateFailureDetails,
  JoinEligibility,
  MembershipGateSummary,
  RequestedVerificationCapability,
  VerificationCapabilities,
  VerificationRequirement,
} from "@pirate/api-contracts";
import { getCountryDisplayName, normalizeCountryCode } from "@/lib/countries";
import { isUiLocaleCode, type UiLocaleCode } from "@/lib/ui-locale-core";
import { getLocaleMessages } from "@/locales";

type IdentityGateAudience = "public" | "admin";
type VerificationProvider = "self" | "very" | "passport";
type RequirementProviderContext = VerificationProvider | null;
type MissingCapability = JoinEligibility["missing_capabilities"][number];

const SELF_CAPABILITY_ORDER: RequestedVerificationCapability[] = [
  "unique_human",
  "age_over_18",
  "minimum_age",
  "nationality",
  "gender",
];
const SELF_REQUESTED_CAPABILITY_ORDER: RequestedVerificationCapability[] = [
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
];

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
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatInventoryAssetLabel(gate: MembershipGateSummary): string {
  if (gate.asset_filter_label?.trim()) {
    return gate.asset_filter_label.trim();
  }
  if (gate.asset_category === "watch") {
    return "watch";
  }
  return "card";
}

function getVisibleSelfCapabilities(capabilities: MissingCapability[]): MissingCapability[] {
  const ordered = SELF_CAPABILITY_ORDER.filter((capability) => capabilities.includes(capability));
  if (ordered.some((capability) => capability !== "unique_human")) {
    return ordered.filter((capability) => capability !== "unique_human");
  }
  return ordered;
}

function isSelfRequestedCapability(capability: MissingCapability): capability is RequestedVerificationCapability {
  return SELF_REQUESTED_CAPABILITY_ORDER.some((candidate) => candidate === capability);
}

export function formatGateRequirement(
  gate: MembershipGateSummary,
  options?: { audience?: IdentityGateAudience; locale?: string | null; provider?: RequirementProviderContext },
): string {
  const audience = options?.audience ?? "public";
  const locale = resolveGateLocale(options?.locale);
  const provider = options?.provider ?? null;
  const copy = getLocaleMessages(locale, "gates").requirements;

  switch (gate.gate_type) {
    case "nationality": {
      const requiredValues = gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [];
      if (requiredValues.length > 0) {
        const countries = requiredValues.map((value) => {
          const country = formatCountryName(value, locale);
          return audience === "admin" ? `${country} (${value})` : country;
        });
        const countryLabel = joinWithAnd(countries, locale);
        return copy.nationality.withValues.replace("{countryLabel}", countryLabel);
      }
      return copy.nationality.withoutValues;
    }
    case "gender": {
      if (audience === "admin" && gate.required_value) {
        return copy.gender.adminWithValue.replace("{requiredValue}", gate.required_value);
      }
      return copy.gender.public;
    }
    case "unique_human":
      return provider === "very" ? copy.uniqueHuman.very : copy.uniqueHuman.self;
    case "age_over_18":
      return copy.ageOver18;
    case "minimum_age": {
      const age = String(gate.required_minimum_age ?? 18);
      return copy.minimumAge.replace("{age}", age);
    }
    case "wallet_score": {
      if (typeof gate.minimum_score === "number") {
        return copy.walletScore.withScore.replace("{minimumScore}", String(gate.minimum_score));
      }
      return copy.walletScore.withoutScore;
    }
    case "erc721_holding": {
      const label = gate.contract_address ? shortenAddress(gate.contract_address) : null;
      if (label) {
        return copy.erc721Holding.withLabel.replace("{label}", label);
      }
      return copy.erc721Holding.withoutLabel;
    }
    case "erc721_inventory_match": {
      const quantity = String(gate.min_quantity ?? 1);
      const assetLabel = formatInventoryAssetLabel(gate);
      return copy.erc721InventoryMatch.replace("{quantity}", quantity).replace("{assetLabel}", assetLabel);
    }
    default:
      return copy.fallback.replace("{gateType}", gate.gate_type);
  }
}

export function getJoinCtaLabel(
  eligibility: JoinEligibility,
  options?: { locale?: string | null },
): string {
  const locale = resolveGateLocale(options?.locale);
  const copy = getLocaleMessages(locale, "gates").joinCta;
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

export function getVerificationCapabilitiesForProvider(
  eligibility: Pick<JoinEligibility, "missing_capabilities">,
  provider: VerificationProvider,
): RequestedVerificationCapability[] {
  const uniqueCapabilities = new Set<RequestedVerificationCapability>();
  for (const capability of eligibility.missing_capabilities) {
    if (provider === "very") {
      if (capability === "unique_human") {
        uniqueCapabilities.add(capability);
      }
    } else if (provider === "passport") {
      continue;
    } else if (isSelfRequestedCapability(capability)) {
      uniqueCapabilities.add(capability);
    }
  }
  if (provider === "self") {
    return SELF_REQUESTED_CAPABILITY_ORDER.filter((capability) => uniqueCapabilities.has(capability));
  }
  if (provider === "passport") {
    return [];
  }
  return Array.from(uniqueCapabilities);
}

export function getPassportPromptCapabilities(
  input: { missing_capabilities?: readonly string[] | null },
): MissingCapability[] {
  return (input.missing_capabilities ?? [])
    .filter((capability): capability is MissingCapability => capability === "wallet_score");
}

export function getVerificationRequirementsForGates(
  gates: MembershipGateSummary[] | null | undefined,
): VerificationRequirement[] {
  const requirements: VerificationRequirement[] = [];
  const minimumAges = (gates ?? [])
    .filter((gate) => gate.gate_type === "minimum_age" && Number.isInteger(gate.required_minimum_age))
    .map((gate) => gate.required_minimum_age as number);
  if (minimumAges.length > 0) {
    requirements.push({ proof_type: "minimum_age", minimum_age: Math.max(...minimumAges) });
  }
  return requirements;
}

function getRequiredNationalityValues(gate: MembershipGateSummary): string[] {
  return (gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [])
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
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
  const excludedValues = (gate.excluded_values ?? []).map((item) => item.trim().toUpperCase()).filter(Boolean);
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

  const verificationRequirements = minimumAges.length > 0
    ? [{ proof_type: "minimum_age" as const, minimum_age: Math.max(...minimumAges) }]
    : [];

  return {
    requestedCapabilities: SELF_REQUESTED_CAPABILITY_ORDER.filter((capability) => requestedCapabilities.has(capability)),
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
  eligibility: Pick<JoinEligibility, "suggested_verification_provider"> & {
    membership_gate_summaries?: MembershipGateSummary[] | null;
    missing_capabilities?: readonly string[] | null;
  },
): VerificationProvider {
  if (eligibility.suggested_verification_provider) {
    return eligibility.suggested_verification_provider;
  }

  const missingCapabilities = eligibility.missing_capabilities ?? [];
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
    const uniqueHumanGates = gateSummaries.filter((gate) => gate.gate_type === "unique_human");
    if (uniqueHumanGates.some((gate) => gate.accepted_providers?.includes("very") ?? false)) {
      return "very";
    }
    if (uniqueHumanGates.some((gate) => gate.accepted_providers?.includes("self") ?? false)) {
      return "self";
    }
    return "very";
  }

  return "very";
}

export function getVerificationPromptCopy(
  provider: VerificationProvider,
  capabilities: MissingCapability[],
  options?: { locale?: string | null },
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

  const visibleCapabilities = getVisibleSelfCapabilities(capabilities);
  const selfPrompt = gates.verificationPrompt.self;

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
    case "banned":
      return copy.banned;
    default:
      return null;
  }
}
