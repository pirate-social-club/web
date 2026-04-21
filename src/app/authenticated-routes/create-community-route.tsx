"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { ApiError } from "@/lib/api/client";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import type { SpacesChallengePayload } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import type {
  IdentityGateDraft,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import { FormNote } from "@/components/primitives/form-layout";
import { PageContainer } from "@/components/primitives/layout-shell";

import { DEFAULT_COMMUNITY_RULES } from "./moderation-helpers";
import { serializeIdentityGateDrafts } from "./community-gate-rule-serialization";

export function CreateCommunityPage() {
  const api = useApi();
  const session = useSession();
  const { connect } = usePiratePrivyRuntime();
  const creatorVerificationState = session?.onboarding
    ? { uniqueHumanVerified: session.onboarding.unique_human_verification_status === "verified", ageOver18Verified: false }
    : { uniqueHumanVerified: false, ageOver18Verified: false };
  const {
    startVerification: handleStartVeryVerification,
    verificationError,
  } = useVeryVerification({
    verified: creatorVerificationState.uniqueHumanVerified,
    verificationIntent: "community_creation",
  });
  const handleCreate = React.useCallback(async (input: {
    avatarFile: File | null;
    avatarRef: string | null;
    bannerFile: File | null;
    bannerRef: string | null;
    displayName: string;
    description: string | null;
    membershipMode: "open" | "request" | "gated";
    defaultAgeGatePolicy: "none" | "18_plus";
    allowAnonymousIdentity: boolean;
    anonymousIdentityScope: "community_stable" | "thread_stable" | "post_ephemeral";
    gateDrafts: IdentityGateDraft[];
  }) => {
    if (!session) {
      if (!connect) {
        throw new Error("Sign in is unavailable right now");
      }

      connect();
      return;
    }

    if (
      !creatorVerificationState.uniqueHumanVerified ||
      input.defaultAgeGatePolicy === "18_plus" && !creatorVerificationState.ageOver18Verified
    ) {
      const result = await handleStartVeryVerification();
      if (!result.started) {
        throw new Error(verificationError ?? "Could not start verification");
      }
      return;
    }

    try {
      const avatarRef = input.avatarFile ? (await api.communities.uploadMedia({ kind: "avatar", file: input.avatarFile })).media_ref : input.avatarRef;
      const bannerRef = input.bannerFile ? (await api.communities.uploadMedia({ kind: "banner", file: input.bannerFile })).media_ref : input.bannerRef;
      const gateRules = serializeIdentityGateDrafts(input.gateDrafts);

      const result = await api.communities.create({
        avatar_ref: avatarRef,
        banner_ref: bannerRef,
        display_name: input.displayName,
        description: input.description,
        membership_mode: input.membershipMode,
        default_age_gate_policy: input.defaultAgeGatePolicy,
        allow_anonymous_identity: input.allowAnonymousIdentity,
        anonymous_identity_scope: input.anonymousIdentityScope,
        handle_policy: { policy_template: "standard" },
        governance_mode: "centralized",
        gate_rules: gateRules.length > 0 ? gateRules : undefined,
        community_bootstrap: { rules: DEFAULT_COMMUNITY_RULES.map((rule) => ({ title: rule.title, body: rule.body, report_reason: rule.title })) },
      });

      rememberKnownCommunity({
        avatarSrc: result.community.avatar_ref ?? undefined,
        communityId: result.community.community_id,
        displayName: result.community.display_name ?? input.displayName,
      });
      navigate(`/c/${result.community.community_id}`);
      return { communityId: result.community.community_id };
    } catch (e: unknown) {
      const apiError = e as ApiError;
      throw new Error(apiError?.message ?? "Community creation failed");
    }
  }, [api, connect, creatorVerificationState.ageOver18Verified, creatorVerificationState.uniqueHumanVerified, handleStartVeryVerification, session, verificationError]);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6">
      <PageContainer>
        {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        <CreateCommunityComposer
          creatorVerificationState={creatorVerificationState}
          deferCreatorVerification
          onCreate={handleCreate}
        />
      </PageContainer>
    </section>
  );
}

export function toSpacesChallengePayload(value: Record<string, unknown> | null | undefined): SpacesChallengePayload | null {
  if (!value) return null;
  if (
    value.kind !== "schnorr_sign" ||
    typeof value.domain !== "string" ||
    typeof value.root_label !== "string" ||
    typeof value.root_pubkey !== "string" ||
    typeof value.nonce !== "string" ||
    typeof value.issued_at !== "string" ||
    typeof value.expires_at !== "string" ||
    typeof value.message !== "string" ||
    typeof value.digest !== "string"
  ) return null;

  return {
    kind: "schnorr_sign",
    domain: value.domain,
    root_label: value.root_label,
    root_pubkey: value.root_pubkey,
    nonce: value.nonce,
    issued_at: value.issued_at,
    expires_at: value.expires_at,
    message: value.message,
    digest: value.digest,
  };
}

export function toNamespaceSessionResult(result: {
  namespace_verification_session_id: string;
  family: "hns" | "spaces";
  submitted_root_label: string;
  challenge_host?: string | null;
  challenge_txt_value?: string | null;
  challenge_payload?: Record<string, unknown> | null;
  challenge_expires_at?: string | null;
  assertions?: { pirate_dns_authority_verified?: boolean | null } | null;
  operation_class?: "owner_managed_namespace" | "routing_only_namespace" | "pirate_delegated_namespace" | "owner_signed_updates_namespace" | null;
  setup_nameservers?: string[] | null;
  status: "draft" | "inspecting" | "dns_setup_required" | "challenge_required" | "challenge_pending" | "verifying" | "verified" | "failed" | "expired" | "disputed";
}) {
  return {
    namespaceVerificationSessionId: result.namespace_verification_session_id,
    family: result.family,
    rootLabel: result.submitted_root_label,
    challengeHost: result.challenge_host ?? null,
    challengeTxtValue: result.challenge_txt_value ?? null,
    challengePayload: toSpacesChallengePayload(result.challenge_payload),
    challengeExpiresAt: result.challenge_expires_at ?? null,
    status: result.status,
    operationClass: result.operation_class ?? null,
    pirateDnsAuthorityVerified: result.assertions?.pirate_dns_authority_verified ?? null,
    setupNameservers: result.setup_nameservers ?? null,
  };
}
