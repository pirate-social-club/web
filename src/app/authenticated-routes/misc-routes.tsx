"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { AdCreator } from "@/components/compositions/ads/ad-creator/ad-creator";
import type { CommunityPickerItem } from "@/components/compositions/posts/post-composer/post-composer.types";
import { PostComposer } from "@/components/compositions/posts/post-composer/post-composer";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecentCommunities } from "@/lib/owned-communities";
import { forgetKnownCommunity } from "@/lib/known-communities-store";

import { useRouteMessages } from "@/hooks/use-route-messages";
import { NotFoundRouteState } from "@/app/authenticated-helpers/route-shell";
import { useCreatePostDraftState, type CreatePostDraftState } from "@/app/authenticated-state/create-post-draft-state";

export function NotFoundPage({ path }: { path: string }) {
  return <NotFoundRouteState path={path} />;
}

export function CreatePostGlobalPage({
  renderCreatePost,
}: {
  renderCreatePost: (communityId: string, initialDraft: Partial<CreatePostDraftState> | undefined, onCommunityNotFound: () => void) => React.ReactNode;
}) {
  const { copy } = useRouteMessages();
  const isMobile = useIsMobile();
  const knownCommunities = useRecentCommunities();
  const [selectedCommunityId, setSelectedCommunityId] = React.useState<string | null>(null);
  const { actions, state } = useCreatePostDraftState();
  const pickerItems: CommunityPickerItem[] = React.useMemo(
    () => knownCommunities.map((c) => ({
      communityId: c.communityId,
      displayName: c.displayName,
      avatarSrc: c.avatarSrc,
    })),
    [knownCommunities],
  );

  const handleCommunityNotFound = React.useCallback(() => {
    if (selectedCommunityId) {
      forgetKnownCommunity(selectedCommunityId);
    }
    setSelectedCommunityId(null);
  }, [selectedCommunityId]);

  if (selectedCommunityId) {
    return <>{renderCreatePost(selectedCommunityId, state, handleCommunityNotFound)}</>;
  }

  const composerDraft = {
    mode: state.composerMode,
    titleValue: state.title,
    textBodyValue: state.body,
    captionValue: state.caption,
    linkUrlValue: state.linkUrl,
    lyricsValue: state.lyrics,
    imageUpload: state.imageUpload,
    imageUploadLabel: state.imageUploadLabel,
    song: state.songState,
    songMode: state.songMode,
    monetization: state.monetizationState,
    charityContribution: state.charityContribution,
    derivativeStep: state.derivativeStep,
    audience: state.audience,
    identity: {
      authorMode: state.authorMode,
      identityMode: state.identityMode,
      selectedQualifierIds: state.selectedQualifierIds,
    },
  };

  const composerActions = {
    onModeChange: actions.setComposerMode,
    onTitleValueChange: actions.setTitle,
    onTextBodyValueChange: actions.setBody,
    onCaptionValueChange: actions.setCaption,
    onLinkUrlValueChange: actions.setLinkUrl,
    onLyricsValueChange: actions.setLyrics,
    onImageUploadChange: actions.setImageUpload,
    onImageUploadLabelChange: actions.setImageUploadLabel,
    onSongChange: actions.setSongState,
    onSongModeChange: actions.setSongMode,
    onMonetizationChange: actions.setMonetizationState,
    onCharityContributionChange: actions.setCharityContribution,
    onDerivativeStepChange: actions.setDerivativeStep,
    onAudienceChange: actions.setAudience,
    onIdentityModeChange: actions.setIdentityMode,
    onAuthorModeChange: actions.setAuthorMode,
    onSelectedQualifierIdsChange: actions.setSelectedQualifierIds,
  };

  if (isMobile) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground">
        <MobilePageHeader
          onCloseClick={() => navigate("/")}
          title={copy.createPost.title}
          trailingAction={(
            <Button
              className="h-11 px-2 text-base font-semibold text-primary"
              disabled
              variant="ghost"
            >
              {copy.createPost.actions.next}
            </Button>
          )}
        />
        <section className="flex min-w-0 flex-1 flex-col px-4 py-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <PostComposer
            availableTabs={["text", "image", "video", "link", "song"]}
            canCreateSongPost
            clubName={copy.common.chooseCommunity}
            communityPickerEmptyLabel={copy.common.noRecentCommunities}
            communityPickerItems={pickerItems}
            draft={composerDraft}
            actions={composerActions}
            onSelectCommunity={setSelectedCommunityId}
            submit={{
              disabled: true,
              loading: false,
              label: copy.createPost.actions.post,
              onSubmit: () => {},
            }}
          />
        </section>
      </div>
    );
  }

  return (
    <PageContainer className="min-w-0" size="rail">
      <PostComposer
        availableTabs={["text", "image", "video", "link", "song"]}
        canCreateSongPost
        clubName={copy.common.chooseCommunity}
        communityPickerEmptyLabel={copy.common.noRecentCommunities}
        communityPickerItems={pickerItems}
        draft={composerDraft}
        actions={composerActions}
        onSelectCommunity={setSelectedCommunityId}
        submit={{
          disabled: true,
          loading: false,
          label: copy.createPost.actions.post,
          onSubmit: () => {},
        }}
      />
    </PageContainer>
  );
}

export function AdvertisePage() {
  return <AdCreator />;
}
