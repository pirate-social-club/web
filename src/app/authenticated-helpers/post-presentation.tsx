"use client";

import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
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

function buildPostMenu(input: {
  canModeratePost?: boolean;
  onDelete?: () => void;
  onRemove?: () => void;
  post: Pick<ApiPost["post"], "status">;
  viewerIsAuthor?: boolean | null;
}) {
  const canDeletePost = input.post.status !== "deleted" && Boolean(input.viewerIsAuthor && input.onDelete);
  const canRemovePost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && !input.viewerIsAuthor
    && Boolean(input.canModeratePost && input.onRemove);
  const postMenuItems = [
    ...(canDeletePost ? [{ key: "delete", label: "Delete post", destructive: true }] : []),
    ...(canRemovePost ? [{ key: "remove", label: "Remove post", destructive: true }] : []),
  ];

  return {
    hasPostMenu: postMenuItems.length > 0,
    postMenuItems,
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
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);

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
      content: toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" }),
      engagement: {
        commentCount: getPostCommentCount(postResponse),
        score: postResponse.upvote_count - postResponse.downvote_count,
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      identityPresentation: post.identity_mode === "anonymous" ? "anonymous_primary" : "author_primary",
      authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
      authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
        ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
        : undefined,
      onComment: opts?.onComment,
      menuItems: hasPostMenu ? postMenuItems : undefined,
      onMenuAction: hasPostMenu ? (key) => {
        if (key === "delete") opts?.onDelete?.();
        if (key === "remove") opts?.onRemove?.();
      } : undefined,
      onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
      postHref: `/p/${post.id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: isDeleted || isRemoved ? undefined : localizedLinkTitle.title ?? postResponse.translated_title ?? post.title ?? undefined,
      titleDir: localizedLinkTitle.dir ?? (postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir : undefined),
      titleLang: localizedLinkTitle.lang ?? (postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang : undefined),
      titleHref: isDeleted || isRemoved ? undefined : `/p/${post.id}`,
      viewContext: "community",
    },
    postResponse,
    opts,
  );
  const originalPost = canShowOriginalToggle(postResponse, opts)
    ? withTranslationToggleProps({
      ...localizedPost,
      content: toCommunityPostContent(postResponse, songOptions, { ...opts, preferOriginalText: true }),
      title: post.title ?? undefined,
      titleDir: undefined,
      titleLang: undefined,
    }, postResponse, opts)
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
  const communityVerified = Boolean(community?.namespace_verification);
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const isDeleted = post.status === "deleted";
  const isRemoved = post.status === "removed";
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" });
  const contentOwnsTitle = content.type === "live_room";
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
    identityPresentation: isDeleted || isRemoved ? "community_primary" : "community_with_author",
    authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
    authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
      ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
      : undefined,
    onComment: opts?.onComment,
    menuItems: hasPostMenu ? postMenuItems : undefined,
    onMenuAction: hasPostMenu ? (key) => {
      if (key === "delete") opts?.onDelete?.();
      if (key === "remove") opts?.onRemove?.();
    } : undefined,
    onVote: post.status === "deleted" || post.status === "removed" ? undefined : opts?.onVote,
    postHref: undefined,
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    title: contentOwnsTitle || isDeleted || isRemoved ? undefined : localizedLinkTitle.title ?? (opts?.preferOriginalText
      ? post.title ?? undefined
      : postResponse.translated_title ?? post.title ?? undefined),
    titleDir: localizedLinkTitle.dir ?? (!opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined),
    titleLang: localizedLinkTitle.lang ?? (!opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined),
    titleHref: undefined,
    viewContext: "post",
  }, postResponse, opts);
}
