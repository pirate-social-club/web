export function namespaceAttachmentLoadState(input: {
  currentVerificationId: string | null | undefined;
  errorVerificationId: string | null;
  resolvedVerificationId: string | null;
}): "idle" | "loading" | "ready" | "error" {
  if (!input.currentVerificationId) return "idle";
  if (input.resolvedVerificationId === input.currentVerificationId) return "ready";
  if (input.errorVerificationId === input.currentVerificationId) return "error";
  return "loading";
}
