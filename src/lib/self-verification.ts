export type SelfVerificationResult =
  | { status: "completed"; proof: string }
  | { status: "expired" }
  | { status: "failed"; reason: string };

export function parseSelfCallback(url: URL): SelfVerificationResult {
  const proof = url.searchParams.get("proof")?.trim();
  if (proof) return { status: "completed", proof };

  const error = url.searchParams.get("error");
  if (error) return { status: "failed", reason: error };

  const expired = url.searchParams.get("expired");
  if (expired === "true") return { status: "expired" };

  return { status: "failed", reason: "no_proof_returned" };
}
