import type {
  GateFailureDetails,
  JoinEligibility,
  MembershipGateSummary,
} from "@pirate/api-contracts";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  AR: "Argentina",
  BR: "Brazil",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  GB: "United Kingdom",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  MX: "Mexico",
  NG: "Nigeria",
  RU: "Russia",
  ZA: "South Africa",
  ES: "Spain",
};

type IdentityGateAudience = "public" | "admin";
type VerificationProvider = "self" | "very";
type MissingCapability = JoinEligibility["missing_capabilities"][number];

const SELF_CAPABILITY_ORDER: MissingCapability[] = [
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
];

function joinWithAnd(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatCountryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

function getVisibleSelfCapabilities(capabilities: MissingCapability[]): MissingCapability[] {
  const ordered = SELF_CAPABILITY_ORDER.filter((capability) => capabilities.includes(capability));
  if (ordered.some((capability) => capability !== "unique_human")) {
    return ordered.filter((capability) => capability !== "unique_human");
  }
  return ordered;
}

export function formatGateRequirement(
  gate: MembershipGateSummary,
  options?: { audience?: IdentityGateAudience },
): string {
  const audience = options?.audience ?? "public";

  switch (gate.gate_type) {
    case "nationality": {
      if (gate.required_value) {
        return `Requires ${formatCountryName(gate.required_value)} nationality`;
      }
      return "Requires nationality verification";
    }
    case "gender": {
      if (audience === "admin" && gate.required_value) {
        return `Requires Self document marker ${gate.required_value}`;
      }
      return "Verify with ID";
    }
    case "unique_human":
      return "Requires unique human verification";
    case "age_over_18":
      return "Requires 18+ verification";
    case "wallet_score":
      return "Requires passport verification";
    default:
      return `Requires ${gate.gate_type} verification`;
  }
}

export function getJoinCtaLabel(eligibility: JoinEligibility): string {
  switch (eligibility.status) {
    case "joinable": return "Join";
    case "requestable": return "Request to Join";
    case "verification_required": return "Verify to Join";
    case "already_joined": return "Joined";
    case "banned": return "Unavailable";
    case "gate_failed": return "Not eligible";
  }
}

export function isJoinCtaActionable(eligibility: JoinEligibility): boolean {
  return eligibility.status === "joinable"
    || eligibility.status === "requestable"
    || eligibility.status === "verification_required";
}

export function getSelfVerificationCapabilities(
  eligibility: Pick<JoinEligibility, "missing_capabilities">,
): MissingCapability[] {
  const uniqueCapabilities = new Set<MissingCapability>();
  for (const capability of eligibility.missing_capabilities) {
    if (SELF_CAPABILITY_ORDER.includes(capability)) {
      uniqueCapabilities.add(capability);
    }
  }
  return SELF_CAPABILITY_ORDER.filter((capability) => uniqueCapabilities.has(capability));
}

export function getVerificationPromptCopy(
  provider: VerificationProvider,
  capabilities: MissingCapability[],
): {
  title: string;
  description: string;
  actionLabel: string;
} {
  if (provider === "very") {
    return {
      title: "Verify with ID",
      description: "Complete ID check to continue.",
      actionLabel: "Verify with ID",
    };
  }

  const visibleCapabilities = getVisibleSelfCapabilities(capabilities);

  if (visibleCapabilities.length === 0 || visibleCapabilities[0] === "unique_human") {
    return {
      title: "Verify with ID",
      description: "Complete ID check to continue.",
      actionLabel: "Verify with ID",
    };
  }

  if (visibleCapabilities.length === 1) {
    switch (visibleCapabilities[0]) {
      case "age_over_18":
        return {
          title: "Verify with ID",
          description: "Confirm you are 18+ with ID.",
          actionLabel: "Verify with ID",
        };
      case "nationality":
        return {
          title: "Verify with ID",
          description: "Confirm nationality with ID.",
          actionLabel: "Verify with ID",
        };
      case "gender":
        return {
          title: "Verify with ID",
          description: "Complete ID check to continue.",
          actionLabel: "Verify with ID",
        };
      default:
        break;
    }
  }

  const capabilityLabels = visibleCapabilities.map((capability) => {
    switch (capability) {
      case "age_over_18": return "18+ status";
      case "nationality": return "nationality";
      case "gender": return "Self document marker";
      case "unique_human": return "unique human status";
    }
  });

  return {
    title: "Verify with ID",
    description: `Confirm ${joinWithAnd(capabilityLabels)} with ID.`,
    actionLabel: "Verify with ID",
  };
}

export function getGateFailureMessage(details: Pick<GateFailureDetails, "failure_reason">): string | null {
  switch (details.failure_reason) {
    case "nationality_mismatch":
      return "Your verified nationality does not match this community's requirement.";
    case "gender_mismatch":
      return "Your ID check does not match this community's rule.";
    case "provider_not_accepted":
      return "Your existing verification does not satisfy this community's requirement.";
    case "unsupported":
      return "This community uses a gate your current verification cannot satisfy here yet.";
    case "banned":
      return "You are not eligible to join this community.";
    default:
      return null;
  }
}

export function getGateDraftWarning(gateType: MembershipGateSummary["gate_type"]): string | null {
  if (gateType === "gender") {
    return "This gate uses the Self document marker (M/F), which reflects passport data, not self-identified gender.";
  }
  return null;
}
