"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { ContentRailShell } from "@/components/compositions/app/content-rail-shell/content-rail-shell";
import { PostComposer } from "@/components/compositions/posts/post-composer/post-composer";
import type { ComposerStep } from "@/components/compositions/posts/post-composer/post-composer.types";
import {
  canAdvanceComposerWriteStep,
  getNextComposerStep,
  getPreviousComposerStep,
} from "@/components/compositions/posts/post-composer/post-composer-utils";
import { CommunitySidebar } from "@/components/compositions/community/sidebar/community-sidebar";
import { CommunityJoinRequestModal } from "@/components/compositions/community/join-request-modal/community-join-request-modal";
import { CommunityMembershipGatePanel } from "@/components/compositions/community/membership-gate-panel/community-membership-gate-panel";
import { MobileRouteShell } from "@/components/compositions/app/mobile-route-shell/mobile-route-shell";
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
import {
  getGateFailureMessage,
  getSelfVerificationRequestForGates,
  hasSelfDocumentFactVerificationRequest,
  resolveSuggestedVerificationProvider,
} from "@/lib/identity-gates";

import { buildCommunityPreviewSidebar } from "@/app/authenticated-helpers/community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import {
  resolveAnonymousComposerDescription,
  resolveAnonymousComposerLabel,
  resolvePublicIdentityLabel,
} from "@/app/authenticated-helpers/post-presentation";
import { useRouteMessages } from "@/hooks/use-route-messages";
import { getErrorMessage } from "@/lib/error-utils";
import {
  AuthRequiredRouteState,
  FullPageSpinner,
  RouteLoadFailureState,
  StackPageShell,
} from "@/app/authenticated-helpers/route-shell";
import { useCreatePostState } from "@/app/authenticated-state/create-post-state";
import { useCommunityJoinVerification } from "@/app/authenticated-state/use-community-join-verification";
import { useKnownCommunities } from "@/lib/known-communities-store";
import type { CommunityPickerItem } from "@/components/compositions/posts/post-composer/post-composer.types";

type CreatePostState = ReturnType<typeof useCreatePostState>;
type RouteCopy = ReturnType<typeof useRouteMessages>["copy"];

function canAdvanceMobileComposerStep(
  current: ComposerStep,
  state: CreatePostState,
) {
  if (current === "write") {
    return canAdvanceComposerWriteStep({
      body: state.body,
      imageUploadPresent: Boolean(state.imageUpload),
      linkUrl: state.linkUrl,
      mode: state.composerMode,
      songAudioUploadPresent: Boolean(state.songState.primaryAudioUpload),
      title: state.title,
      videoUploadPresent: Boolean(state.videoState.primaryVideoUpload),
    });
  }

  if (current === "details" && state.composerMode === "song") {
    return state.lyrics.trim().length > 0;
  }

  return state.submitState.canContinue;
}

function mobileComposerTitle(current: ComposerStep) {
  if (current === "publish") return "Preview Post";
  return "";
}

