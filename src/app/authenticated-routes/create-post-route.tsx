"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { isApiAuthError, isApiNotFoundError } from "@/lib/api/client";
import { ContentRailShell } from "@/components/compositions/content-rail-shell/content-rail-shell";
import { PostComposer } from "@/components/compositions/post-composer/post-composer";
import { CommunitySidebar } from "@/components/compositions/community-sidebar/community-sidebar";
import { Button } from "@/components/primitives/button";

import { buildCommunitySidebar } from "./community-sidebar-helpers";
import { NotFoundPage } from "./misc-routes";
import { resolveAnonymousComposerLabel, resolvePublicIdentityLabel } from "./post-presentation";
import { getErrorMessage } from "./route-core";
import { getRouteAuthDescription, getRouteFailureDescription, getRouteIncompleteDescription, getRouteString, getRouteTitle } from "./route-status-copy";
import { AuthRequiredRouteState, FullPageSpinner, RouteLoadFailureState, StackPageShell, StatusCard } from "./route-shell";
import { useCreatePostState } from "./create-post-state";

export function CreatePostPage({ communityId }: { communityId: string }) {
  const state = useCreatePostState(communityId);
  const pageTitle = getRouteTitle("create-post") ?? "Create post";
  const backToCommunityLabel = getRouteString("create-post", "backToCommunity", "Back to community");
  const membershipRequiredTitle = getRouteString("create-post", "membershipRequiredTitle", "Join this community before posting");
  const membershipRequiredDescription = getRouteString("create-post", "membershipRequiredDescription", "Only community members can publish posts here.");

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
    return (
      <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community)} />}>
        <StackPageShell title={pageTitle} actions={<Button onClick={() => navigate(`/c/${communityId}`)} variant="secondary">{backToCommunityLabel}</Button>}>
          <StatusCard title={membershipRequiredTitle} description={membershipRequiredDescription} tone="warning" />
        </StackPageShell>
      </ContentRailShell>
    );
  }

  return (
    <ContentRailShell rail={<CommunitySidebar {...buildCommunitySidebar(state.community)} />}>
      <StackPageShell title="">
        <PostComposer
          availableTabs={["text", "link", "song"]}
          canCreateSongPost
          captionValue={state.caption}
          clubName={`c/${state.community.display_name}`}
          derivativeStep={state.derivativeStep}
          identity={{
            allowAnonymousIdentity: state.community.allow_anonymous_identity,
            allowQualifiersOnAnonymousPosts: state.community.allow_qualifiers_on_anonymous_posts ?? true,
            identityMode: state.identityMode,
            publicHandle: resolvePublicIdentityLabel(state.session?.profile) ?? "@handle",
            anonymousLabel: resolveAnonymousComposerLabel(state.community.anonymous_identity_scope),
            availableQualifiers: state.availableIdentityQualifiers,
            selectedQualifierIds: state.selectedQualifierIds,
          }}
          linkUrlValue={state.linkUrl}
          lyricsValue={state.lyrics}
          mode={state.composerMode}
          monetization={state.monetizationState}
          onCaptionValueChange={state.setCaption}
          onDerivativeStepChange={state.setDerivativeStep}
          onIdentityModeChange={state.setIdentityMode}
          onLinkUrlValueChange={state.setLinkUrl}
          onLyricsValueChange={state.setLyrics}
          onModeChange={state.setComposerMode}
          onMonetizationChange={state.setMonetizationState}
          onSelectedQualifierIdsChange={state.setSelectedQualifierIds}
          onSongChange={state.setSongState}
          onSongModeChange={state.setSongMode}
          onSubmit={() => void state.handleSubmit()}
          onTextBodyValueChange={state.setBody}
          onTitleValueChange={state.setTitle}
          song={state.songState}
          songMode={state.songMode}
          submitDisabled={state.submitState.disabled}
          submitError={state.submitState.submitError}
          submitLabel={state.composerMode === "song" && state.derivativeStep?.required ? "Publish remix" : "Post"}
          submitLoading={state.submitting}
          textBodyValue={state.body}
          titleCountLabel={`${state.title.length}/300`}
          titleValue={state.title}
        />
      </StackPageShell>
    </ContentRailShell>
  );
}
