"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import { buildPostCardTitleProps } from "@/components/compositions/posts/post-card/post-card-content-rules";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import type { PostCardEvent } from "@/components/compositions/posts/post-card/post-card.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/posts/post-card/post-card-nationality";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { toCommunityPostContent } from "@/app/authenticated-helpers/post-content-presentation";
import {
  getPostCommentCount,
  resolveAgentAuthor,
  resolvePostAuthorAvatarSeed,
  resolvePostAuthorLabel,
  resolvePostLabelPill,
  resolvePostQualifierLabels,
  toViewerVote,
} from "@/app/authenticated-helpers/post-identity-presentation";
import { resolveLocalizedLinkTitle } from "@/app/authenticated-helpers/post-link-presentation";
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
import { buildPostMenu } from "@/app/authenticated-helpers/post-menu-presentation";

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

type ApiPostWithEvent = ApiPost["post"] & {
  event?: {
    starts_at?: number | null;
    ends_at?: number | null;
    timezone?: string | null;
    location_name?: string | null;
    address?: string | null;
    is_online?: boolean | null;
    event_url?: string | null;
    status?: PostCardEvent["status"] | null;
    place?: PostCardEvent["place"] | null;
  } | null;
};

function toPostCardEvent(post: ApiPost["post"]): PostCardEvent | undefined {
  const event = (post as ApiPostWithEvent).event;
  if (!event?.starts_at || !event.timezone?.trim()) return undefined;
  return {
    startsAt: new Date(event.starts_at * 1000).toISOString(),
    endsAt: event.ends_at ? new Date(event.ends_at * 1000).toISOString() : undefined,
    timezone: event.timezone,
    locationName: event.location_name ?? undefined,
    address: event.address ?? undefined,
    isOnline: event.is_online === true,
    eventUrl: event.event_url ?? undefined,
    status: event.status ?? undefined,
    place: event.place ?? undefined,
  };
}

export function toCommunityFeedItem(
  postResponse: ApiPost,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { post } = postResponse;
  const authorProfile = post.author_user ? authorProfiles[post.author_user] ?? undefined : undefined;
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    onReport: opts?.onReport,
    onSetLabel: opts?.onSetLabel,
    post,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" });
  const postHref = opts?.postHref ?? `/p/${post.id}`;
  const titleProps = buildPostCardTitleProps({
    content,
    suppressTitle: isDeleted || isRemoved,
    title: localizedLinkTitle.title ?? postResponse.translated_title ?? post.title,
    titleDir: localizedLinkTitle.dir ?? (postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined),
    titleHref: postHref,
    titleLang: localizedLinkTitle.lang ?? (postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined),
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
        if (key === "delete") opts?.onDelete?.();
        if (key === "remove") opts?.onRemove?.();
        if (key === "report") opts?.onReport?.();
        if (key === "cancel-event") opts?.onCancelEvent?.();
        if (key === "set-label") opts?.onSetLabel?.();
      } : undefined,
      onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
      postHref,
      postLabel: resolvePostLabelPill(postResponse),
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
    | Pick<ApiCommunity, "id" | "display_name" | "namespace_verification" | "route_slug">
    | Pick<ApiCommunityPreview, "id" | "display_name" | "namespace_verification" | "route_slug">
    | null,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): PostCardProps {
  const { post } = postResponse;
  const communityVerificationKnown = Boolean(
    community && Object.prototype.hasOwnProperty.call(community, "namespace_verification"),
  );
  const communityVerified = Boolean(community?.namespace_verification);
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: toPostCardEvent(post)?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    onReport: opts?.onReport,
    onSetLabel: opts?.onSetLabel,
    post,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" });
  const titleProps = buildPostCardTitleProps({
    content,
    suppressTitle: isDeleted || isRemoved,
    title: localizedLinkTitle.title ?? (opts?.preferOriginalText
      ? post.title
      : postResponse.translated_title ?? post.title),
    titleDir: localizedLinkTitle.dir ?? (!opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined),
    titleLang: localizedLinkTitle.lang ?? (!opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined),
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
          verificationStatus: communityVerificationKnown && !communityVerified ? "unverified" : undefined,
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
      if (key === "delete") opts?.onDelete?.();
      if (key === "remove") opts?.onRemove?.();
      if (key === "report") opts?.onReport?.();
      if (key === "cancel-event") opts?.onCancelEvent?.();
      if (key === "set-label") opts?.onSetLabel?.();
    } : undefined,
    onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
    postHref: undefined,
    postLabel: resolvePostLabelPill(postResponse),
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    ...titleProps,
    titleHref: undefined,
    viewContext: "post",
  }, postResponse, opts);
}
