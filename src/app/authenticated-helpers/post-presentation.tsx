"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import { buildPostCardTitleProps } from "@/components/compositions/posts/post-card/post-card-content-rules";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/posts/post-card/post-card-nationality";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { toCommunityPostContent } from "@/app/authenticated-helpers/post-content-presentation";
import { toPostCardEvent } from "@/app/authenticated-helpers/post-event-presentation";
import {
  getPostCommentCount,
  resolveAgentAuthor,
  resolvePostAuthorAvatarSeed,
  resolvePostAuthorLabel,
  resolvePostQualifierLabels,
  toViewerVote,
} from "@/app/authenticated-helpers/post-identity-presentation";
import { resolveLocalizedLinkTitle, resolvePostCardHeadingTitle } from "@/app/authenticated-helpers/post-link-presentation";
import type {
  PostPresentationOptions,
  SongPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation-types";
import {
  canShowOriginalToggle,
  resolveTranslatedTextPresentation,
  withTranslationToggleProps,
} from "@/app/authenticated-helpers/post-translation-presentation";
import { buildPostShareActions } from "@/app/authenticated-helpers/post-share-actions";
import { buildPostMenu, resolvePostStoryPortalHref } from "@/app/authenticated-helpers/post-menu-presentation";

export type HomeFeedEntry = ApiHomeFeedItem;
export { toHomeFeedItem } from "@/app/authenticated-helpers/home-feed-presentation";
export type { PostVoteValue } from "@/app/authenticated-helpers/post-vote";

export { toCommunityPostContent } from "@/app/authenticated-helpers/post-content-presentation";
export {
  formatQualifierLabel,
  getPostCommentCount,
  resolveAgentAuthor,
  resolveAnonymousComposerDescription,
  resolveAnonymousComposerLabel,
  resolveCommentAuthorAvatarSeed,
  resolveCommentAuthorLabel,
  resolvePostAuthorAvatarSeed,
  resolvePostAuthorLabel,
  resolvePostQualifierLabels,
  resolvePublicAuthorFallback,
  resolvePublicIdentityLabel,
  toCommentViewerVote,
  toViewerVote,
} from "@/app/authenticated-helpers/post-identity-presentation";
export { resolveLocalizedLinkTitle } from "@/app/authenticated-helpers/post-link-presentation";
export type {
  LiveRoomPresentationOptions,
  PostPresentationOptions,
  SongPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation-types";
export {
  canShowOriginalToggle,
  resolveTranslatedTextPresentation,
  shouldShowOriginalPost,
  withTranslationToggleProps,
} from "@/app/authenticated-helpers/post-translation-presentation";

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function toCommunityFeedItem(
  postResponse: ApiPost,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { post } = postResponse;
  const authorProfile = post.author_user ? authorProfiles[post.author_user] ?? undefined : undefined;
  const storyPortalHref = resolvePostStoryPortalHref({
    asset: postResponse.asset_story ?? (post as typeof post & { asset_story?: NonNullable<ApiPost["asset_story"]> | null }).asset_story,
    fallbackAsset: songOptions?.asset,
    storyNetwork: songOptions?.storyNetwork,
    upstreamAssetRefs: post.upstream_asset_refs,
  });
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    storyPortalHref,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" });
  const heading = resolvePostCardHeadingTitle({
    translatedTitle: postResponse.translated_title,
    originalTitle: post.title,
    translatedPresentation: postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
      : undefined,
    originalPresentation: resolveTranslatedTextPresentation(post.source_language),
    localizedLinkTitle,
  });
  const titleProps = buildPostCardTitleProps({
    content,
    suppressTitle: isDeleted || isRemoved,
    title: heading.title,
    titleDir: heading.dir,
    titleHref: `/p/${post.id}`,
    titleLang: heading.lang,
  });

  const localizedPost = withTranslationToggleProps({
      byline: {
        author: isDeleted || isRemoved ? undefined : {
          kind: "user",
          label: resolvePostAuthorLabel(post, authorProfile),
          avatarSeed: resolvePostAuthorAvatarSeed(post, authorProfile),
          avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
          href: post.identity_mode === "public" && post.author_user && authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined,
        },
        agentAuthor: resolveAgentAuthor(post, authorProfile),
        timestampLabel: formatRelativeTimestamp(post.created),
      },
      content,
      engagement: {
        commentCount: getPostCommentCount(postResponse),
        score: postResponse.upvote_count - postResponse.downvote_count,
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      event: toPostCardEvent(post),
      identityPresentation: post.identity_mode === "anonymous" ? "anonymous_primary" : "author_primary",
      authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
      authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
        ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
        : undefined,
      onComment: opts?.onComment,
      menuItems: hasPostMenu ? postMenuItems : undefined,
      shareActions: buildPostShareActions(post),
      onMenuAction: hasPostMenu ? (key) => {
        if (key === "view-story" && storyPortalHref) openExternalUrl(storyPortalHref);
        if (key === "delete") opts?.onDelete?.();
        if (key === "remove") opts?.onRemove?.();
        if (key === "cancel-event") opts?.onCancelEvent?.();
      } : undefined,
      onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
      postHref: `/p/${post.id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      ...titleProps,
      viewContext: "community",
    },
    postResponse,
    opts,
  );
  const originalPost = canShowOriginalToggle(postResponse, opts)
    ? (() => {
      const originalContent = toCommunityPostContent(postResponse, songOptions, { ...opts, preferOriginalText: true });
      const originalTitleProps = buildPostCardTitleProps({
        content: originalContent,
        title: post.title,
        titleHref: localizedPost.titleHref,
      });
      return withTranslationToggleProps({
        ...localizedPost,
        content: originalContent,
        ...originalTitleProps,
      }, postResponse, opts);
    })()
    : undefined;

  return {
    id: post.id,
    post: localizedPost,
    postOriginal: originalPost,
  };
}

export function toThreadPostCard(
  postResponse: ApiPost,
  community:
    | Pick<ApiCommunity, "id" | "display_name" | "karaoke_enabled" | "namespace_verification" | "route_slug">
    | Pick<ApiCommunityPreview, "id" | "display_name" | "karaoke_enabled" | "namespace_verification" | "route_slug">
    | null,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): PostCardProps {
  const postResponseWithCommunity = {
    ...postResponse,
    community: postResponse.community ?? community,
  } as ApiPost;
  const { post } = postResponse;
  const communityVerified = Boolean(community?.namespace_verification);
  const storyPortalHref = resolvePostStoryPortalHref({
    asset: postResponse.asset_story ?? (post as typeof post & { asset_story?: NonNullable<ApiPost["asset_story"]> | null }).asset_story,
    fallbackAsset: songOptions?.asset,
    storyNetwork: songOptions?.storyNetwork,
    upstreamAssetRefs: post.upstream_asset_refs,
  });
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    storyPortalHref,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponseWithCommunity, songOptions, { ...opts, embedMode: "official" });
  const heading = resolvePostCardHeadingTitle({
    translatedTitle: opts?.preferOriginalText ? null : postResponse.translated_title,
    originalTitle: post.title,
    translatedPresentation: !opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
      : undefined,
    originalPresentation: resolveTranslatedTextPresentation(post.source_language),
    localizedLinkTitle,
  });
  const titleProps = buildPostCardTitleProps({
    content,
    suppressTitle: isDeleted || isRemoved,
    title: heading.title,
    titleDir: heading.dir,
    titleLang: heading.lang,
  });
  const communityLabel = community?.id
    ? communityVerified
      ? formatCommunityRouteLabel(community.id, community.route_slug)
      : community.display_name?.trim() || formatCommunityRouteLabel(community.id, community.route_slug)
    : undefined;

  return withTranslationToggleProps({
    byline: {
      author: isDeleted || isRemoved ? undefined : {
        kind: "user",
        label: resolvePostAuthorLabel(post, authorProfile),
        avatarSeed: resolvePostAuthorAvatarSeed(post, authorProfile),
        avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
        href: post.identity_mode === "public" && post.author_user && authorProfile
          ? buildPublicProfilePathForProfile(authorProfile)
          : undefined,
      },
      agentAuthor: resolveAgentAuthor(post, authorProfile),
      community: community?.id
        ? {
          kind: "community",
          label: communityLabel ?? community.id,
          href: buildCommunityPath(community.id, community.route_slug),
          verificationStatus: communityVerified ? undefined : "unverified",
        }
        : undefined,
      timestampLabel: formatRelativeTimestamp(post.created),
    },
    content,
    engagement: {
      commentCount: opts?.commentCountOverride ?? getPostCommentCount(postResponse),
      score: postResponse.upvote_count - postResponse.downvote_count,
      viewerVote: toViewerVote(postResponse.viewer_vote),
    },
    authorCommunityRole: postResponse.author_community_role ?? undefined,
    event: toPostCardEvent(post),
    identityPresentation: isDeleted || isRemoved ? "community_primary" : "community_with_author",
    authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
    authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
      ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
      : undefined,
    onComment: opts?.onComment,
    menuItems: hasPostMenu ? postMenuItems : undefined,
    shareActions: buildPostShareActions(post),
    onMenuAction: hasPostMenu ? (key) => {
      if (key === "view-story" && storyPortalHref) openExternalUrl(storyPortalHref);
      if (key === "delete") opts?.onDelete?.();
      if (key === "remove") opts?.onRemove?.();
      if (key === "cancel-event") opts?.onCancelEvent?.();
    } : undefined,
    onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
    postHref: undefined,
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    ...titleProps,
    titleHref: undefined,
    viewContext: "post",
  }, postResponse, opts);
}
