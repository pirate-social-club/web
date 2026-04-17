import type { NamespaceVerificationCallbacks } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";

export const moderationStoryCommunityAvatar =
  "https://placehold.co/80x80/111827/f97316?text=P";
export const moderationStoryCommunityLabel = "r/testingacommunity3w45";
export const mockPirateNameservers = ["ns1.pirate.sc."];

export const mockNamespaceCallbacks: NamespaceVerificationCallbacks = {
  onStartSession: async ({ family, rootLabel }) => {
    if (family === "spaces") {
      return {
        namespaceVerificationSessionId: `nvs_${rootLabel}_spaces_stub`,
        family: "spaces",
        rootLabel,
        challengeHost: null,
        challengeTxtValue: null,
        challengePayload: {
          kind: "schnorr_sign",
          domain: "pirate.sc",
          root_label: rootLabel,
          root_pubkey: "stub_root_pubkey",
          nonce: "pirate-space-verify=stub-session-id:abc123",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          message: `pirate.space.verify\nroot=@${rootLabel}\nroot_pubkey=stub_root_pubkey\nnonce=pirate-space-verify=stub-session-id:abc123`,
          digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: "challenge_required",
        operationClass: "owner_signed_updates_namespace",
        pirateDnsAuthorityVerified: false,
        setupNameservers: null,
      };
    }

    return {
      namespaceVerificationSessionId: `nvs_${rootLabel}_hns_stub`,
      family: "hns",
      rootLabel,
      challengeHost: `_pirate.${rootLabel}`,
      challengeTxtValue: "pirate-verification=stub-session-id",
      challengePayload: null,
      challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "challenge_required",
      operationClass: "owner_managed_namespace",
      pirateDnsAuthorityVerified: false,
      setupNameservers: null,
    };
  },
  onCompleteSession: async ({ family, restartChallenge, signaturePayload }) => {
    if (restartChallenge) {
      return {
        status: "challenge_required",
        namespaceVerificationId: null,
        failureReason: null,
      };
    }

    if (family === "spaces" && signaturePayload) {
      return {
        status: "verified",
        namespaceVerificationId: "nv_spaces_verified_stub",
        failureReason: null,
      };
    }

    return {
      status: "verified",
      namespaceVerificationId: "nv_hns_verified_stub",
      failureReason: null,
    };
  },
  onGetSession: async ({ namespaceVerificationSessionId }) => {
    if (namespaceVerificationSessionId.includes("spaces")) {
      const rootLabel = namespaceVerificationSessionId
        .replace("nvs_", "")
        .replace("_spaces_stub", "");

      return {
        namespaceVerificationSessionId,
        family: "spaces",
        rootLabel,
        challengeHost: null,
        challengeTxtValue: null,
        challengePayload: {
          kind: "schnorr_sign",
          domain: "pirate.sc",
          root_label: rootLabel,
          root_pubkey: "stub_root_pubkey",
          nonce: "pirate-space-verify=stub-session-id:abc123",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          message: `pirate.space.verify\nroot=@${rootLabel}\nroot_pubkey=stub_root_pubkey\nnonce=pirate-space-verify=stub-session-id:abc123`,
          digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        },
        challengeExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: "challenge_required",
        operationClass: "owner_signed_updates_namespace",
        pirateDnsAuthorityVerified: false,
        setupNameservers: null,
      };
    }

    const rootLabel = namespaceVerificationSessionId
      .replace("nvs_", "")
      .replace("_hns_stub", "");

    return {
      namespaceVerificationSessionId,
      family: "hns",
      rootLabel,
      challengeHost: `_pirate.${rootLabel}`,
      challengeTxtValue: "pirate-verification=stub-session-id",
      challengePayload: null,
      challengeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "challenge_required",
      operationClass: "owner_managed_namespace",
      pirateDnsAuthorityVerified: false,
      setupNameservers: null,
    };
  },
};
