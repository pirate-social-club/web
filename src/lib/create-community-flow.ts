import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
  CommunityMembershipMode,
  GateType,
  HandlePolicyTemplate,
  NamespaceChallengeKind,
  NamespaceImportStatus,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import type { NamespaceVerificationSessionResponse } from "@/lib/pirate-api";

type IdentityProofProvider = "self" | "very" | "passport";

const GATE_PROVIDER_MATRIX: Record<GateType, IdentityProofProvider[]> = {
  erc721_holding: [],
  erc1155_holding: [],
  erc20_balance: [],
  solana_nft_holding: [],
  unique_human: ["self", "very"],
  age_over_18: ["self"],
  nationality: ["self"],
  wallet_score: ["passport"],
};

export type CreateCommunityRequestBody = {
  display_name: string;
  description?: string | null;
  membership_mode?: "open" | "gated";
  governance_mode?: "centralized";
  default_age_gate_policy?: "none" | "18_plus";
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: "community_stable" | "thread_stable" | null;
  namespace: {
    namespace_verification_id: string;
  };
  handle_policy?: {
    policy_template?: "standard";
  };
  gate_rules?: Array<{
    scope?: "membership";
    gate_family?: "identity_proof";
    gate_type?: GateType;
    proof_requirements?: Array<{
      proof_type?: GateType;
      accepted_providers?: IdentityProofProvider[] | null;
    }>;
  }> | null;
};

export function toExpiryDaysRemaining(expiresAt: string | null | undefined, now = new Date()): number | undefined {
  if (!expiresAt) {
    return undefined;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return undefined;
  }

  const daysRemaining = Math.ceil((expiresAtMs - now.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(daysRemaining, 0);
}

function readStringValue(record: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function readSpacesChallengeState(
  challengeKind: NamespaceChallengeKind | null | undefined,
  challengePayload: Record<string, unknown> | null | undefined,
): {
  challengeMessage: string | undefined;
  challengeDigest: string | undefined;
  challengeAlgorithm: string | undefined;
} {
  if (challengeKind !== "schnorr_sign") {
    return {
      challengeMessage: undefined,
      challengeDigest: undefined,
      challengeAlgorithm: undefined,
    };
  }

  return {
    challengeMessage: readStringValue(challengePayload, "message"),
    challengeDigest: readStringValue(challengePayload, "digest"),
    challengeAlgorithm: readStringValue(challengePayload, "algorithm"),
  };
}

export function mapNamespaceInspectionToUiState(
  session: {
    status: NamespaceVerificationSessionResponse["status"];
    challenge_kind: NamespaceVerificationSessionResponse["challenge_kind"];
    challenge_payload: NamespaceVerificationSessionResponse["challenge_payload"];
    challenge_txt_value: string | null;
    namespace_verification_id: string | null;
    expires_at: string | null | undefined;
    failure_reason: string | null;
  },
  now = new Date(),
): {
  importStatus: NamespaceImportStatus;
  namespaceVerificationId: string | null;
  txtChallenge: string | undefined;
  expiryDaysRemaining: number | undefined;
  failureReason: string | null;
} {
  if (session.status === "verified") {
    return {
      importStatus: "verified",
      namespaceVerificationId: session.namespace_verification_id,
      txtChallenge: session.challenge_txt_value ?? undefined,
      expiryDaysRemaining: toExpiryDaysRemaining(session.expires_at, now),
      failureReason: null,
    };
  }

  if (session.status === "dns_setup_required") {
    return {
      importStatus: "dns_setup_required",
      namespaceVerificationId: null,
      txtChallenge: undefined,
      expiryDaysRemaining: toExpiryDaysRemaining(session.expires_at, now),
      failureReason: session.failure_reason,
    };
  }

  if (
    (session.status === "challenge_pending" || session.status === "challenge_required")
    && session.challenge_txt_value
  ) {
    return {
      importStatus: "txt_challenge_ready",
      namespaceVerificationId: null,
      txtChallenge: session.challenge_txt_value,
      expiryDaysRemaining: toExpiryDaysRemaining(session.expires_at, now),
      failureReason: null,
    };
  }

  if (
    (session.status === "challenge_pending" || session.status === "challenge_required")
    && session.challenge_kind === "schnorr_sign"
  ) {
    return {
      importStatus: "inspected",
      namespaceVerificationId: null,
      txtChallenge: undefined,
      expiryDaysRemaining: toExpiryDaysRemaining(session.expires_at, now),
      failureReason: null,
    };
  }

  return {
    importStatus: "not_imported",
    namespaceVerificationId: null,
    txtChallenge: undefined,
    expiryDaysRemaining: toExpiryDaysRemaining(session.expires_at, now),
    failureReason: session.failure_reason,
  };
}

export function mapNamespaceCompletionToUiState(
  session: Pick<
    NamespaceVerificationSessionResponse,
    "status" | "challenge_kind" | "namespace_verification_id" | "failure_reason"
  >,
): {
  importStatus: NamespaceImportStatus;
  namespaceVerificationId: string | null;
  failureReason: string | null;
} {
  if (session.status === "verified") {
    return {
      importStatus: "verified",
      namespaceVerificationId: session.namespace_verification_id,
      failureReason: null,
    };
  }

  if (session.status === "dns_setup_required") {
    return {
      importStatus: "dns_setup_required",
      namespaceVerificationId: null,
      failureReason: session.failure_reason,
    };
  }

  if (session.status === "challenge_pending" || session.status === "challenge_required") {
    return {
      importStatus: session.challenge_kind === "schnorr_sign" ? "inspected" : "txt_challenge_ready",
      namespaceVerificationId: null,
      failureReason: session.failure_reason,
    };
  }

  return {
    importStatus: "not_imported",
    namespaceVerificationId: null,
    failureReason: session.failure_reason,
  };
}

export function buildCreateCommunityRequestBody(input: {
  displayName: string;
  description: string | null;
  membershipMode: CommunityMembershipMode;
  defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity: boolean;
  anonymousIdentityScope: AnonymousIdentityScope;
  namespaceVerificationId: string;
  handlePolicyTemplate: HandlePolicyTemplate;
  gateTypes: Set<GateType>;
}): CreateCommunityRequestBody {
  const gateRules = input.gateTypes.size > 0
    ? Array.from(input.gateTypes).map((gateType) => ({
        scope: "membership" as const,
        gate_family: "identity_proof" as const,
        gate_type: gateType,
        proof_requirements: [
          {
            proof_type: gateType,
            accepted_providers: GATE_PROVIDER_MATRIX[gateType],
          },
        ],
      }))
    : null;

  return {
    display_name: input.displayName,
    description: input.description,
    membership_mode: input.membershipMode,
    governance_mode: "centralized",
    default_age_gate_policy: input.defaultAgeGatePolicy,
    allow_anonymous_identity: input.allowAnonymousIdentity,
    anonymous_identity_scope:
      input.anonymousIdentityScope === "community_stable" || input.anonymousIdentityScope === "thread_stable"
        ? input.anonymousIdentityScope
        : null,
    namespace: {
      namespace_verification_id: input.namespaceVerificationId,
    },
    handle_policy: {
      policy_template: input.handlePolicyTemplate === "standard" ? "standard" : "standard",
    },
    gate_rules: gateRules,
  };
}
