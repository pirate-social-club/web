"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { MobilePageHeader } from "@/components/compositions/app-shell-chrome/mobile-page-header";
import { SelfVerificationModal } from "@/components/compositions/self-verification-modal/self-verification-modal";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import { updateSessionUser } from "@/lib/api/session-store";
import { useSelfVerification } from "@/lib/verification/use-self-verification";
import { useUiLocale } from "@/lib/ui-locale";
import { toast } from "@/components/primitives/sonner";

import { buildCommunitySidebar } from "./community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { resolveAnonymousComposerLabel, resolvePublicIdentityLabel } from "./post-presentation";
import { getErrorMessage, useRouteMessages } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell, StatusCard } from "./route-shell";
import { useCreatePostState } from "./create-post-state";

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
      availableTabs={["text", "image", "link", "song"]}
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
        lyricsValue: state.lyrics,
        mode: state.composerMode,
        monetization: state.monetizationState,
        song: state.songState,
        songMode: state.songMode,
        textBodyValue: state.body,
        titleValue: state.title,
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
        onLyricsValueChange: state.setLyrics,
        onModeChange: state.setComposerMode,
        onMonetizationChange: state.setMonetizationState,
        onSelectedQualifierIdsChange: state.setSelectedQualifierIds,
        onSongChange: state.setSongState,
        onSongModeChange: state.setSongMode,
        onTextBodyValueChange: state.setBody,
        onTitleValueChange: state.setTitle,
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

export function CreatePostPage({ communityId, initialDraft }: { communityId: string; initialDraft?: Partial<import("./create-post-draft-state").CreatePostDraftState> }) {
  const state = useCreatePostState(communityId, initialDraft);
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const api = useApi();
  const pageTitle = copy.createPost.title;
  const backToCommunityLabel = copy.createPost.backToCommunity;
  const membershipRequiredTitle = copy.createPost.membershipRequiredTitle;
  const membershipRequiredDescription = copy.createPost.membershipRequiredDescription;
  const verifyRequiredDescription = copy.createPost.verifyRequiredDescription;

  const pendingSubmitRef = React.useRef(false);
  const latestHandleSubmitRef = React.useRef(state.handleSubmit);

  React.useEffect(() => {
    latestHandleSubmitRef.current = state.handleSubmit;
  }, [state.handleSubmit]);

  const {
    handleModalOpenChange: handleSelfModalOpenChange,
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

  React.useEffect(() => {
    if (selfError) {
      toast.error(selfError, { id: "create-post-verification-error" });
    }
  }, [selfError]);

  const uniqueHumanVerified =
    state.session?.user.verification_capabilities.unique_human.state === "verified";

  const handleSubmit = React.useCallback(async () => {
    if (!uniqueHumanVerified) {
      pendingSubmitRef.current = true;
      const result = await startSelfVerification({
        requestedCapabilities: ["unique_human"],
        unavailableMessage: verifyRequiredDescription,
      });
      if (!result.started) pendingSubmitRef.current = false;
      return;
    }

    await state.handleSubmit();
  }, [uniqueHumanVerified, startSelfVerification, state.handleSubmit, verifyRequiredDescription]);

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
              <AuthRequiredRouteState description={getRouteAuthDescription("create-post")} title="" />
            </section>
          </div>
        );
      }
      return <AuthRequiredRouteState description={getRouteAuthDescription("create-post")} title={pageTitle} />;
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
            <RouteLoadFailureState description={getErrorMessage(state.loadError, getRouteFailureDescription("create-post"))} title="" />
          </section>
        </div>
      );
    }
    return <RouteLoadFailureState description={getErrorMessage(state.loadError, getRouteFailureDescription("create-post"))} title={pageTitle} />;
  }

  if (!state.community || !state.eligibility) {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <RouteLoadFailureState description={getRouteIncompleteDescription("create-post")} title="" />
          </section>
        </div>
      );
    }
    return <RouteLoadFailureState description={getRouteIncompleteDescription("create-post")} title={pageTitle} />;
  }

  if (state.eligibility.status !== "already_joined") {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <StatusCard title={membershipRequiredTitle} description={membershipRequiredDescription} tone="warning" />
          </section>
        </div>
      );
    }

    return (
      <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community, locale)} />}>
        <StackPageShell title={pageTitle} actions={<Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">{backToCommunityLabel}</Button>}>
          <StatusCard title={membershipRequiredTitle} description={membershipRequiredDescription} tone="warning" />
        </StackPageShell>
      </ContentRailShell>
    );
  }

  const selfVerificationModal = selfPrompt ? (
    <SelfVerificationModal
      actionLabel={selfPrompt.actionLabel}
      description={selfPrompt.description}
      error={selfError}
      href={selfPrompt.href}
      onOpenChange={handleSelfModalOpenChange}
      open={selfModalOpen}
      title={selfPrompt.title}
    />
  ) : null;

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col px-4 pb-24 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <CreatePostComposer copy={copy} state={state} onSubmit={handleSubmit} submitLoading={selfLoading} />
        </section>
        {selfVerificationModal}
      </div>
    );
  }

  return (
    <>
      <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community, locale)} />}>
        <StackPageShell title="">
          <CreatePostComposer copy={copy} state={state} onSubmit={handleSubmit} submitLoading={selfLoading} />
        </StackPageShell>
      </ContentRailShell>
      {selfVerificationModal}
    </>
  );
}
