import { ApiError } from "@/lib/api/client";

export function isMembershipRequiredWriteRejection(error: unknown): boolean {
  return error instanceof ApiError
    && error.code === "eligibility_failed"
    && error.details?.reason === "membership_required";
}
