import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildCreateCommunityRequestBody,
  mapNamespaceCompletionToUiState,
  mapNamespaceInspectionToUiState,
  readSpacesChallengeState,
  toExpiryDaysRemaining,
} from "@/lib/create-community-flow";

describe("create-community-flow", () => {
  test("buildCreateCommunityRequestBody includes explicit proof requirements", () => {
    const body = buildCreateCommunityRequestBody({
      displayName: "Builders",
      description: "Ship things.",
      membershipMode: "gated",
      defaultAgeGatePolicy: "none",
      allowAnonymousIdentity: true,
      anonymousIdentityScope: "thread_stable",
      namespaceVerificationId: "nv_demo_01",
      handlePolicyTemplate: "standard",
      gateTypes: new Set(["unique_human", "wallet_score"]),
    });

    assert.deepEqual(body.gate_rules, [
      {
        scope: "membership",
        gate_family: "identity_proof",
        gate_type: "unique_human",
        proof_requirements: [
          {
            proof_type: "unique_human",
            accepted_providers: ["self", "very"],
          },
        ],
      },
      {
        scope: "membership",
        gate_family: "identity_proof",
        gate_type: "wallet_score",
        proof_requirements: [
          {
            proof_type: "wallet_score",
            accepted_providers: ["passport"],
          },
        ],
      },
    ]);
  });

  test("buildCreateCommunityRequestBody normalizes unsupported anonymous scope", () => {
    const body = buildCreateCommunityRequestBody({
      displayName: "Builders",
      description: null,
      membershipMode: "open",
      defaultAgeGatePolicy: "none",
      allowAnonymousIdentity: true,
      anonymousIdentityScope: "post_ephemeral",
      namespaceVerificationId: "nv_demo_01",
      handlePolicyTemplate: "membership_gated",
      gateTypes: new Set(),
    });

    assert.equal(body.anonymous_identity_scope, null);
    assert.equal(body.handle_policy?.policy_template, "standard");
    assert.equal(body.gate_rules, null);
  });

  test("mapNamespaceInspectionToUiState keeps dns setup distinct", () => {
    const mapped = mapNamespaceInspectionToUiState({
      status: "dns_setup_required",
      challenge_kind: null,
      challenge_payload: null,
      challenge_txt_value: null,
      namespace_verification_id: null,
      expires_at: "2026-04-20T00:00:00.000Z",
      failure_reason: "authoritative_dns_required",
    }, new Date("2026-04-11T00:00:00.000Z"));

    assert.equal(mapped.importStatus, "dns_setup_required");
    assert.equal(mapped.expiryDaysRemaining, 9);
    assert.equal(mapped.txtChallenge, undefined);
  });

  test("mapNamespaceInspectionToUiState uses backend expiry rather than fabricated days", () => {
    const mapped = mapNamespaceInspectionToUiState({
      status: "challenge_pending",
      challenge_kind: "dns_txt",
      challenge_payload: null,
      challenge_txt_value: "pirate-verify=nonce",
      namespace_verification_id: null,
      expires_at: "2026-04-13T12:00:00.000Z",
      failure_reason: null,
    }, new Date("2026-04-11T12:00:00.000Z"));

    assert.equal(mapped.importStatus, "txt_challenge_ready");
    assert.equal(mapped.expiryDaysRemaining, 2);
    assert.equal(mapped.txtChallenge, "pirate-verify=nonce");
  });

  test("mapNamespaceInspectionToUiState preserves spaces challenge sessions as inspected", () => {
    const mapped = mapNamespaceInspectionToUiState({
      status: "challenge_pending",
      challenge_kind: "schnorr_sign",
      challenge_payload: {
        message: "pirate-spaces-verification:kanye:session:nonce",
        digest: "abc123",
      },
      challenge_txt_value: null,
      namespace_verification_id: null,
      expires_at: "2026-04-12T12:00:00.000Z",
      failure_reason: null,
    }, new Date("2026-04-11T12:00:00.000Z"));

    assert.equal(mapped.importStatus, "inspected");
    assert.equal(mapped.txtChallenge, undefined);
    assert.equal(mapped.expiryDaysRemaining, 1);
  });

  test("mapNamespaceCompletionToUiState returns txt challenge ready for retryable completion states", () => {
    assert.deepEqual(mapNamespaceCompletionToUiState({
      status: "challenge_pending",
      challenge_kind: "dns_txt",
      namespace_verification_id: null,
      failure_reason: "challenge_not_published",
    }), {
      importStatus: "txt_challenge_ready",
      namespaceVerificationId: null,
      failureReason: "challenge_not_published",
    });
  });

  test("mapNamespaceCompletionToUiState keeps spaces retry states on inspected", () => {
    assert.deepEqual(mapNamespaceCompletionToUiState({
      status: "challenge_pending",
      challenge_kind: "schnorr_sign",
      namespace_verification_id: null,
      failure_reason: "challenge_not_signed",
    }), {
      importStatus: "inspected",
      namespaceVerificationId: null,
      failureReason: "challenge_not_signed",
    });
  });

  test("readSpacesChallengeState extracts message and digest", () => {
    assert.deepEqual(readSpacesChallengeState("schnorr_sign", {
      message: "pirate-spaces-verification:kanye:session:nonce",
      digest: "abc123",
      algorithm: "bip340_schnorr",
    }), {
      challengeMessage: "pirate-spaces-verification:kanye:session:nonce",
      challengeDigest: "abc123",
      challengeAlgorithm: "bip340_schnorr",
    });
  });

  test("toExpiryDaysRemaining clamps past timestamps to zero", () => {
    assert.equal(
      toExpiryDaysRemaining("2026-04-10T00:00:00.000Z", new Date("2026-04-11T00:00:00.000Z")),
      0,
    );
  });
});
