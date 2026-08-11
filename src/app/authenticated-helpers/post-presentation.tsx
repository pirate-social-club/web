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
import { resolveCommunityAvatarSrc } from "@/lib/default-community-media";
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
;

export { toCommunityPostContent } from "@/app/authenticated-helpers/post-content-presentation";
export {

  getPostCommentCount,

  resolveAnonymousComposerDescription,
  resolveAnonymousComposerLabel,
  resolveCommentAuthorAvatarSeed,
  resolveCommentAuthorLabel,




  resolvePublicIdentityLabel,
  toCommentViewerVote,

} from "@/app/authenticated-helpers/post-identity-presentation";
export { resolveLocalizedLinkTitle } from "@/app/authenticated-helpers/post-link-presentation";
export type {

  PostPresentationOptions,
  SongPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation-types";
export {


  shouldShowOriginalPost,

} from "@/app/authenticated-helpers/post-translation-presentation";

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function resolvePostStatusNotice(
  post: ApiPost["post"],
  opts?: PostPresentationOptions,
): PostCardProps["statusNotice"] {
  if (post.status === "processing" && opts?.processingTimedOut) {
    return {
      tone: "neutral",
      label: "Still processing",
      message: "This is taking longer than expected. Your post is safe; check again or reload later.",
      action: opts.onRefreshProcessing
        ? { label: "Check status", onClick: opts.onRefreshProcessing }
        : undefined,
    };
  }
  if (post.status === "processing" && post.post_type === "song") {
    return {
      tone: "neutral",
      label: "Preparing song features",
      message: "Visible only to you while we finish rights, lyrics, and audio checks.",
    };
  }
  if (post.status === "failed") {
    return {
      tone: "destructive",
      label: "Publish failed",
      message: post.publish_failure_message ?? "This post could not be published.",
      action: post.publish_failure_retryable && opts?.onRetryPublish
        ? { label: "Try again", onClick: opts.onRetryPublish }
        : undefined,
    };
  }
  return undefined;
}

type PostPresentationCommunity =
  | Pick<ApiCommunity, "avatar_ref" | "id" | "display_name" | "karaoke_enabled" | "namespace_verification" | "route_slug">
  | Pick<ApiCommunityPreview, "avatar_ref" | "id" | "display_name" | "karaoke_enabled" | "namespace_verification" | "route_slug">
  | null;

export function toCommunityFeedItem(
  postResponse: ApiPost,
  community: PostPresentationCommunity,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { post } = postResponse;
  const effectiveCommunity = postResponse.community ?? community;
  const postResponseWithCommunity = {
    ...postResponse,
    community: effectiveCommunity,
  } as ApiPost;
  const authorProfile = post.author_user ? authorProfiles[post.author_user] ?? undefined : undefined;
  const storyPortalHref = resolvePostStoryPortalHref({
    asset: postResponse.asset_story ?? (post as typeof post & { asset_story?: NonNullable<ApiPost["asset_story"]> | null }).asset_story,
    fallbackAsset: songOptions?.asset,
    storyNetwork: songOptions?.storyNetwork,
    upstreamAssetRefs: post.upstream_asset_refs,
  });
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canBoost: opts?.canBoost,
    canManageRewardSettings: opts?.canManageRewardSettings,
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onBoost: opts?.onBoost,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    onRewardSettings: opts?.onRewardSettings,
    post,
    storyPortalHref,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const isPublished = post.status === "published";
  const statusNotice = resolvePostStatusNotice(post, opts);
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponseWithCommunity, songOptions, { ...opts, embedMode: "official" });
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
        upvoteCount: postResponse.upvote_count,
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      event: toPostCardEvent(post),
      identityPresentation: post.identity_mode === "anonymous" ? "anonymous_primary" : "author_primary",
      authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
      authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
        ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
        : undefined,
      statusNotice,
      onComment: isPublished ? opts?.onComment : undefined,
      menuItems: hasPostMenu ? postMenuItems : undefined,
      shareActions: isPublished ? buildPostShareActions(post) : undefined,
      onMenuAction: hasPostMenu ? (key) => {
        if (key === "boost") opts?.onBoost?.();
        if (key === "reward-settings") opts?.onRewardSettings?.();
        if (key === "view-story" && storyPortalHref) openExternalUrl(storyPortalHref);
        if (key === "delete") opts?.onDelete?.();
        if (key === "remove") opts?.onRemove?.();
        if (key === "cancel-event") opts?.onCancelEvent?.();
      } : undefined,
      onVote: isPublished ? opts?.onVote : undefined,
      postId: post.id,
      postHref: isPublished ? `/p/${post.id}` : undefined,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      ...(isPublished ? titleProps : { ...titleProps, titleHref: undefined }),
      viewContext: "community",
    },
    postResponse,
    opts,
  );
  const originalPost = canShowOriginalToggle(postResponse, opts)
    ? (() => {
      const originalContent = toCommunityPostContent(postResponseWithCommunity, songOptions, { ...opts, preferOriginalText: true });
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
  community: PostPresentationCommunity,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): PostCardProps {
  const effectiveCommunity = postResponse.community ?? community;
  const postResponseWithCommunity = {
    ...postResponse,
    community: effectiveCommunity,
  } as ApiPost;
  const { post } = postResponse;
  const communityVerified = Boolean(effectiveCommunity?.namespace_verification);
  const storyPortalHref = resolvePostStoryPortalHref({
    asset: postResponse.asset_story ?? (post as typeof post & { asset_story?: NonNullable<ApiPost["asset_story"]> | null }).asset_story,
    fallbackAsset: songOptions?.asset,
    storyNetwork: songOptions?.storyNetwork,
    upstreamAssetRefs: post.upstream_asset_refs,
  });
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canBoost: opts?.canBoost,
    canManageRewardSettings: opts?.canManageRewardSettings,
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onBoost: opts?.onBoost,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    onRewardSettings: opts?.onRewardSettings,
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
  const communityLabel = effectiveCommunity?.id
    ? communityVerified
      ? formatCommunityRouteLabel(effectiveCommunity.id, effectiveCommunity.route_slug)
      : effectiveCommunity.display_name?.trim() || formatCommunityRouteLabel(effectiveCommunity.id, effectiveCommunity.route_slug)
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
      community: effectiveCommunity?.id
        ? {
          kind: "community",
          avatarSrc: resolveCommunityAvatarSrc({
            avatarSrc: effectiveCommunity.avatar_ref,
            communityId: effectiveCommunity.id,
            displayName: effectiveCommunity.display_name,
          }),
          label: communityLabel ?? effectiveCommunity.id,
          href: buildCommunityPath(effectiveCommunity.id, effectiveCommunity.route_slug),
          verificationStatus: communityVerified ? undefined : "unverified",
        }
        : undefined,
      timestampLabel: formatRelativeTimestamp(post.created),
    },
    content,
    engagement: {
      commentCount: opts?.commentCountOverride ?? getPostCommentCount(postResponse),
      score: postResponse.upvote_count - postResponse.downvote_count,
      upvoteCount: postResponse.upvote_count,
      viewerVote: toViewerVote(postResponse.viewer_vote),
      voteBusy: opts?.voteBusy,
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
      if (key === "boost") opts?.onBoost?.();
      if (key === "reward-settings") opts?.onRewardSettings?.();
      if (key === "view-story" && storyPortalHref) openExternalUrl(storyPortalHref);
      if (key === "delete") opts?.onDelete?.();
      if (key === "remove") opts?.onRemove?.();
      if (key === "cancel-event") opts?.onCancelEvent?.();
    } : undefined,
    onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
    voteAccess: post.status === "deleted" || post.status === "removed" ? undefined : opts?.voteAccess,
    postId: post.id,
    postHref: undefined,
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    statusNotice: resolvePostStatusNotice(post, opts),
    ...titleProps,
    titleHref: undefined,
    viewContext: "post",
  }, postResponse, opts);
}
