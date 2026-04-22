"use client";

export type IdentityProofProvider = "self" | "very" | "passport";

export function getAcceptedProvidersForGateType(gateType: string): IdentityProofProvider[] {
  if (gateType === "unique_human") {
    return ["self", "very"];
  }
  if (gateType === "wallet_score") {
    return ["passport"];
  }

  return ["self"];
}
