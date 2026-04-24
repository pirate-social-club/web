"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/lib/auth/privy-provider";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { getApiErrorMessage } from "@/lib/api/client";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useUiLocale } from "@/lib/ui-locale";
import type { SpacesChallengePayload } from "@/components/compositions/verify-namespace-modal/verify-namespace-modal.types";
import type { CreateCommunityComposerProps } from "@/components/compositions/create-community-composer/create-community-composer.types";
import { CreateCommunityComposer } from "@/components/compositions/create-community-composer/create-community-composer";
import { MobilePageHeader } from "@/components/compositions/app-shell-chrome/mobile-page-header";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { PageContainer } from "@/components/primitives/layout-shell";
import { toast } from "@/components/primitives/sonner";
import { useIsMobile } from "@/hooks/use-mobile";

import { DEFAULT_COMMUNITY_RULES } from "./moderation-helpers";
import { serializeIdentityGateDrafts } from "./community-gate-rule-serialization";
import { useRouteMessages } from "./route-core";

type CreateCommunityInput = Parameters<NonNullable<CreateCommunityComposerProps["onCreate"]>>[0];

export function CreateCommunityPage() {
  const api = useApi();
  const session = useSession();
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { connect } = usePiratePrivyRuntime();
  const { copy } = useRouteMessages();
  const pageTitle = copy.createCommunity.title;
  const creatorVerificationState = session
    ? {
        ageOver18Verified: session.user.verification_capabilities.age_over_18.state === "verified",
      }
    : { ageOver18Verified: false };
  const pendingCreateInputRef = React.useRef<CreateCommunityInput | null>(null);
  const createCommunityFromInput = React.useCallback(async (input: CreateCommunityInput) => {
    const avatarRef = input.avatarFile ? (await api.communities.uploadMedia({ kind: "avatar", file: input.avatarFile })).media_ref : input.avatarRef;
    const bannerRef = input.bannerFile ? (await api.communities.uploadMedia({ kind: "banner", file: input.bannerFile })).media_ref : input.bannerRef;
    const gateRules = serializeIdentityGateDrafts(input.gateDrafts);

    const result = await api.communities.create({
      avatar_ref: avatarRef,
      banner_ref: bannerRef,
      display_name: input.displayName,
      database_region: input.databaseRegion,
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
  }, [api]);
  const {
    handleModalOpenChange: handleSelfModalOpenChangeBase,
    selfError,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: "Verification completion failed",
    locale,
    onVerified: async () => {
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);
      const input = pendingCreateInputRef.current;
      logger.info("[create-community] Self verification callback", {
        hasPendingInput: !!input,
        ageOver18Verified: refreshedUser.verification_capabilities.age_over_18.state,
      });
      if (!input) return;

      if (
        input.defaultAgeGatePolicy === "18_plus"
        && refreshedUser.verification_capabilities.age_over_18.state !== "verified"
      ) {
        throw new Error("Verify 18+ status before creating an 18+ community");
      }

      try {
        logger.info("[create-community] creating community after verification");
        await createCommunityFromInput(input);
      } finally {
        if (pendingCreateInputRef.current === input) {
          pendingCreateInputRef.current = null;
        }
      }
    },
    startErrorMessage: "Could not start age verification",
    storageKey: "pirate_pending_self_create_community",
    verificationIntent: "community_creation",
  });
  React.useEffect(() => {
    if (selfError) {
      toast.error(selfError, { id: "create-community-verification-error" });
    }
  }, [selfError]);

  const handleSelfModalOpenChange = React.useCallback((open: boolean) => {
    handleSelfModalOpenChangeBase(open);
    if (!open) {
      pendingCreateInputRef.current = null;
    }
  }, [handleSelfModalOpenChangeBase]);

  const handleCreate = React.useCallback(async (input: CreateCommunityInput) => {
    if (!session) {
      if (!connect) {
        throw new Error("Sign in is unavailable right now");
      }

      connect();
      return;
    }

    if (input.defaultAgeGatePolicy === "18_plus" && !creatorVerificationState.ageOver18Verified) {
      pendingCreateInputRef.current = input;
      const result = await startSelfVerification({
        requestedCapabilities: ["age_over_18"],
        unavailableMessage: "Age verification is required to create an 18+ community.",
      });
      if (!result.started && pendingCreateInputRef.current === input) {
        pendingCreateInputRef.current = null;
      }
      return;
    }

    try {
      return await createCommunityFromInput(input);
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e, "Community creation failed"));
    }
  }, [connect, createCommunityFromInput, creatorVerificationState.ageOver18Verified, session, startSelfVerification]);

  const selfVerificationModal = (
    <SelfVerificationModal
      actionLabel={selfPrompt?.actionLabel ?? copy.createCommunity.startVerification}
      description={selfPrompt?.description ?? copy.createCommunity.verifyDescription}
      error={selfError}
      href={selfPrompt?.href ?? null}
      onOpenChange={handleSelfModalOpenChange}
      open={selfModalOpen}
      title={selfPrompt?.title ?? copy.createCommunity.verifyStartTitle}
    />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate("/")} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <CreateCommunityComposer
            creatorVerificationState={creatorVerificationState}
            deferCreatorVerification
            onCreate={handleCreate}
          />
        </section>
        {selfVerificationModal}
      </div>
    );
  }

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col gap-6">
        <PageContainer size="rail">
          <CreateCommunityComposer
            creatorVerificationState={creatorVerificationState}
            deferCreatorVerification
            onCreate={handleCreate}
          />
        </PageContainer>
      </section>
      {selfVerificationModal}
    </>
  );
}

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
  namespace_verification_session_id: string;
  family: "hns" | "spaces";
  submitted_root_label: string;
  normalized_root_label?: string | null;
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
    rootLabel: result.normalized_root_label ?? result.submitted_root_label,
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
