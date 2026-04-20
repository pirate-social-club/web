"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/api/session-store";
import { getAcceptedProvidersForGateType } from "@/lib/community-gate-providers";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import type { ApiError } from "@/lib/api/client";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { VerifyNamespaceModal } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal";
import type {
  IdentityGateDraft,
  NamespaceAttachmentState,
} from "@/components/compositions/create-community-composer/create-community-composer.types";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import { FormNote } from "@/components/primitives/form-layout";
import { Button } from "@/components/primitives/button";

import { DEFAULT_COMMUNITY_RULES } from "./moderation-helpers";
import { getRouteAuthDescription } from "./route-status-copy";
import { AuthRequiredRouteState, StackPageShell, StatusCard } from "./route-shell";
import { useRouteMessages } from "./route-core";

type SpacesChallengePayload = {
  kind: "schnorr_sign";
  domain: string;
  root_label: string;
  root_pubkey: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  message: string;
  digest: string;
};

export function CreateCommunityPage() {
  const { copy } = useRouteMessages();
  const api = useApi();
  const session = useSession();
  const verifyDescription = copy.createCommunity.verifyDescription;
  const verifyPendingDescription = copy.createCommunity.verifyPendingDescription;
  const verifyPendingTitle = copy.createCommunity.verifyPendingTitle;
  const verifyStartDescription = copy.createCommunity.verifyStartDescription;
  const verifyStartTitle = copy.createCommunity.verifyStartTitle;
  const reopenVerificationLabel = copy.createCommunity.reopenVerification;
  const startVerificationLabel = copy.createCommunity.startVerification;
  const [activeNamespaceSessionId, setActiveNamespaceSessionId] = React.useState<string | null>(null);
  const [namespaceAttachment, setNamespaceAttachment] = React.useState<NamespaceAttachmentState | null>(null);
  const [namespaceModalOpen, setNamespaceModalOpen] = React.useState(false);
  const creatorVerificationState = session?.onboarding
    ? { uniqueHumanVerified: session.onboarding.unique_human_verification_status === "verified", ageOver18Verified: false }
    : { uniqueHumanVerified: false, ageOver18Verified: false };
  const {
    startVerification: handleStartVeryVerification,
    verificationError,
    verificationLoading,
    verificationState: veryVerificationState,
  } = useVeryVerification({
    verified: creatorVerificationState.uniqueHumanVerified,
    verificationIntent: "community_creation",
  });
  const namespaceVerificationCallbacks = React.useMemo(() => ({
    onStartSession: async ({ family, rootLabel }: { family: "hns" | "spaces"; rootLabel: string }) => {
      const result = await api.verification.startNamespaceSession({
        family,
        root_label: rootLabel,
      });

      setActiveNamespaceSessionId(result.namespace_verification_session_id);
      return toNamespaceSessionResult(result);
    },
    onCompleteSession: async ({
      namespaceVerificationSessionId,
      restartChallenge,
      signaturePayload,
    }: {
      namespaceVerificationSessionId: string;
      family: "hns" | "spaces";
      restartChallenge?: boolean;
      signaturePayload?: { signature: string; signer_pubkey?: string } | null;
    }) => {
      const result = await api.verification.completeNamespaceSession(namespaceVerificationSessionId, {
        restart_challenge: restartChallenge ?? null,
        signature_payload: signaturePayload ?? null,
      });

      if (result.status === "verified" && result.namespace_verification_id) {
        const verification = await api.verification.getNamespaceVerification(result.namespace_verification_id);
        setNamespaceAttachment({
          namespaceVerificationId: verification.namespace_verification_id,
          family: verification.family,
          normalizedRootLabel: verification.normalized_root_label,
        });
        setActiveNamespaceSessionId(null);
      }

      return {
        status: result.status,
        namespaceVerificationId: result.namespace_verification_id ?? null,
        failureReason: result.failure_reason ?? null,
      };
    },
    onGetSession: async ({ namespaceVerificationSessionId }: { namespaceVerificationSessionId: string }) => {
      const result = await api.verification.getNamespaceSession(namespaceVerificationSessionId);
      return toNamespaceSessionResult(result);
    },
  }), [api]);

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
    namespaceVerificationId: string | null;
  }) => {
    try {
      const avatarRef = input.avatarFile ? (await api.communities.uploadMedia({ kind: "avatar", file: input.avatarFile })).media_ref : input.avatarRef;
      const bannerRef = input.bannerFile ? (await api.communities.uploadMedia({ kind: "banner", file: input.bannerFile })).media_ref : input.bannerRef;
      const gateRules = input.gateDrafts.map((draft) => {
        if (draft.gateType === "erc721_holding") {
          return {
            scope: "membership" as const,
            gate_family: "token_holding" as const,
            gate_type: "erc721_holding" as const,
            chain_namespace: draft.chainNamespace,
            gate_config: { contract_address: draft.contractAddress.trim() },
          };
        }

        return {
          scope: "membership" as const,
          gate_family: "identity_proof" as const,
          gate_type: draft.gateType,
          proof_requirements: [{
            proof_type: draft.gateType,
            accepted_providers: getAcceptedProvidersForGateType(draft.gateType),
            config: { required_value: draft.requiredValue },
          }],
        };
      });

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
        namespace: input.namespaceVerificationId
          ? { namespace_verification_id: input.namespaceVerificationId }
          : undefined,
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
  }, [api]);

  if (!session) {
    return <AuthRequiredRouteState description={getRouteAuthDescription("create-community")} title={copy.createCommunity.title} />;
  }

  if (!creatorVerificationState.uniqueHumanVerified) {
    return (
      <StackPageShell title={copy.createCommunity.title} description={verifyDescription}>
        {verificationError ? <FormNote tone="warning">{verificationError}</FormNote> : null}
        <StatusCard
          title={veryVerificationState === "pending" ? verifyPendingTitle : verifyStartTitle}
          description={veryVerificationState === "pending" ? verifyPendingDescription : verifyStartDescription}
          tone="warning"
          actions={veryVerificationState === "not_started" ? <Button loading={verificationLoading} onClick={handleStartVeryVerification}>{startVerificationLabel}</Button> : veryVerificationState === "pending" ? <Button loading={verificationLoading} onClick={handleStartVeryVerification}>{reopenVerificationLabel}</Button> : undefined}
        />
      </StackPageShell>
    );
  }

  return (
    <>
      <VerifyNamespaceModal
        activeSessionId={activeNamespaceSessionId}
        callbacks={namespaceVerificationCallbacks}
        initialFamily={namespaceAttachment?.family}
        initialRootLabel={namespaceAttachment?.normalizedRootLabel ?? ""}
        onOpenChange={setNamespaceModalOpen}
        onSessionCleared={() => setActiveNamespaceSessionId(null)}
        onSessionStarted={setActiveNamespaceSessionId}
        onVerified={() => setNamespaceModalOpen(false)}
        open={namespaceModalOpen}
      />
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="mx-auto w-full max-w-5xl">
          <CreateCommunityComposer
            creatorVerificationState={creatorVerificationState}
            hasPendingNamespaceSession={Boolean(activeNamespaceSessionId)}
            namespaceAttachment={namespaceAttachment}
            onClearNamespace={() => {
              setNamespaceAttachment(null);
              setActiveNamespaceSessionId(null);
            }}
            onCreate={handleCreate}
            onVerifyNamespace={() => setNamespaceModalOpen(true)}
          />
        </div>
      </section>
    </>
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
