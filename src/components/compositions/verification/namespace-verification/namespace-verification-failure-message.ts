import type { getHnsVerificationMode } from "@/components/compositions/verification/namespace-verification/namespace-verification-hns-ui";
import { defaultRouteCopy } from "@/components/compositions/system/route-copy-defaults";

type NamespaceVerificationFailureCopy =
  typeof defaultRouteCopy["moderation"]["namespaceVerification"]["failure"];

type HnsMode = ReturnType<typeof getHnsVerificationMode> | null;

export function getNamespaceVerificationFailureMessage({
  copy,
  failureReason,
  hnsMode,
  isExpired,
  isHns,
}: {
  copy: NamespaceVerificationFailureCopy;
  failureReason: string | null;
  hnsMode: HnsMode;
  isExpired: boolean;
  isHns: boolean;
}) {
  if (isExpired) {
    return copy.expired;
  }

  if (isHns) {
    return getHnsFailureMessage({ copy, failureReason, hnsMode });
  }

  return getSpacesFailureMessage({ copy, failureReason });
}

export function getHnsStatusMessage({
  copy,
  failureReason,
  hnsMode,
  isChallengePending,
  isDnsSetupRequired,
  isExpired,
  isFailed,
  isVerifying,
}: {
  copy: NamespaceVerificationFailureCopy;
  failureReason: string | null;
  hnsMode: HnsMode;
  isChallengePending: boolean;
  isDnsSetupRequired: boolean;
  isExpired: boolean;
  isFailed: boolean;
  isVerifying: boolean;
}) {
  if (isVerifying) {
    return copy.checkingRecords;
  }

  if (isDnsSetupRequired || isChallengePending) {
    return copy.recordsNotFound;
  }

  if (isFailed) {
    return getHnsFailureMessage({ copy, failureReason, hnsMode });
  }

  if (isExpired) {
    return copy.expired;
  }

  return null;
}

function getHnsFailureMessage({
  copy,
  failureReason,
  hnsMode,
}: {
  copy: NamespaceVerificationFailureCopy;
  failureReason: string | null;
  hnsMode: HnsMode;
}) {
  if (hnsMode === "dns_setup_required") {
    return copy.recordsNotFound;
  }

  switch (failureReason) {
    case "challenge_mismatch":
      return copy.txtRecordMismatch;
    case "dns_delegation_not_confirmed":
      return copy.nameserverDelegationNotDetected;
    case "root_resource_unavailable":
      return copy.rootResourceUnavailable;
    case "zone_not_provisioned":
      return copy.zoneNotProvisioned;
    case "challenge_not_published":
      return copy.txtRecordNotFound;
    case "provider_unavailable":
      return copy.verifierUnavailable;
    default:
      return copy.hnsDefault;
  }
}

function getSpacesFailureMessage({
  copy,
  failureReason,
}: {
  copy: NamespaceVerificationFailureCopy;
  failureReason: string | null;
}) {
  switch (failureReason) {
    case "pirate_verify_record_missing":
      return copy.spacesVerificationRecordNotFound;
    case "web_target_missing":
      return copy.spacesWebTargetMissing;
    case "freedom_target_missing":
      return copy.spacesFreedomTargetMissing;
    case "fabric_publish_not_verified":
      return copy.spacesPublishNotConfirmed;
    case "provider_unavailable":
      return copy.verifierUnavailable;
    default:
      return copy.spacesDefault;
  }
}
