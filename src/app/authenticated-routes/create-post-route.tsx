"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { MobilePageHeader } from "@/components/compositions/app-shell-chrome/mobile-page-header";
import { Button } from "@/components/primitives/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";

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
}: {
  copy: RouteCopy;
  state: CreatePostState;
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
        titleCountLabel: `${state.title.length}/300`,
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
        loading: state.submitting,
        onSubmit: () => void state.handleSubmit(),
      }}
    />
  );
}

export function CreatePostPage({ communityId }: { communityId: string }) {
  const state = useCreatePostState(communityId);
  const isMobile = useIsMobile();
  const { locale } = useUiLocale();
  const { copy } = useRouteMessages();
  const pageTitle = copy.createPost.title;
  const backToCommunityLabel = copy.createPost.backToCommunity;
  const membershipRequiredTitle = copy.createPost.membershipRequiredTitle;
  const membershipRequiredDescription = copy.createPost.membershipRequiredDescription;
  const verifyRequiredTitle = copy.createPost.verifyRequiredTitle;
  const verifyRequiredDescription = copy.createPost.verifyRequiredDescription;
  const verifyAction = copy.createPost.verifyAction;

  if (state.loading) {
    return <FullPageSpinner />;
  }

  if (state.loadError) {
    if (isApiAuthError(state.loadError)) {
      return <AuthRequiredRouteState description={getRouteAuthDescription("create-post")} title={pageTitle} />;
    }
    if (isApiNotFoundError(state.loadError)) {
      return <NotFoundPage path={`/c/${communityId}/submit`} />;
    }
    return <RouteLoadFailureState description={getErrorMessage(state.loadError, getRouteFailureDescription("create-post"))} title={pageTitle} />;
  }

  if (!state.community || !state.eligibility) {
    return <RouteLoadFailureState description={getRouteIncompleteDescription("create-post")} title={pageTitle} />;
  }

  if (state.eligibility.status !== "already_joined") {
    if (isMobile) {
      return (
        <div className="min-h-screen w-full bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
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

  if (state.session?.onboarding.unique_human_verification_status !== "verified") {
    const actions = <Button onClick={() => navigate("/onboarding")}>{verifyAction}</Button>;

    if (isMobile) {
      return (
        <div className="min-h-screen w-full bg-background text-foreground">
          <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
          <section className="flex min-w-0 flex-1 flex-col px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
            <StatusCard title={verifyRequiredTitle} description={verifyRequiredDescription} tone="warning" actions={actions} />
          </section>
        </div>
      );
    }

    return (
      <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community, locale)} />}>
        <StackPageShell title={pageTitle} actions={<Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">{backToCommunityLabel}</Button>}>
          <StatusCard title={verifyRequiredTitle} description={verifyRequiredDescription} tone="warning" actions={actions} />
        </StackPageShell>
      </ContentRailShell>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader onCloseClick={() => navigate(`/c/${communityId}`)} title={pageTitle} />
        <section className="flex min-w-0 flex-1 flex-col px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <CreatePostComposer copy={copy} state={state} />
        </section>
      </div>
    );
  }

  return (
    <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community, locale)} />}>
      <StackPageShell title="">
        <CreatePostComposer copy={copy} state={state} />
      </StackPageShell>
    </ContentRailShell>
  );
}
