import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";
export type NamespaceFamily = "hns" | "spaces";

export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";

export type IdentityGateDraft =
  | {
    gateType: "nationality";
    provider: "self";
    requiredValue: string;
    gateRuleId?: string;
  }
  | {
    gateType: "gender";
    provider: "self";
    requiredValue: "M" | "F";
    gateRuleId?: string;
  };

export type ComposerStep = 1 | 2 | 3;

export interface CreatorVerificationState {
  uniqueHumanVerified: boolean;
  ageOver18Verified: boolean;
}

export interface NamespaceAttachmentState {
  namespaceVerificationId: string;
  family: NamespaceFamily;
  normalizedRootLabel: string;
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
  initialStep?: ComposerStep;
  namespaceAttachment?: NamespaceAttachmentState | null;
  onOpenNamespaceVerification?: () => void;
  onClearNamespaceVerification?: () => void;
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
    namespaceVerificationId: string | null;
  }) => Promise<{
    communityId: string;
  }>;
}
