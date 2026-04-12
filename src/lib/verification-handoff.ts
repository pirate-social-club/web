type VerificationProvider = "self" | "very";
type RequestedVerificationCapability = "unique_human" | "age_over_18" | "nationality" | "gender";
type VerificationIntent =
  | "profile_verification"
  | "community_creation"
  | "ucommunity_join"
  | "post_access_18_plus"
  | "commerce_pricing"
  | "qualifier_disclosure";

export type PendingVerificationStart = {
  provider: VerificationProvider;
  verificationIntent?: VerificationIntent | null;
  policyId?: string | null;
  requestedCapabilities?: RequestedVerificationCapability[];
  reason?: "community_join_gate_failed";
  communityId?: string | null;
  returnPath?: string | null;
};

export type PendingCommunityJoinRetry = {
  communityId: string;
  returnPath?: string | null;
};

const PENDING_VERIFICATION_START_STORAGE_KEY = "pirate.pending_verification_start";
const PENDING_COMMUNITY_JOIN_RETRY_STORAGE_KEY = "pirate.pending_community_join_retry";
const VALID_PROVIDERS = new Set<VerificationProvider>(["self", "very"]);
const VALID_CAPABILITIES = new Set<RequestedVerificationCapability>([
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function storePendingVerificationStart(input: PendingVerificationStart): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_VERIFICATION_START_STORAGE_KEY, JSON.stringify(input));
}

export function consumePendingVerificationStart(): PendingVerificationStart | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PENDING_VERIFICATION_START_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  window.sessionStorage.removeItem(PENDING_VERIFICATION_START_STORAGE_KEY);

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed) || !VALID_PROVIDERS.has(parsed.provider as VerificationProvider)) {
      return null;
    }

    const requestedCapabilities = Array.isArray(parsed.requestedCapabilities)
      ? parsed.requestedCapabilities.filter((value): value is RequestedVerificationCapability => (
        typeof value === "string" && VALID_CAPABILITIES.has(value as RequestedVerificationCapability)
      ))
      : undefined;

    return {
      provider: parsed.provider as VerificationProvider,
      verificationIntent: typeof parsed.verificationIntent === "string" ? parsed.verificationIntent as VerificationIntent : null,
      policyId: typeof parsed.policyId === "string" ? parsed.policyId : null,
      requestedCapabilities,
      reason: parsed.reason === "community_join_gate_failed" ? "community_join_gate_failed" : undefined,
      communityId: typeof parsed.communityId === "string" ? parsed.communityId : null,
      returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : null,
    };
  } catch {
    return null;
  }
}

export function storePendingCommunityJoinRetry(input: PendingCommunityJoinRetry): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_COMMUNITY_JOIN_RETRY_STORAGE_KEY, JSON.stringify(input));
}

export function consumePendingCommunityJoinRetry(communityId: string): PendingCommunityJoinRetry | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PENDING_COMMUNITY_JOIN_RETRY_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed) || parsed.communityId !== communityId) {
      return null
    }

    window.sessionStorage.removeItem(PENDING_COMMUNITY_JOIN_RETRY_STORAGE_KEY);
    return {
      communityId,
      returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : null,
    };
  } catch {
    return null;
  }
}
