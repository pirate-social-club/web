import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import { buildPostCardTitleProps } from "@/components/compositions/posts/post-card/post-card-content-rules";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/posts/post-card/post-card-nationality";

import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { resolveCommunityAvatarSrc } from "@/lib/default-community-media";
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
import { buildPostMenu } from "@/app/authenticated-helpers/post-menu-presentation";
import { toPostCardEvent } from "@/app/authenticated-helpers/post-event-presentation";
import type {
  PostPresentationOptions,
  SongPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation-types";
import {
  resolveTranslatedTextPresentation,
  canShowOriginalToggle,
  withTranslationToggleProps,
} from "@/app/authenticated-helpers/post-translation-presentation";
import { buildPostShareActions } from "@/app/authenticated-helpers/post-share-actions";

export type HomeFeedEntry = ApiHomeFeedItem;

function formatCommunityLabel(displayName: string): string {
  const normalized = displayName.trim().replace(/^c\//iu, "");
  return normalized ? formatCommunityRouteLabel("community", normalized) : "c/community";
}

function getPostScore(post: ApiPost): number {
  return post.upvote_count - post.downvote_count;
}

export function resolveHomeFeedCommunityId(community: HomeFeedEntry["community"]): string {
  const rawCommunityId =
    (community as typeof community & { community?: string }).community
    ?? (community as typeof community & { community_id?: string }).community_id
    ?? community.id
    ?? "";
  return rawCommunityId.replace(/^com_/u, "");
}

export function toHomeFeedItem(
  entry: HomeFeedEntry,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { community, post: postResponse } = entry;
  const { post } = postResponse;
  const communityId = resolveHomeFeedCommunityId(community);
  const postId = post.id ?? (post as typeof post & { post?: string }).post ?? "";
  const authorProfile = post.author_user ? authorProfiles[post.author_user] ?? undefined : undefined;
  const event = toPostCardEvent(post);
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: event?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, opts);
  const content = toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" });
  const titleProps = buildPostCardTitleProps({
    content,
    title: localizedLinkTitle.title ?? postResponse.translated_title ?? post.title,
    titleDir: localizedLinkTitle.dir ?? (postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined),
    titleHref: `/p/${postId}`,
    titleLang: localizedLinkTitle.lang ?? (postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined),
  });

  const localizedPost = withTranslationToggleProps({
      byline: {
        author: {
          kind: "user",
          label: resolvePostAuthorLabel(post, authorProfile),
          avatarSeed: resolvePostAuthorAvatarSeed(post, authorProfile),
          avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
          href: post.identity_mode === "public" && post.author_user && authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined,
        },
        agentAuthor: resolveAgentAuthor(post, authorProfile),
        community: {
          kind: "community",
            avatarSrc: resolveCommunityAvatarSrc({
              avatarSrc: community.avatar_ref,
            communityId,
            displayName: community.display_name,
          }),
          href: buildCommunityPath(communityId, community.route_slug),
          label: formatCommunityLabel(community.route_slug ?? community.display_name),
        },
        timestampLabel: formatRelativeTimestamp(post.created),
      },
      content,
      engagement: {
        commentCount: getPostCommentCount(postResponse),
        score: getPostScore(postResponse),
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      event,
      identityPresentation: "community_primary",
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
        if (key === "cancel-event") opts?.onCancelEvent?.();
      } : undefined,
      onVote: opts?.onVote,
      postHref: `/p/${postId}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      ...titleProps,
      viewContext: "home",
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
    id: postId,
    post: localizedPost,
    postOriginal: originalPost,
  };
}
