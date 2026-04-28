"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { PostComposer } from "@/components/compositions/posts/post-composer/post-composer";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { CommunityMembershipGatePanel } from "@/components/compositions/community/membership-gate-panel/community-membership-gate-panel";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { SelfVerificationModal } from "@/components/compositions/verification/self-verification-modal/self-verification-modal";
import { OnboardingVerificationGate } from "@/components/compositions/verification/onboarding-verification-gate/onboarding-verification-gate";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import { updateSessionUser } from "@/lib/api/session-store";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useVeryVerification } from "@/lib/verification/use-very-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { toast } from "@/components/primitives/sonner";
import { getGateFailureMessage, getSelfVerificationRequestForGates } from "@/lib/identity-gates";

import { buildCommunityPreviewSidebar } from "@/app/authenticated-helpers/community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { resolveAnonymousComposerLabel, resolvePublicIdentityLabel } from "@/app/authenticated-helpers/post-presentation";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell } from "@/app/authenticated-helpers/route-shell";
import { useCreatePostState } from "@/app/authenticated-state/create-post-state";
import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";

type CreatePostState = ReturnType<typeof useCreatePostState>;
type RouteCopy = ReturnType<typeof useRouteMessages>["copy"];

function CreatePostComposer({
  copy,
  state,
  onSubmit,
  submitLoading,
}: {
  copy: RouteCopy;
  state: CreatePostState;
  onSubmit: () => void;
  submitLoading: boolean;
}) {
  if (!state.community) {
    return null;
  }

  return (
    <PostComposer
      availableTabs={["text", "image", "video", "link", "song"]}
      canCreateSongPost
      clubName={`c/${state.community.display_name}`}
      draft={{
        audience: state.audience,
        captionValue: state.caption,
        charityContribution: state.charityContribution,
        charityPartner: state.charityPartner,
        derivativeStep: state.derivativeStep,
        identity: {
          authorMode: state.authorMode,
          allowAnonymousIdentity: state.community.allow_anonymous_identity,
          allowQualifiersOnAnonymousPosts: state.community.allow_qualifiers_on_anonymous_posts ?? true,
          agentLabel: state.availableAgent?.displayName,
          identityMode: state.identityMode,
          publicHandle: resolvePublicIdentityLabel(state.session?.profile) ?? "@handle",
          anonymousLabel: resolveAnonymousComposerLabel(state.community.anonymous_identity_scope),
          availableQualifiers: state.availableIdentityQualifiers,
          selectedQualifierIds: state.selectedQualifierIds,
        },
        imageUpload: state.imageUpload,
        imageUploadLabel: state.imageUploadLabel,
        linkUrlValue: state.linkUrl,
        license: state.license,
        lyricsValue: state.lyrics,
        mode: state.composerMode,
        monetization: state.monetizationState,
        song: state.songState,
        songMode: state.songMode,
        textBodyValue: state.body,
        titleValue: state.title,
        video: state.videoState,
      }}
      actions={{
        onAudienceChange: state.setAudience,
        onAuthorModeChange: state.setAuthorMode,
        onCaptionValueChange: state.setCaption,
        onCharityContributionChange: state.setCharityContribution,
        onDerivativeStepChange: state.setDerivativeStep,
        onIdentityModeChange: state.setIdentityMode,
        onImageUploadChange: state.setImageUpload,
        onLinkUrlValueChange: state.setLinkUrl,
        onLicenseChange: state.setLicense,
        onLyricsValueChange: state.setLyrics,
        onModeChange: state.setComposerMode,
        onMonetizationChange: state.setMonetizationState,
        onSelectedQualifierIdsChange: state.setSelectedQualifierIds,
        onSongChange: state.setSongState,
        onSongModeChange: state.setSongMode,
        onTextBodyValueChange: state.setBody,
        onTitleValueChange: state.setTitle,
        onVideoChange: state.setVideoState,
      }}
      submit={{
        disabled: state.submitState.disabled,
        error: state.submitState.submitError,
        label: state.composerMode === "song" && state.derivativeStep?.required
          ? copy.createPost.actions.publishRemix
          : copy.createPost.actions.post,
        loading: state.submitting || submitLoading,
        onSubmit: () => void onSubmit(),
      }}
    />
  );
}

