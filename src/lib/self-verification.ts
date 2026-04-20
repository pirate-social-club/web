import type { VerificationSession } from "@pirate/api-contracts";

export type SelfVerificationResult =
  | { status: "completed"; proof: string }
  | { status: "expired" }
  | { status: "failed"; reason: string };

type SelfAppLaunch = NonNullable<NonNullable<VerificationSession["launch"]>["self_app"]>;

export function parseSelfCallback(url: URL): SelfVerificationResult {
  const proof = url.searchParams.get("proof")?.trim();
  if (proof) return { status: "completed", proof };

  const error = url.searchParams.get("error");
  if (error) return { status: "failed", reason: error };

  const expired = url.searchParams.get("expired");
  if (expired === "true") return { status: "expired" };

  return { status: "failed", reason: "no_proof_returned" };
}

export function getSelfVerificationLaunchHref(launch: SelfAppLaunch | null | undefined): string | null {
  const endpoint = launch?.endpoint?.trim();
  const sessionId = launch?.session_id?.trim();
  const scope = launch?.scope?.trim();

  if (!endpoint || !sessionId || !scope) {
    return null;
  }

  const url = new URL(endpoint);
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("scope", scope);

  const deeplinkCallback = launch?.deeplink_callback?.trim();
  if (deeplinkCallback) {
    url.searchParams.set("deeplink_callback", deeplinkCallback);
  }

  return url.toString();
}
