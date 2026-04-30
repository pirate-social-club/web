"use client";

import type { SpacesChallengePayload } from "@/components/compositions/verification/verify-namespace-modal/verify-namespace-modal.types";

export function toSpacesChallengePayload(value: Record<string, unknown> | null | undefined): SpacesChallengePayload | null {
  if (!value) return null;
  if (
    value.kind !== "fabric_txt_publish" ||
    typeof value.domain !== "string" ||
    typeof value.root_label !== "string" ||
    typeof value.root_pubkey !== "string" ||
    typeof value.nonce !== "string" ||
    typeof value.issued_at !== "string" ||
    typeof value.expires_at !== "string" ||
    value.txt_key !== "pirate-verify" ||
    typeof value.txt_value !== "string" ||
    typeof value.web_url !== "string" ||
    typeof value.freedom_url !== "string"
  ) return null;

  return {
    kind: "fabric_txt_publish",
    domain: value.domain,
    root_label: value.root_label,
    root_pubkey: value.root_pubkey,
    nonce: value.nonce,
    issued_at: value.issued_at,
    expires_at: value.expires_at,
    txt_key: "pirate-verify",
    txt_value: value.txt_value,
    web_url: value.web_url,
    freedom_url: value.freedom_url,
  };
}

export function toNamespaceSessionResult(result: {
  id: string;
  family: "hns" | "spaces";
  submitted_root_label: string;
  normalized_root_label?: string | null;
  challenge_host?: string | null;
  challenge_txt_value?: string | null;
  challenge_payload?: Record<string, unknown> | null;
  challenge_expires_at?: number | string | null;
  assertions?: { pirate_dns_authority_verified?: boolean | null } | null;
  operation_class?: "owner_managed_namespace" | "routing_only_namespace" | "pirate_delegated_namespace" | "owner_signed_updates_namespace" | null;
  setup_nameservers?: string[] | null;
  status: "draft" | "inspecting" | "dns_setup_required" | "challenge_required" | "challenge_pending" | "verifying" | "verified" | "failed" | "expired" | "disputed";
}) {
  const challengeExpiresAt = typeof result.challenge_expires_at === "number"
    ? new Date(result.challenge_expires_at * 1000).toISOString()
    : result.challenge_expires_at ?? null;
  return {
    namespaceVerificationSessionId: result.id,
    family: result.family,
    rootLabel: result.normalized_root_label ?? result.submitted_root_label,
    challengeHost: result.challenge_host ?? null,
    challengeTxtValue: result.challenge_txt_value ?? null,
    challengePayload: toSpacesChallengePayload(result.challenge_payload),
    challengeExpiresAt,
    status: result.status,
    operationClass: result.operation_class ?? null,
    pirateDnsAuthorityVerified: result.assertions?.pirate_dns_authority_verified ?? null,
    setupNameservers: result.setup_nameservers ?? null,
  };
}
