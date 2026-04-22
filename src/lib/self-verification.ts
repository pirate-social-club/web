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
  const userId = launch?.user_id?.trim();

  if (!launch || !endpoint || !sessionId || !scope || !userId) {
    return null;
  }

  const selfApp = {
    appName: launch.app_name,
    chainID: launch.chain_id ?? (launch.endpoint_type === "staging_celo" || launch.endpoint_type === "staging_https" ? 11142220 : 42220),
    deeplinkCallback: launch.deeplink_callback ?? "",
    devMode: launch.dev_mode ?? false,
    endpoint,
    endpointType: launch.endpoint_type,
    header: launch.header ?? "",
    logoBase64: launch.logo_base64 ?? "",
    disclosures: {
      ...(launch.disclosures.issuing_state ? { issuing_state: true } : {}),
      ...(launch.disclosures.name ? { name: true } : {}),
      ...(launch.disclosures.passport_number ? { passport_number: true } : {}),
      ...(launch.disclosures.nationality ? { nationality: true } : {}),
      ...(launch.disclosures.date_of_birth ? { date_of_birth: true } : {}),
      ...(launch.disclosures.gender ? { gender: true } : {}),
      ...(launch.disclosures.expiry_date ? { expiry_date: true } : {}),
      ...(launch.disclosures.ofac ? { ofac: true } : {}),
      ...(launch.disclosures.excluded_countries?.length ? { excludedCountries: launch.disclosures.excluded_countries } : {}),
      ...(typeof launch.disclosures.minimum_age === "number" ? { minimumAge: launch.disclosures.minimum_age } : {}),
    },
    scope,
    sessionId,
    userDefinedData: launch.user_defined_data ?? "",
    userId,
    userIdType: launch.user_id_type,
    version: launch.version ?? 2,
  };

  const url = new URL("https://redirect.self.xyz");
  url.searchParams.set("selfApp", JSON.stringify(selfApp));
  return url.toString();
}
