import type { MembershipGateSummary, JoinEligibility } from "@pirate/api-contracts";

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

export function formatGateRequirement(gate: MembershipGateSummary): string {
  if (gate.gate_type === "nationality" && gate.required_value) {
    const name = COUNTRY_NAMES[gate.required_value] ?? gate.required_value;
    return `Requires ${name} nationality`;
  }
  return `Requires ${gate.gate_type} verification`;
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
