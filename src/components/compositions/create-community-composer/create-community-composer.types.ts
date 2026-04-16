import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };
export type CommunityDefaultAgeGatePolicy = "none" | "18_plus";
export type NamespaceFamily = "hns" | "spaces";

export type AnonymousIdentityScope = "community_stable" | "thread_stable" | "post_ephemeral";

export type NationalityGateDraft = {
  gateType: "nationality";
  provider: "self";
  requiredValue: string;
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
  displayName?: string;
  description?: string;
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
    displayName: string;
    description: string | null;
    membershipMode: CommunityMembershipMode;
    defaultAgeGatePolicy: CommunityDefaultAgeGatePolicy;
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: AnonymousIdentityScope;
    gateDrafts: NationalityGateDraft[];
    namespaceVerificationId: string | null;
  }) => Promise<{
    communityId: string;
  }>;
}
