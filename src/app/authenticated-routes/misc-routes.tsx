"use client";

import * as React from "react";

import { navigate } from "@/app/router";
import { AdCreator } from "@/components/compositions/ads/ad-creator/ad-creator";
import { CrosspostComposer } from "@/components/compositions/posts/crosspost-composer/crosspost-composer";
import type { CrosspostTargetCommunity } from "@/components/compositions/posts/crosspost-composer/crosspost-composer.types";
import type { CommunityPickerItem } from "@/components/compositions/posts/post-composer/post-composer.types";
import { PostComposer } from "@/components/compositions/posts/post-composer/post-composer";
import { isValidHttpUrl } from "@/components/compositions/posts/post-composer/post-composer-utils";
import { MobilePageHeader } from "@/components/compositions/app/app-shell-chrome/mobile-page-header";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { toast } from "@/components/primitives/sonner";
import { Type } from "@/components/primitives/type";
import { useIsMobile } from "@/hooks/use-mobile";
import { useApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useRecentCommunities } from "@/lib/owned-communities";
import { forgetKnownCommunity } from "@/lib/known-communities-store";

import { useRouteMessages } from "@/hooks/use-route-messages";
import { NotFoundRouteState } from "@/app/authenticated-helpers/route-shell";
import { useCreatePostDraftState, type CreatePostDraftState } from "@/app/authenticated-state/create-post-draft-state";

export function resolveGlobalCreatePostCanContinue(state: CreatePostDraftState) {
  if (state.composerMode === "song") {
    return Boolean(state.songState.primaryAudioUpload && state.songState.title?.trim() && state.lyrics.trim());
  }
  if (state.composerMode === "link") {
    return isValidHttpUrl(state.linkUrl);
  }
  if (state.composerMode === "image") {
    return state.title.trim().length > 0 && Boolean(state.imageUpload);
  }
  if (state.composerMode === "video") {
    return state.title.trim().length > 0 && Boolean(state.videoState.primaryVideoUpload);
  }
  return state.title.trim().length > 0 && state.body.trim().length > 0;
}

