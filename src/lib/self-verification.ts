import type { VerificationSession } from "@pirate/api-contracts";

export type SelfVerificationResult =
  | { status: "completed"; proof: string }
  | { status: "expired" }
  | { status: "failed"; reason: string };

type SelfAppLaunch = NonNullable<NonNullable<VerificationSession["launch"]>["self_app"]>;
type SelfCallbackParam = "error" | "expired" | "proof" | "self_verification_session_id";

const SELF_CALLBACK_PARAMS: SelfCallbackParam[] = [
  "error",
  "expired",
  "proof",
  "self_verification_session_id",
];

function hashParams(url: URL): URLSearchParams {
  const rawHash = url.hash.replace(/^#/u, "");
  if (!rawHash) {
    return new URLSearchParams();
  }

  const queryStart = rawHash.indexOf("?");
  const rawParams = queryStart >= 0 ? rawHash.slice(queryStart + 1) : rawHash;
  if (!rawParams.includes("=")) {
    return new URLSearchParams();
  }

  return new URLSearchParams(rawParams.replace(/^\?/u, ""));
}

export function getSelfCallbackParam(url: URL, param: SelfCallbackParam): string | null {
  return url.searchParams.get(param) ?? hashParams(url).get(param);
}

export function hasSelfCallbackParams(url: URL): boolean {
  return SELF_CALLBACK_PARAMS.some((param) => getSelfCallbackParam(url, param) != null);
}

export function getSelfCallbackSessionId(url: URL): string | null {
  return getSelfCallbackParam(url, "self_verification_session_id")?.trim() || null;
}

export function getSelfCallbackCleanHref(url: URL): string {
  const clean = new URL(url.toString());
  for (const param of SELF_CALLBACK_PARAMS) {
    clean.searchParams.delete(param);
  }
  if (SELF_CALLBACK_PARAMS.some((param) => hashParams(url).has(param))) {
    clean.hash = "";
  }
  return `${clean.pathname}${clean.search}${clean.hash}`;
}

export function buildSelfVerificationCallbackHref(currentHref: string, verificationSessionId: string): string {
  const url = new URL(currentHref);
  for (const param of SELF_CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }
  url.searchParams.set("self_verification_session_id", verificationSessionId);
  if (SELF_CALLBACK_PARAMS.some((param) => hashParams(url).has(param))) {
    url.hash = "";
  }
  return url.toString();
}

export function parseSelfCallback(url: URL): SelfVerificationResult {
  const proof = getSelfCallbackParam(url, "proof")?.trim();
  if (proof) return { status: "completed", proof };

  const error = getSelfCallbackParam(url, "error");
  if (error) return { status: "failed", reason: error };

  const expired = getSelfCallbackParam(url, "expired");
  if (expired === "true") return { status: "expired" };

  return { status: "failed", reason: "no_proof_returned" };
}

export function getSelfVerificationLaunchHref(
  launch: SelfAppLaunch | null | undefined,
  options: { deeplinkCallback?: string | null } = {},
): string | null {
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
    deeplinkCallback: options.deeplinkCallback ?? launch.deeplink_callback ?? "",
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
