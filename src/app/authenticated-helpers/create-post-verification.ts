export function canSubmitPostWithProofOfWork(input: {
  hasPostingAccess: boolean;
  postAltchaPayload: string | null;
  postAltchaRequired: boolean;
}): boolean {
  return input.hasPostingAccess
    && input.postAltchaRequired
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