function CreatePostComposer({
  copy,
  state,
  onSubmit,
  submitLoading,
  composerStep,
  onComposerStepChange,
}: {
  copy: RouteCopy;
  state: CreatePostState;
  onSubmit: () => void;
  submitLoading: boolean;
  composerStep?: ComposerStep;
  onComposerStepChange?: (step: ComposerStep) => void;
}) {
  const knownCommunities = useKnownCommunities();

  if (!state.community) {
    return null;
  }

  const communityPickerItems: CommunityPickerItem[] = React.useMemo(
    () =>
      knownCommunities.map((c) => ({
        communityId: c.communityId,
        displayName: c.displayName,
        avatarSrc: c.avatarSrc,
      })),
    [knownCommunities],
  );

  return (
    <PostComposer
      availableTabs={["text", "image", "video", "link", "song"]}
      canCreateSongPost
      clubAvatarSrc={state.community.avatar_ref ?? undefined}
      clubName={`c/${state.community.display_name}`}
      communityPickerItems={communityPickerItems}
      composerStep={composerStep}
      onComposerStepChange={onComposerStepChange}
      onSelectCommunity={(selectedCommunityId) => {
        navigate(`/c/${selectedCommunityId}/submit`);
      }}
      draft={{
        audience: state.audience,
        captionValue: state.caption,
        charityContribution: state.charityContribution,
        charityPartner: state.charityPartner,
        derivativeStep: state.derivativeStep,
        identity: {
          authorMode: state.authorMode,
          allowAnonymousIdentity: state.community.allow_anonymous_identity,
          allowQualifiersOnAnonymousPosts:
            state.community.allow_qualifiers_on_anonymous_posts ?? true,
          agentLabel: state.availableAgent?.displayName,
          identityMode: state.identityMode,
          publicHandle:
            resolvePublicIdentityLabel(state.session?.profile) ?? "@handle",
          publicAvatarSrc: state.session?.profile?.avatar_ref ?? null,
          publicAvatarSeed: state.session?.profile?.id ?? null,
          anonymousLabel: state.communityStableAnonymousLabel
            ?? resolveAnonymousComposerLabel(
              state.community.anonymous_identity_scope,
            ),
          anonymousDescription: resolveAnonymousComposerDescription(
            state.community.anonymous_identity_scope,
          ),
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
        canContinue: state.submitState.canContinue,
        canPost: state.submitState.canPost,
        error: state.submitState.submitError,
        label:
          state.composerMode === "song" && state.derivativeStep?.required
            ? copy.createPost.actions.publishRemix
            : copy.createPost.actions.post,
        loading: state.submitting || submitLoading,
        onSubmit: () => void onSubmit(),
      }}
    />
  );
}

export function CreatePostPage({
  communityId,
  initialDraft,
  onCommunityNotFound,
}: {
  communityId: string;
  initialDraft?: Partial<
    import("@/app/authenticated-state/create-post-draft-state").CreatePostDraftState
  >;
  onCommunityNotFound?: () => void;
}) {
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
  const [mobileComposerStep, setMobileComposerStep] = React.useState<ComposerStep>("write");
  const [joinRequestModalOpen, setJoinRequestModalOpen] = React.useState(false);
  const [joinRequestSubmitting, setJoinRequestSubmitting] =
    React.useState(false);
  const [joinRequestError, setJoinRequestError] = React.useState<string | null>(
    null,
  );

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

      if (
        refreshedUser.verification_capabilities.unique_human.state !==
        "verified"
      ) {
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
    verified:
      state.session?.user.verification_capabilities.unique_human.state ===
      "verified",
    verificationIntent: "profile_verification",
    onVerified: async () => {
      const refreshedUser = await api.users.getMe();
      updateSessionUser(refreshedUser);

      if (!pendingSubmitRef.current) return;
      pendingSubmitRef.current = false;

      if (
        refreshedUser.verification_capabilities.unique_human.state !==
        "verified"
      ) {
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
    passportLoading,
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

  const handleJoinRequestModalOpenChange = React.useCallback(
    (open: boolean) => {
      setJoinRequestModalOpen(open);
      if (open) {
        setJoinRequestError(null);
      }
    },
    [],
  );

  const handlePrimaryJoinAction = React.useCallback(async () => {
    if (state.eligibility?.status === "requestable") {
      setJoinRequestError(null);
      setJoinRequestModalOpen(true);
      return;
    }
    await handleJoin();
  }, [handleJoin, state.eligibility?.status]);

  const handleJoinRequestSubmit = React.useCallback(
    async (note: string) => {
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
    },
    [handleJoin],
  );

  React.useEffect(() => {
    if (selfError) {
      toast.error(selfError, { id: "create-post-verification-error" });
    }
  }, [selfError]);

  React.useEffect(() => {
    if (veryPostVerificationError) {
      toast.error(veryPostVerificationError, {
        id: "create-post-verification-error",
      });
    }
  }, [veryPostVerificationError]);

  const hasPostingAccess =
    state.isCommunityOwner || state.eligibility?.status === "already_joined";
  const uniqueHumanVerified =
    hasPostingAccess ||
    state.session?.user.verification_capabilities.unique_human.state ===
      "verified";

  const selfVerificationRequest = React.useMemo(
    () =>
      getSelfVerificationRequestForGates({
        gates: hasPostingAccess
          ? []
          : state.community?.membership_gate_summaries ?? [],
        includeUniqueHuman: true,
        verificationCapabilities: state.session?.user.verification_capabilities,
      }),
    [
      hasPostingAccess,
      state.community?.membership_gate_summaries,
      state.session?.user.verification_capabilities,
    ],
  );
  const needsSelfDocumentFactVerification =
    hasSelfDocumentFactVerificationRequest(selfVerificationRequest);

  const handleSubmit = React.useCallback(async () => {
    if (hasPostingAccess) {
      await state.handleSubmit();
      return;
    }

    if (needsSelfDocumentFactVerification) {
      pendingSubmitRef.current = true;
      const result = await startSelfVerification({
        requestedCapabilities: selfVerificationRequest.requestedCapabilities,
        unavailableMessage: verifyRequiredDescription,
        verificationRequirements:
          selfVerificationRequest.verificationRequirements,
      });
      if (!result.started) pendingSubmitRef.current = false;
      return;
    }

    if (!uniqueHumanVerified) {
      pendingSubmitRef.current = true;
      const result = await startVeryPostVerification();
      if (!result.started) pendingSubmitRef.current = false;
      return;
    }

    await state.handleSubmit();
  }, [
    needsSelfDocumentFactVerification,
    selfVerificationRequest,
    startSelfVerification,
    startVeryPostVerification,
    state.handleSubmit,
    hasPostingAccess,
    uniqueHumanVerified,
    verifyRequiredDescription,
  ]);

  if (state.loading) {
    if (isMobile) {
      return (
        <MobileRouteShell
          className="items-center justify-center"
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          <FullPageSpinner />
        </MobileRouteShell>
      );
    }
    return <FullPageSpinner />;
  }

  if (state.loadError) {
    if (isApiAuthError(state.loadError)) {
      if (isMobile) {
        return (
          <MobileRouteShell
            onCloseClick={() => navigate(`/c/${communityId}`)}
            title={pageTitle}
          >
            <AuthRequiredRouteState
              description={copy.routeStatus.createPost.auth}
              title=""
            />
          </MobileRouteShell>
        );
      }
      return (
        <AuthRequiredRouteState
          description={copy.routeStatus.createPost.auth}
          title={pageTitle}
        />
      );
    }
    if (isApiNotFoundError(state.loadError)) {
      if (onCommunityNotFound) {
        onCommunityNotFound();
        return null;
      }
      if (isMobile) {
        return (
          <MobileRouteShell
            onCloseClick={() => navigate(`/c/${communityId}`)}
            title={pageTitle}
          >
            <NotFoundPage path={`/c/${communityId}/submit`} />
          </MobileRouteShell>
        );
      }
      return <NotFoundPage path={`/c/${communityId}/submit`} />;
    }
    if (isMobile) {
      return (
        <MobileRouteShell
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          <RouteLoadFailureState
            description={getErrorMessage(
              state.loadError,
              copy.routeStatus.createPost.failure,
            )}
            title=""
          />
        </MobileRouteShell>
      );
    }
    return (
      <RouteLoadFailureState
        description={getErrorMessage(
          state.loadError,
          copy.routeStatus.createPost.failure,
        )}
        title={pageTitle}
      />
    );
  }

  if (!state.community || !state.eligibility) {
    if (isMobile) {
      return (
        <MobileRouteShell
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          <RouteLoadFailureState
            description={copy.routeStatus.createPost.incomplete}
            title=""
          />
        </MobileRouteShell>
      );
    }
    return (
      <RouteLoadFailureState
        description={copy.routeStatus.createPost.incomplete}
        title={pageTitle}
      />
    );
  }

  if (
    state.eligibility.status !== "already_joined" &&
    !state.isCommunityOwner
  ) {
    const joinPanel = (
      <CommunityMembershipGatePanel
        eligibility={state.eligibility}
        gates={state.eligibility.membership_gate_summaries}
        joinError={
          joinError ??
          (state.eligibility.status === "gate_failed" &&
          state.eligibility.failure_reason
            ? getGateFailureMessage(state.eligibility, { locale })
            : null)
        }
        joinLoading={joinLoading}
        joinRequested={joinRequested}
        locale={locale}
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
      state.eligibility.status === "verification_required" &&
      resolveSuggestedVerificationProvider(state.eligibility) === "very";

    if (isMobile && joinRequiresVeryVerification) {
      return (
        <MobileRouteShell
          className="justify-start pb-32"
          footer={joinRequestModal}
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          <OnboardingVerificationGate
            onVerify={() => void handlePrimaryJoinAction()}
            verificationError={joinError}
            verificationLoading={joinLoading || joinVeryLoading}
            verificationState={
              joinLoading || joinVeryLoading ? "pending" : "not_started"
            }
          />
        </MobileRouteShell>
      );
    }

    if (isMobile) {
      return (
        <MobileRouteShell
          className="gap-4 pb-8"
          footer={
            <>
              {joinRequestModal}
              {joinSelfVerificationModal}
            </>
          }
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          {joinPanel}
        </MobileRouteShell>
      );
    }

    return (
      <>
        <ContentRailShell
          rail={
            <CommunitySidebar
              {...buildCommunityPreviewSidebar(state.community, locale)}
            />
          }
        >
          <StackPageShell
            title={pageTitle}
            actions={
              <Button
                onClick={() => navigate(`/c/${communityId}`)}
                variant="secondary"
              >
                {backToCommunityLabel}
              </Button>
            }
          >
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
    if (!uniqueHumanVerified && !needsSelfDocumentFactVerification) {
      return (
        <MobileRouteShell
          className="justify-start pb-32"
          onCloseClick={() => navigate(`/c/${communityId}`)}
          title={pageTitle}
        >
          <OnboardingVerificationGate
            onVerify={() => {
              pendingSubmitRef.current = true;
              void startVeryPostVerification().then((result) => {
                if (!result.started) pendingSubmitRef.current = false;
              });
            }}
            verificationError={veryPostVerificationError}
            verificationLoading={veryPostVerificationLoading}
            verificationState={
              veryPostVerificationState === "pending"
                ? "pending"
                : "not_started"
            }
          />
        </MobileRouteShell>
      );
    }

    return (
      <MobileRouteShell
        footer={selfVerificationModal}
        onBackClick={getPreviousComposerStep(mobileComposerStep, state.composerMode)
          ? () => setMobileComposerStep(getPreviousComposerStep(mobileComposerStep, state.composerMode) ?? "write")
          : undefined}
        onCloseClick={mobileComposerStep === "write" ? () => navigate(`/c/${communityId}`) : undefined}
        title={mobileComposerTitle(mobileComposerStep)}
        trailingAction={
          mobileComposerStep !== "publish" && state.composerMode !== "live" ? (
            <Button
              className="h-11 px-6 text-base font-semibold"
              disabled={!canAdvanceMobileComposerStep(mobileComposerStep, state)}
              onClick={() =>
                setMobileComposerStep(getNextComposerStep(mobileComposerStep, state.composerMode))
              }
            >
              {copy.createPost.actions.next}
            </Button>
          ) : null
        }
      >
        <CreatePostComposer
          copy={copy}
          state={state}
          onSubmit={handleSubmit}
          submitLoading={selfLoading}
          composerStep={mobileComposerStep}
          onComposerStepChange={setMobileComposerStep}
        />
      </MobileRouteShell>
    );
  }

  return (
    <>
      <ContentRailShell
        rail={
          <CommunitySidebar
            {...buildCommunityPreviewSidebar(state.community, locale)}
          />
        }
      >
        <StackPageShell title="">
          <CreatePostComposer
            copy={copy}
            state={state}
            onSubmit={handleSubmit}
            submitLoading={selfLoading}
          />
        </StackPageShell>
      </ContentRailShell>
      {selfVerificationModal}
    </>
  );
}
