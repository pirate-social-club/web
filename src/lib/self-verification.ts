import type { VerificationSession } from "@pirate/api-contracts";
import {
  getUniversalLink,
  SelfAppBuilder,
  type SelfApp,
} from "@selfxyz/sdk-common";

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

function getSelfChainId(launch: SelfAppLaunch): SelfApp["chainID"] {
  if (launch.chain_id === 42220 || launch.chain_id === 11142220) {
    return launch.chain_id;
  }
  return launch.endpoint_type === "staging_celo" || launch.endpoint_type === "staging_https" ? 11142220 : 42220;
}

function getSelfVersion(launch: SelfAppLaunch): SelfApp["version"] {
  return launch.version === 1 || launch.version === 2 ? launch.version : 2;
}

function getSelfDisclosures(launch: SelfAppLaunch): SelfApp["disclosures"] {
  return {
    ...(launch.disclosures.issuing_state ? { issuing_state: true } : {}),
    ...(launch.disclosures.name ? { name: true } : {}),
    ...(launch.disclosures.passport_number ? { passport_number: true } : {}),
    ...(launch.disclosures.nationality ? { nationality: true } : {}),
    ...(launch.disclosures.date_of_birth ? { date_of_birth: true } : {}),
    ...(launch.disclosures.gender ? { gender: true } : {}),
    ...(launch.disclosures.expiry_date ? { expiry_date: true } : {}),
    ...(launch.disclosures.excluded_countries?.length ? { excludedCountries: launch.disclosures.excluded_countries as SelfApp["disclosures"]["excludedCountries"] } : {}),
    ...(typeof launch.disclosures.minimum_age === "number" ? { minimumAge: launch.disclosures.minimum_age } : {}),
  };
}

export function getSelfVerificationApp(
  launch: SelfAppLaunch | null | undefined,
  options: { deeplinkCallback?: string | null } = {},
): SelfApp | null {
  const endpoint = launch?.endpoint?.trim();
  const sessionId = launch?.session_id?.trim();
  const scope = launch?.scope?.trim();
  const userId = launch?.user_id?.trim();

  if (!launch || !endpoint || !sessionId || !scope || !userId) {
    return null;
  }

  try {
    return new SelfAppBuilder({
      appName: launch.app_name,
      chainID: getSelfChainId(launch),
      deeplinkCallback: options.deeplinkCallback ?? launch.deeplink_callback ?? "",
      devMode: launch.dev_mode ?? false,
      endpoint,
      endpointType: launch.endpoint_type,
      header: launch.header ?? "",
      logoBase64: launch.logo_base64 ?? "",
      disclosures: getSelfDisclosures(launch),
      scope,
      sessionId,
      userDefinedData: launch.user_defined_data ?? "",
      userId,
      userIdType: launch.user_id_type,
      version: getSelfVersion(launch),
    }).build();
  } catch {
    return null;
  }
}

export function getSelfVerificationLaunchHref(
  launch: SelfAppLaunch | null | undefined,
  options: { deeplinkCallback?: string | null } = {},
): string | null {
  const selfApp = getSelfVerificationApp(launch, options);
  return selfApp ? getUniversalLink(selfApp) : null;
}
