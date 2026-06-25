"use client";

import {
  resolveAnonymousComposerDescription,
  resolveAnonymousComposerLabel,
  resolvePublicIdentityLabel,
} from "@/app/authenticated-helpers/post-presentation";
import type { useCreatePostState } from "@/app/authenticated-state/create-post-state";

type CreatePostState = ReturnType<typeof useCreatePostState>;
// The draft mapping reads community fields; the route only renders the composer
// after guarding `state.community`, so callers pass the narrowed state.
export type CreatePostStateWithCommunity = CreatePostState & {
  community: NonNullable<CreatePostState["community"]>;
};

/**
 * Pure adapter mapping create-post state to the PostComposer `draft` props.
 * Extracted from create-post-route so the wiring (notably royaltySplit) is
 * unit-testable and cannot silently regress.
 */
export function buildCreatePostComposerDraft(state: CreatePostStateWithCommunity) {
  return {
    audience: state.audience,
    captionValue: state.caption,
    charityContribution: state.charityContribution,
    charityPartner: state.charityPartner,
    derivativeStep: state.derivativeStep,
    event: state.event,
    identity: {
      authorMode: state.authorMode,
      allowAnonymousIdentity: state.community.allow_anonymous_identity,
      allowQualifiersOnAnonymousPosts:
        state.community.allow_qualifiers_on_anonymous_posts ?? true,
      agentLabel: state.availableAgent?.displayName,
      identityMode: state.identityMode,
      publicHandle: resolvePublicIdentityLabel(state.session?.profile) ?? "@handle",
      publicAvatarSrc: state.session?.profile?.avatar_ref ?? null,
      publicAvatarSeed: state.session?.profile?.id ?? null,
      anonymousLabel: state.communityStableAnonymousLabel
        ?? resolveAnonymousComposerLabel(state.community.anonymous_identity_scope),
      anonymousDescription: resolveAnonymousComposerDescription(
        state.community.anonymous_identity_scope,
      ),
      availableQualifiers: state.availableIdentityQualifiers,
      selectedQualifierIds: state.selectedQualifierIds,
    },
    imageUpload: state.imageUpload,
    imageUploadLabel: state.imageUploadLabel,
    linkUrlValue: state.linkUrl,
    linkPreview: state.linkPreview,
    live: state.liveState,
    license: state.license,
    royaltySplit: state.royaltySplit,
    lyricsValue: state.lyrics,
    mode: state.composerMode,
    monetization: state.monetizationState,
    regionalPricingPreview: state.regionalPricingPreview,
    song: state.songState,
    songMode: state.songMode,
    textBodyValue: state.body,
    titleValue: state.title,
    video: state.videoState,
  };
}

/**
 * Pure adapter mapping create-post state to the PostComposer `actions` props
 * (notably onRoyaltySplitChange).
 */
export function buildCreatePostComposerActions(state: CreatePostState) {
  return {
    onAudienceChange: state.setAudience,
    onAuthorModeChange: state.setAuthorMode,
    onCaptionValueChange: state.setCaption,
    onCharityContributionChange: state.setCharityContribution,
    onDerivativeStepChange: state.setDerivativeStep,
    onEventChange: state.setEvent,
    onIdentityModeChange: state.setIdentityMode,
    onImageUploadChange: state.setImageUpload,
    onLinkUrlValueChange: state.setLinkUrl,
    onLinkPreviewChange: state.setLinkPreview,
    onLiveChange: state.setLiveState,
    onLicenseChange: state.setLicense,
    onRoyaltySplitChange: state.onRoyaltySplitChange,
    onLyricsValueChange: state.setLyrics,
    onModeChange: state.setComposerMode,
    onMonetizationChange: state.setMonetizationState,
    onSelectedQualifierIdsChange: state.setSelectedQualifierIds,
    onSongChange: state.setSongState,
    onSongModeChange: state.setSongMode,
    onTextBodyValueChange: state.setBody,
    onTitleValueChange: state.setTitle,
    onVideoChange: state.setVideoState,
  };
}
