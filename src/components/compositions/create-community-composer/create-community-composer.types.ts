export type CommunityMembershipMode = "open" | "gated";
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";

export type NamespaceFamily = "hns" | "spaces";

export type NamespaceImportStatus =
  | "not_imported"
  | "checking"
  | "inspected"
  | "txt_challenge_ready"
  | "pending"
  | "verified";

export type HnsDelegationMode = "owner_managed" | "pirate_managed";

export type SpacesHandleMode = "owner_managed" | "operator_brokered" | "attach_certificate";

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

export interface GateRuleDraft {
  scope: "membership";
  gateFamily: GateFamily;
  gateType: GateType;
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
  txtChallenge?: string;
  signatureChallenge?: string;
}

export interface CreatorVerificationState {
  uniqueHumanVerified: boolean;
  ageOver18Verified: boolean;
}

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
}
