import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";

export type NamespaceFamily = "hns" | "spaces";

export type NamespaceImportStatus =
  | "not_imported"
  | "checking"
  | "dns_setup_required"
  | "inspected"
  | "txt_challenge_ready"
  | "pending"
  | "verified";

export type HnsDelegationMode = "owner_managed" | "pirate_managed";

export type SpacesHandleMode = "owner_managed" | "operator_brokered" | "attach_certificate";
export type NamespaceChallengeKind = "dns_txt" | "schnorr_sign";

export type HandlePolicyTemplate = "standard" | "premium" | "membership_gated" | "custom";
export type HandlePricingModel = "free" | "flat_by_length" | "custom_curve" | "gated_then_flat";
export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";

export type GateFamily = "token_holding" | "identity_proof";
export type GateType =
  | "erc721_holding"
  | "erc1155_holding"
  | "erc20_balance"
  | "solana_nft_holding"
  | "unique_human"
  | "age_over_18"
  | "nationality"
  | "wallet_score";

export type ComposerStep = 1 | 2 | 3 | 4 | 5;

export interface HandlePolicyState {
  policyTemplate: HandlePolicyTemplate;
  pricingModel: HandlePricingModel;
  membershipRequiredForClaim: boolean;
}

export interface NamespaceImportState {
  family?: NamespaceFamily;
  externalRoot?: string;
  importStatus?: NamespaceImportStatus;
  ownerLabel?: string;
  hnsDelegationMode?: HnsDelegationMode;
  spacesHandleMode?: SpacesHandleMode;
  expiryDaysRemaining?: number;
  pirateDnsDetected?: boolean;
  challengeKind?: NamespaceChallengeKind;
  txtChallenge?: string;
  signatureChallenge?: string;
  challengeDigest?: string;
}

export interface CreatorVerificationState {
  uniqueHumanVerified: boolean;
  ageOver18Verified: boolean;
}

export type NamespaceVerificationCallbacks = {
  onInspect: (input: {
    family: NamespaceFamily;
    rootLabel: string;
  }) => Promise<{
    namespaceVerificationSessionId: string;
    status: NamespaceVerificationSessionResponse["status"];
    challengeKind: NamespaceChallengeKind | null;
    challengePayload: Record<string, unknown> | null;
    challengeTxtValue: string | null;
    challengeHost: string | null;
    expiryHorizonSufficient: boolean | null;
    expiresAt: string | null;
    failureReason: string | null;
  }>;
  onCompleteVerification: (input: {
    family: NamespaceFamily;
    namespaceVerificationSessionId: string;
    restartChallenge?: boolean;
    signaturePayload?: {
      signature: string;
      algorithm?: string | null;
      signerPubkey?: string | null;
      digest?: string | null;
    };
  }) => Promise<{
    status: NamespaceVerificationSessionResponse["status"];
    challengeKind: NamespaceChallengeKind | null;
    challengePayload: Record<string, unknown> | null;
    namespaceVerificationId: string | null;
    failureReason: string | null;
  }>;
};

export type NamespaceVerificationSessionResponse = {
  status:
    | "draft"
    | "inspecting"
    | "dns_setup_required"
    | "challenge_required"
    | "challenge_pending"
    | "verified"
    | "failed"
    | "expired";
  challenge_txt_value: string | null;
  challenge_host: string | null;
  challenge_kind: NamespaceChallengeKind | null;
  challenge_payload: Record<string, unknown> | null;
  namespace_verification_id: string | null;
  namespace_verification_session_id: string;
  assertions: {
    expiry_horizon_sufficient: boolean | null;
  };
  failure_reason: string | null;
  expires_at?: string | null;
};

export type CreateCommunityCallbacks = {
  onCreate: (input: {
    displayName: string;
    description: string | null;
    membershipMode: CommunityMembershipMode;
    defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: AnonymousIdentityScope;
    namespaceVerificationId: string;
    handlePolicyTemplate: HandlePolicyTemplate;
    gateTypes: Set<GateType>;
  }) => Promise<{
    communityId: string;
  }>;
};

export interface CreateCommunityComposerProps {
  displayName?: string;
  description?: string;
  membershipMode?: CommunityMembershipMode;
  defaultAgeGatePolicy?: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity?: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope;
  namespace?: NamespaceImportState;
  handlePolicy?: HandlePolicyState;
  creatorVerificationState?: CreatorVerificationState;
  initialStep?: ComposerStep;
  namespaceVerification?: NamespaceVerificationCallbacks;
  onCreate?: CreateCommunityCallbacks["onCreate"];
}
