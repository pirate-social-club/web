"use client";

export type IdentityProofProvider = "self" | "very" | "passport";

export function getAcceptedProvidersForGateType(gateType: string): IdentityProofProvider[] {
  if (gateType === "unique_human") {
    return ["self", "very"];
  }

  return ["self"];
}