export function CreatePostPage({ communityId, initialDraft }: { communityId: string; initialDraft?: Partial<import("@/app/authenticated-state/create-post-draft-state").CreatePostDraftState> }) {
  const state = useCreatePostState(communityId, initialDraft);
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const api = useApi();
  const pageTitle = copy.createPost.title;
  const backToCommunityLabel = copy.createPost.backToCommunity;
  const verifyRequiredDescription = copy.createPost.verifyRequiredDescription;

  const pendingSubmitRef = React.useRef(false);
  const latestHandleSubmitRef = React.useRef(state.handleSubmit);
  const [joinRequestModalOpen, setJoinRequestModalOpen] = React.useState(false);
  const [joinRequestSubmitting, setJoinRequestSubmitting] = React.useState(false);
  const [joinRequestError, setJoinRequestError] = React.useState<string | null>(null);

  React.useEffect(() => {
    latestHandleSubmitRef.current = state.handleSubmit;
  }, [state.handleSubmit]);

  const {
    handleModalOpenChange: handleSelfModalOpenChange,
    handleSelfQrError,
    handleSelfQrSuccess,
    selfError,
    selfLoading,
    selfModalOpen,
    selfPrompt,
    startVerification: startSelfVerification,
  } = useSelfVerification({
    completeErrorMessage: verifyRequiredDescription,
    locale,
    onVerified: async () => {
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);

      if (!pendingSubmitRef.current) return;
      pendingSubmitRef.current = false;

      if (refreshedUser.verification_capabilities.unique_human.state !== "verified") {
        throw new Error("Verify human status before posting.");
      }

      await latestHandleSubmitRef.current();
    },
    startErrorMessage: verifyRequiredDescription,
    storageKey: "pirate_pending_self_create_post",
    verificationIntent: "profile_verification",
  });

  const {
    startVerification: startVeryPostVerification,
    verificationError: veryPostVerificationError,
    verificationLoading: veryPostVerificationLoading,
    verificationState: veryPostVerificationState,
  } = useVeryVerification({
    verified: state.session?.user.verification_capabilities.unique_human.state === "verified",
    verificationIntent: "profile_verification",
    onVerified: async () => {
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);

      if (!pendingSubmitRef.current) return;
      pendingSubmitRef.current = false;

      if (refreshedUser.verification_capabilities.unique_human.state !== "verified") {
        throw new Error("Verify human status before posting.");
      }

      await latestHandleSubmitRef.current();
    },
  });

  const {
    handleJoin,
    handleSelfModalOpenChange: handleJoinSelfModalOpenChange,
    handleSelfQrError: handleJoinSelfQrError,
    handleSelfQrSuccess: handleJoinSelfQrSuccess,
    joinError,
    joinLoading,
    joinRequested,
    veryLoading: joinVeryLoading,
    selfError: joinSelfError,
    selfLoading: joinSelfLoading,
    selfModalOpen: joinSelfModalOpen,
    selfPrompt: joinSelfPrompt,
  } = useCommunityJoinVerification({
    communityId,
    eligibility: state.eligibility,
    locale,
    refetchEligibility: state.refetchEligibility,
  });

  const handleJoinRequestModalOpenChange = React.useCallback((open: boolean) => {
    setJoinRequestModalOpen(open);
    if (open) {
      setJoinRequestError(null);
    }
  }, []);

  const handlePrimaryJoinAction = React.useCallback(async () => {
    if (state.eligibility?.status === "requestable") {
      setJoinRequestError(null);
      setJoinRequestModalOpen(true);
      return;
    }
    await handleJoin();
  }, [handleJoin, state.eligibility?.status]);

  const handleJoinRequestSubmit = React.useCallback(async (note: string) => {
    setJoinRequestSubmitting(true);
    setJoinRequestError(null);
    try {
      const result = await handleJoin({ note });
      if (result === "requested" || result === "joined") {
        setJoinRequestModalOpen(false);
      } else if (result === "failed") {
        setJoinRequestError("Could not submit your request. Try again.");
      }
    } finally {
      setJoinRequestSubmitting(false);
    }
  }, [handleJoin]);

  React.useEffect(() => {
    if (selfError) {
      toast.error(selfError, { id: "create-post-verification-error" });
    }
  }, [selfError]);

  React.useEffect(() => {
    if (veryPostVerificationError) {
      toast.error(veryPostVerificationError, { id: "create-post-verification-error" });
    }
  }, [veryPostVerificationError]);

  const uniqueHumanVerified =
    state.session?.user.verification_capabilities.unique_human.state === "verified";

  const handleSubmit = React.useCallback(async () => {
    const selfVerificationRequest = getSelfVerificationRequestForGates({
      gates: state.community?.membership_gate_summaries ?? [],
      includeUniqueHuman: true,
      verificationCapabilities: state.session?.user.verification_capabilities,
    });

    if (!uniqueHumanVerified) {
      pendingSubmitRef.current = true;
      const result = await startVeryPostVerification();
      if (!result.started) pendingSubmitRef.current = false;
      return;
    }

    if (
      selfVerificationRequest.requestedCapabilities.length > 0
      || selfVerificationRequest.verificationRequirements.length > 0
    ) {
      pendingSubmitRef.current = true;
      const result = await startSelfVerification({
        requestedCapabilities: selfVerificationRequest.requestedCapabilities,
        unavailableMessage: verifyRequiredDescription,
        verificationRequirements: selfVerificationRequest.verificationRequirements,
      });
      if (!result.started) pendingSubmitRef.current = false;
      return;
    }

    await state.handleSubmit();
  }, [startSelfVerification, startVeryPostVerification, state.community?.membership_gate_summaries, state.handleSubmit, state.session?.user.verification_capabilities, uniqueHumanVerified, verifyRequiredDescription]);

  if (state.loading) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <FullPageSpinner />
          </section>
        </div>
      );
    }
    return <FullPageSpinner />;
  }

  if (state.loadError) {
    if (isApiAuthError(state.loadError)) {
      if (isMobile) {
        return (
          <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
            <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
            <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
              <AuthRequiredRouteState description={copy.routeStatus.createPost.auth} title="" />
            </section>
          </div>
        );
      }
      return <AuthRequiredRouteState description={copy.routeStatus.createPost.auth} title={pageTitle} />;
    }
    if (isApiNotFoundError(state.loadError)) {
      if (isMobile) {
        return (
          <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
            <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
            <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
              <NotFoundPage path={`/c/${communityId}/submit`} />
            </section>
          </div>
        );
      }
      return <NotFoundPage path={`/c/${communityId}/submit`} />;
    }
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <RouteLoadFailureState description={getErrorMessage(state.loadError, copy.routeStatus.createPost.failure)} title="" />
          </section>
        </div>
      );
    }
    return <RouteLoadFailureState description={getErrorMessage(state.loadError, copy.routeStatus.createPost.failure)} title={pageTitle} />;
  }

  if (!state.community || !state.eligibility) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <RouteLoadFailureState description={copy.routeStatus.createPost.incomplete} title="" />
          </section>
        </div>
      );
    }
    return <RouteLoadFailureState description={copy.routeStatus.createPost.incomplete} title={pageTitle} />;
  }

  if (state.eligibility.status !== "already_joined") {
    const joinPanel = (
      <CommunityMembershipGatePanel
        eligibility={state.eligibility}
        gates={state.eligibility.membership_gate_summaries}
        joinError={joinError ?? (state.eligibility.status === "gate_failed" && state.eligibility.failure_reason
          ? getGateFailureMessage(state.eligibility, { locale })
          : null)}
        joinLoading={joinLoading}
        joinRequested={joinRequested}
        verificationError={joinSelfError}
        verificationLoading={joinSelfLoading}
        onJoin={handlePrimaryJoinAction}
      />
    );
    const joinRequestModal = (
      <CommunityJoinRequestModal
        communityName={state.community.display_name}
        error={joinRequestError}
        onOpenChange={handleJoinRequestModalOpenChange}
        onSubmit={handleJoinRequestSubmit}
        open={joinRequestModalOpen}
        submitting={joinRequestSubmitting || joinLoading}
      />
    );
    const joinSelfVerificationModal = joinSelfPrompt ? (
      <SelfVerificationModal
        actionLabel={joinSelfPrompt.actionLabel}
        description={joinSelfPrompt.description}
        error={joinSelfError}
        href={joinSelfPrompt.href}
        onOpenChange={handleJoinSelfModalOpenChange}
        onQrError={handleJoinSelfQrError}
        onQrSuccess={handleJoinSelfQrSuccess}
        open={joinSelfModalOpen}
        selfApp={joinSelfPrompt.selfApp}
        title={joinSelfPrompt.title}
      />
    ) : null;
    const joinRequiresVeryVerification =
      state.eligibility.status === "verification_required"
      && state.eligibility.suggested_verification_provider === "very";

    if (isMobile && joinRequiresVeryVerification) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col justify-start px-4 pb-32 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <OnboardingVerificationGate
              onVerify={() => void handlePrimaryJoinAction()}
              verificationError={joinError}
              verificationLoading={joinLoading || joinVeryLoading}
              verificationState={(joinLoading || joinVeryLoading) ? "pending" : "not_started"}
            />
          </section>
          {joinRequestModal}
        </div>
      );
    }

    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+5rem)]">
            {joinPanel}
          </section>
          {joinRequestModal}
          {joinSelfVerificationModal}
        </div>
      );
    }

    return (
      <>
        <ContentRailShell rail={<CommunitySidebar {...buildCommunityPreviewSidebar(state.community, locale)} />}>
          <StackPageShell title={pageTitle} actions={<Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">{backToCommunityLabel}</Button>}>
            {joinPanel}
          </StackPageShell>
        </ContentRailShell>
        {joinRequestModal}
        {joinSelfVerificationModal}
      </>
    );
  }

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
    if (!uniqueHumanVerified) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col justify-start px-4 pb-32 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <OnboardingVerificationGate
              onVerify={() => {
                pendingSubmitRef.current = true;
                void startVeryPostVerification().then((result) => {
                  if (!result.started) pendingSubmitRef.current = false;
                });
              }}
              verificationError={veryPostVerificationError}
              verificationLoading={veryPostVerificationLoading}
              verificationState={veryPostVerificationState === "pending" ? "pending" : "not_started"}
            />
          </section>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col px-4 pb-36 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <CreatePostComposer copy={copy} state={state} onSubmit={handleSubmit} submitLoading={selfLoading} />
        </section>
        {selfVerificationModal}
      </div>
    );
  }

  return (
    <>
      <ContentRailShell rail={<CommunitySidebar {...buildCommunityPreviewSidebar(state.community, locale)} />}>
        <StackPageShell title="">
          <CreatePostComposer copy={copy} state={state} onSubmit={handleSubmit} submitLoading={selfLoading} />
        </StackPageShell>
      </ContentRailShell>
      {selfVerificationModal}
    </>
  );
}
