import { describe, expect, test } from "bun:test";

import {
  getHnsStatusMessage,
  getNamespaceVerificationFailureMessage,
} from "./namespace-verification-failure-message";
import { defaultRouteCopy } from "@/components/compositions/system/route-copy-defaults";

const failureCopy = defaultRouteCopy.moderation.namespaceVerification.failure;

describe("namespace verification failure messages", () => {
  test("maps HNS pending setup states to records not found", () => {
    expect(getHnsStatusMessage({
      copy: failureCopy,
      failureReason: "provider_unavailable",
      hnsMode: "owner_managed_txt",
      isChallengePending: true,
      isDnsSetupRequired: false,
      isExpired: false,
      isFailed: false,
      isVerifying: false,
    })).toBe("Records not found.");
  });

  test("maps concrete HNS failed reasons", () => {
    expect(getNamespaceVerificationFailureMessage({
      copy: failureCopy,
      failureReason: "challenge_mismatch",
      hnsMode: "owner_managed_txt",
      isExpired: false,
      isHns: true,
    })).toBe("TXT record does not match.");

    expect(getNamespaceVerificationFailureMessage({
      copy: failureCopy,
      failureReason: "dns_delegation_not_confirmed",
      hnsMode: "owner_managed_txt",
      isExpired: false,
      isHns: true,
    })).toBe("Nameserver delegation not detected.");
  });

  test("maps concrete Spaces failed reasons", () => {
    expect(getNamespaceVerificationFailureMessage({
      copy: failureCopy,
      failureReason: "web_target_missing",
      hnsMode: null,
      isExpired: false,
      isHns: false,
    })).toBe("Web target not reachable.");
  });
});
