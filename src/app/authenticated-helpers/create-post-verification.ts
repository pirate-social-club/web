import type { JoinEligibility, MembershipGateSummary } from "@pirate/api-contracts";

import { canSatisfyGateWithAltchaOnly } from "@/lib/altcha-gate-path";

export function requiresPostAltchaProofForNonMember(input: {
  eligibility: JoinEligibility | null;
  gateMatchMode?: "all" | "any" | null;
  hasCommunityPostingRole: boolean;
  requirements: MembershipGateSummary[];
}): boolean {
  return !input.hasCommunityPostingRole
    && input.eligibility != null
    && canSatisfyGateWithAltchaOnly({
      eligibility: input.eligibility,
      gateMatchMode: input.gateMatchMode,
      requirements: input.requirements,
    });
}

export function canSendCreatePostRequest(input: {
  canPost: boolean;
  hasCommunityPostingRole: boolean;
  hasOpenPowPostingAccess: boolean;
  isAlreadyJoined: boolean;
}): boolean {
  return input.canPost
    && (input.isAlreadyJoined || input.hasCommunityPostingRole || input.hasOpenPowPostingAccess);
}

export function canSubmitPostWithProofOfWork(input: {
  postAltchaPayload: string | null;
  postAltchaRequired: boolean;
}): boolean {
  return input.postAltchaRequired
    && Boolean(input.postAltchaPayload);
}

export function shouldPromptUniqueHumanForPost(input: {
  needsSelfDocumentFactVerification: boolean;
  postAltchaRequired: boolean;
  uniqueHumanVerified: boolean;
}): boolean {
  if (input.needsSelfDocumentFactVerification) return false;
  if (input.postAltchaRequired) return false;
  return !input.uniqueHumanVerified;
}
