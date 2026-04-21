import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";
export type CommunityReadAccessMode = "public" | "members_only";
export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";

export type IdentityGateDraft =
  | {
    gateType: "nationality";
    provider: "self";
    requiredValues: string[];
    gateRuleId?: string;
  }
  | {
    gateType: "minimum_age";
    provider: "self";
    minimumAge: number;
    gateRuleId?: string;
  }
  | {
    gateType: "gender";
    provider: "self";
    requiredValue: "M" | "F";
    gateRuleId?: string;
  }
  | {
    gateType: "erc721_holding";
    chainNamespace: "eip155:1";
    contractAddress: string;
    gateRuleId?: string;
  };

export type ComposerStep = 1 | 2 | 3;

export interface CreatorVerificationState {
  uniqueHumanVerified: boolean;
  ageOver18Verified: boolean;
}

export interface CreateCommunityComposerProps {
  avatarRef?: string;
  bannerRef?: string;
  displayName?: string;
  description?: string;
  gateDrafts?: IdentityGateDraft[];
  membershipMode?: CommunityMembershipMode;
  defaultAgeGatePolicy?: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity?: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope;
  creatorVerificationState?: CreatorVerificationState;
  deferCreatorVerification?: boolean;
  initialStep?: ComposerStep;
  onCreate?: (input: {
    avatarFile: File | null;
    avatarRef: string | null;
    bannerFile: File | null;
    bannerRef: string | null;
    displayName: string;
    description: string | null;
    membershipMode: CommunityMembershipMode;
    defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: AnonymousIdentityScope;
    gateDrafts: IdentityGateDraft[];
  }) => Promise<{
    communityId: string;
  } | void>;
}
