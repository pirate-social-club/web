import type { CourtyardWalletInventoryGroup } from "@/lib/courtyard-inventory-gates";
import type {
  AnonymousIdentityScope,
  CommunityDefaultAgeGatePolicy,
} from "@/lib/community-access-types";

export type CommunityMembershipMode = "request" | "gated";
export type CommunityGateMatchMode = "all" | "any";
export type { CourtyardWalletInventoryGroup };
export type { AnonymousIdentityScope, CommunityDefaultAgeGatePolicy };
export type CommunityReadAccessMode = "public" | "members_only";
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
    gateType: "unique_human";
    provider: "very";
    gateRuleId?: string;
  }
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

export const DATABASE_REGION_OPTIONS: CommunityDatabaseRegion[] = [
  "aws-us-east-1",
  "aws-us-east-2",
  "aws-us-west-2",
  "aws-eu-west-1",
  "aws-ap-south-1",
  "aws-ap-northeast-1",
];

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
  gateMatchMode?: CommunityGateMatchMode;
  membershipMode?: CommunityMembershipMode | null;
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
    gateMatchMode: CommunityGateMatchMode;
  }) => Promise<{
    communityId: string;
  } | void>;
}
