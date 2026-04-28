import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";

export type CommunityMembershipMode = "open" | "request" | "gated";
export type { CourtyardWalletInventoryGroup };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";
export type CommunityReadAccessMode = "public" | "members_only";
export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";
export type CommunityDatabaseRegion =
  | "auto"
  | "aws-us-east-1"
  | "aws-us-east-2"
  | "aws-us-west-2"
  | "aws-eu-west-1"
  | "aws-ap-south-1"
  | "aws-ap-northeast-1";

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
    gateType: "wallet_score";
    provider: "passport";
    minimumScore: number;
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
  }
  | {
    gateType: "erc721_inventory_match";
    chainNamespace: "eip155:137";
    contractAddress: string;
    inventoryProvider: "courtyard";
    minQuantity: number;
    assetFilter: {
      category: "trading_card" | "watch";
      franchise?: string;
      subject?: string;
      brand?: string;
      model?: string;
      reference?: string;
      set?: string;
      year?: string;
      grader?: string;
      grade?: string;
      condition?: string;
    };
    gateRuleId?: string;
  };

export type ComposerStep = 1 | 2 | 3;

export interface CreatorVerificationState {
  ageOver18Verified: boolean;
}

export interface CreateCommunityComposerProps {
  avatarRef?: string;
  bannerRef?: string;
  displayName?: string;
  databaseRegion?: CommunityDatabaseRegion;
  description?: string;
  gateDrafts?: IdentityGateDraft[];
  membershipMode?: CommunityMembershipMode;
  defaultAgeGatePolicy?: CommunityDefaultAgeGatePolicy;
  allowAnonymousIdentity?: boolean;
  anonymousIdentityScope?: AnonymousIdentityScope;
  creatorVerificationState?: CreatorVerificationState;
  deferCreatorVerification?: boolean;
  initialStep?: ComposerStep;
  courtyardInventoryGroups?: CourtyardWalletInventoryGroup[] | null;
  courtyardInventoryLoading?: boolean;
  onCreate?: (input: {
    avatarFile: File | null;
    avatarRef: string | null;
    bannerFile: File | null;
    bannerRef: string | null;
    displayName: string;
    databaseRegion: CommunityDatabaseRegion;
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