export function NotFoundPage({
  path,
  title,
  description,
}: {
  path: string;
  title?: string;
  description?: string;
}) {
  return <NotFoundRouteState description={description} path={path} title={title} />;
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

  const handleSelectCommunity = React.useCallback((communityId: string) => {
    setSelectedCommunityId(communityId);
  }, []);
  const canContinue = resolveGlobalCreatePostCanContinue(state);
  const handleGlobalSubmit = React.useCallback(() => {
    if (!canContinue) return;
    toast.error(copy.common.chooseCommunity, { id: "create-post-global-community-required" });
  }, [canContinue, copy.common.chooseCommunity]);

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
        <section className="flex min-w-0 flex-1 flex-col p-4 pt-[calc(env(safe-area-inset-top)+5rem)]">
          <PostComposer
            availableTabs={["text", "image", "video", "link", "song"]}
            canCreateSongPost
            clubName={copy.common.chooseCommunity}
            communityPickerEmptyLabel={copy.common.noRecentCommunities}
            communityPickerItems={pickerItems}
            draft={composerDraft}
            actions={composerActions}
            onSelectCommunity={handleSelectCommunity}
            submit={{
              canContinue,
              canPost: canContinue,
              loading: false,
              label: copy.createPost.actions.post,
              onSubmit: handleGlobalSubmit,
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
        onSelectCommunity={handleSelectCommunity}
        submit={{
          canContinue,
          canPost: canContinue,
          loading: false,
          label: copy.createPost.actions.post,
          onSubmit: handleGlobalSubmit,
        }}
      />
    </PageContainer>
  );
}

export function CrosspostPage({ postId }: { postId: string }) {
  const api = useApi();
  const recentCommunities = useRecentCommunities();
  const [source, setSource] = React.useState<Awaited<ReturnType<typeof api.publicPosts.get>> | null>(null);
  const [sourceCommunityLabel, setSourceCommunityLabel] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = React.useState<CrosspostTargetCommunity | null>(null);
  const [communitySearchQuery, setCommunitySearchQuery] = React.useState("");
  const [communitySearchResults, setCommunitySearchResults] = React.useState<CrosspostTargetCommunity[]>([]);
  const [postableRecentCommunityIds, setPostableRecentCommunityIds] = React.useState<Set<string> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");

  const recentCommunityItems = React.useMemo<CrosspostTargetCommunity[]>(
    () => {
      if (!postableRecentCommunityIds) return [];
      return recentCommunities
        .filter((community) => postableRecentCommunityIds.has(community.communityId))
        .map((community) => ({
          avatarSrc: community.avatarSrc,
          communityId: community.communityId,
          displayName: community.displayName,
          status: "ready",
        }));
    },
    [postableRecentCommunityIds, recentCommunities],
  );
  const communityPickerItems = React.useMemo<CrosspostTargetCommunity[]>(() => {
    const seen = new Set<string>();
    return [...recentCommunityItems, ...communitySearchResults].filter((community) => {
      if (seen.has(community.communityId)) return false;
      seen.add(community.communityId);
      return true;
    });
  }, [communitySearchResults, recentCommunityItems]);

  React.useEffect(() => {
    if (recentCommunities.length === 0) {
      setPostableRecentCommunityIds(new Set());
      return;
    }

    let cancelled = false;
    setPostableRecentCommunityIds(null);

    void Promise.all(recentCommunities.map(async (community) => {
      const eligibility = await api.communities.getJoinEligibility(community.communityId).catch(() => null);
      return eligibility?.status === "already_joined" ? community.communityId : null;
    })).then((communityIds) => {
      if (cancelled) return;
      setPostableRecentCommunityIds(new Set(communityIds.filter((communityId): communityId is string => Boolean(communityId))));
    });

    return () => {
      cancelled = true;
    };
  }, [api, recentCommunities]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setSource(null);
    setSourceCommunityLabel(null);

    void (async () => {
      try {
        const response = await api.publicPosts.get(postId);
        if (cancelled) return;
        setSource(response);
        setTitle(response.post.title?.trim() || "Crosspost");
        const community = await api.publicCommunities.get(response.post.community).catch(() => null);
        if (cancelled) return;
        setSourceCommunityLabel(community ? `c/${community.display_name}` : `c/${response.post.community}`);
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, "Could not load source post."));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, postId]);

  React.useEffect(() => {
    const query = communitySearchQuery.trim();
    if (query.length < 2) {
      setCommunitySearchResults([]);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        const result = await api.publicCommunities.search(query, { limit: 10 }).catch(() => null);
        if (cancelled) return;
        const postableCommunities: Array<CrosspostTargetCommunity | null> = await Promise.all((result?.communities ?? []).map(async (community) => {
          const eligibility = await api.communities.getJoinEligibility(community.community).catch(() => null);
          if (eligibility?.status !== "already_joined") return null;
          return {
            communityId: community.community,
            displayName: community.display_name,
            status: "ready",
          } satisfies CrosspostTargetCommunity;
        }));
        if (cancelled) return;
        setCommunitySearchResults(postableCommunities.filter((community): community is CrosspostTargetCommunity => Boolean(community)));
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [api, communitySearchQuery]);

  React.useEffect(() => {
    setSelectedCommunity((current) => {
      if (current && communityPickerItems.some((community) => community.communityId === current.communityId)) {
        return current;
      }
      return communityPickerItems[0] ?? null;
    });
  }, [communityPickerItems]);

  const handleSelectCommunity = React.useCallback((communityId: string) => {
    setSelectedCommunity(
      communityPickerItems.find((community) => community.communityId === communityId) ?? null,
    );
  }, [communityPickerItems]);

  const sourcePost = source?.post ?? null;
  const sourceIsCrosspost = sourcePost?.post_type === "crosspost";
  const sourcePostType = sourcePost?.post_type === "text"
    || sourcePost?.post_type === "image"
    || sourcePost?.post_type === "video"
    || sourcePost?.post_type === "link"
    || sourcePost?.post_type === "song"
    ? sourcePost.post_type
    : undefined;
  const sourceThumbnailSrc = sourcePost?.post_type === "image"
    ? sourcePost.media_refs?.[0]?.storage_ref ?? undefined
    : sourcePost?.post_type === "video"
    ? sourcePost.media_refs?.[0]?.poster_ref ?? undefined
    : sourcePost?.post_type === "link"
    ? sourcePost.link_og_image_url ?? undefined
    : sourcePost?.post_type === "song"
    ? source?.song_presentation?.cover_art_ref ?? undefined
    : undefined;
  const canSubmit = Boolean(sourcePost && selectedCommunity?.status === "ready" && title.trim()) && !sourceIsCrosspost;

  const handleSubmit = React.useCallback(async () => {
    if (!sourcePost || !selectedCommunity || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.communities.createPost(selectedCommunity.communityId, {
        idempotency_key: crypto.randomUUID(),
        post_type: "crosspost",
        title: title.trim(),
        source_post: sourcePost.id,
        source_community: sourcePost.community,
        translation_policy: "machine_allowed",
      });
      navigate(`/p/${result.id}`);
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Could not crosspost."));
    } finally {
      setSubmitting(false);
    }
  }, [api, canSubmit, selectedCommunity, sourcePost, title]);

  if (loadError) {
    return <NotFoundRouteState description={loadError} path={`/p/${postId}/crosspost`} title="Crosspost unavailable" />;
  }

  if (!sourcePost) {
    return (
      <PageContainer className="min-w-0" size="rail">
        <Type as="p" variant="body" className="py-8 text-muted-foreground">
          Loading crosspost...
        </Type>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="min-w-0" size="rail">
      <CrosspostComposer
        communityPickerEmptyLabel={postableRecentCommunityIds ? "No communities you can post to." : "Checking posting access..."}
        communityPickerItems={communityPickerItems}
        onCommunitySearchQueryChange={setCommunitySearchQuery}
        onSelectCommunity={handleSelectCommunity}
        onTitleValueChange={setTitle}
        selectedCommunity={selectedCommunity}
        source={{
          status: sourceIsCrosspost ? "unavailable" : "available",
          communityLabel: sourceCommunityLabel ?? sourcePost.community,
          postHref: `/p/${sourcePost.id}`,
          postType: sourcePostType,
          thumbnailAlt: sourcePost.title ?? undefined,
          thumbnailSrc: sourceThumbnailSrc,
          title: sourcePost.title ?? "Untitled source post",
        }}
        submit={{
          disabled: !canSubmit || submitting,
          error: sourceIsCrosspost ? "Crossposting a crosspost is not supported." : submitError,
          label: "Post",
          loading: submitting,
          onSubmit: handleSubmit,
        }}
        titleValue={title}
      />
    </PageContainer>
  );
}

export function AdvertisePage() {
  return <AdCreator />;
}
