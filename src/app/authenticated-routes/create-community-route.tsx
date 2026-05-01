"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { useApi } from "@/lib/api";
import { updateSessionUser, useSession } from "@/lib/api/session-store";
import { usePiratePrivyRuntime } from "@/components/auth/privy-provider";
import { rememberKnownCommunity } from "@/lib/known-communities-store";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-utils";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useUiLocale } from "@/lib/ui-locale";
import type { CreateCommunityComposerProps } from "@/components/compositions/community/create-composer/create-community-composer.types";
import { CreateCommunityComposer } from "@/components/compositions/community/create-composer/create-community-composer";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { PageContainer } from "@/components/primitives/layout-shell";
import { toast } from "@/components/primitives/sonner";
import { useIsMobile } from "@/hooks/use-mobile";

import { getLocaleMessages } from "@/locales";
import { serializeIdentityGateDrafts } from "@/app/authenticated-helpers/community-gate-rule-serialization";
import { useRouteMessages } from "@/hooks/use-route-messages";

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
    const gatePolicy = input.membershipMode === "gated"
      ? serializeIdentityGateDrafts(input.gateDrafts, { mode: input.gateMatchMode })
      : null;
    const rc = getLocaleMessages(locale, "routes").moderation.rules;
    const bootstrapRules = [
      { title: rc.defaultRule1Title, body: rc.defaultRule1Body, report_reason: rc.defaultRule1Title },
      { title: rc.defaultRule2Title, body: rc.defaultRule2Body, report_reason: rc.defaultRule2Title },
    ];

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
      gate_policy: gatePolicy ?? undefined,
      community_bootstrap: { rules: bootstrapRules },
    });

    rememberKnownCommunity({
      avatarSrc: result.community.avatar_ref ?? undefined,
      communityId: result.community.id,
      displayName: result.community.display_name ?? input.displayName,
    });
    navigate(`/c/${result.community.id}`);
    return { communityId: result.community.id };
  }, [api, locale]);
  const {
    handleModalOpenChange: handleSelfModalOpenChangeBase,
    handleSelfQrError,
    handleSelfQrSuccess,
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
      throw new Error(getErrorMessage(e, "Community creation failed"));
    }
  }, [connect, createCommunityFromInput, creatorVerificationState.ageOver18Verified, session, startSelfVerification]);

  const selfVerificationModal = selfPrompt ? (
    <SelfVerificationModal
      actionLabel={selfPrompt.actionLabel}
      description={selfPrompt.description}
      error={selfError}
      href={selfPrompt.href}
      onOpenChange={handleSelfModalOpenChange}
      onQrError={handleSelfQrError}
      onQrSuccess={handleSelfQrSuccess}
      open={selfModalOpen}
      selfApp={selfPrompt.selfApp}
      title={selfPrompt.title}
    />
  ) : null;

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate("/")} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+5rem)]">
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
