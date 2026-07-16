import { ApiError } from "@/lib/api/client";

export function isMembershipRequiredWriteRejection(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;

  return error.code === "membership_required"
    || (error.code === "eligibility_failed"
      && error.details?.reason === "membership_required");
}
