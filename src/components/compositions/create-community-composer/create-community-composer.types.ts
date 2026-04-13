import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";

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

export type ComposerStep = 1 | 2 | 3;

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
  creatorVerificationState?: CreatorVerificationState;
  initialStep?: ComposerStep;
  onCreate?: (input: {
    displayName: string;
    description: string | null;
    membershipMode: CommunityMembershipMode;
    defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: AnonymousIdentityScope;
    gateTypes: Set<GateType>;
  }) => Promise<{
    communityId: string;
  }>;
}
