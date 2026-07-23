import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import { buildPostCardTitleProps } from "@/components/compositions/posts/post-card/post-card-content-rules";
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
import { resolveLocalizedLinkTitle, resolvePostCardHeadingTitle } from "@/app/authenticated-helpers/post-link-presentation";
import { buildPostMenu, resolvePostStoryPortalHref } from "@/app/authenticated-helpers/post-menu-presentation";
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

type HomeFeedPresentationEntry = {
  booking?: ApiHomeFeedItem["booking"];
  community: ApiHomeFeedItem["community"] | ApiCommunityPreview;
  post: ApiPost;
};

function formatCommunityLabel(displayName: string): string {
  const normalized = displayName.trim().replace(/^c\//iu, "");
  return normalized ? formatCommunityRouteLabel("community", normalized) : "c/community";
}

function getPostScore(post: ApiPost): number {
  return post.upvote_count - post.downvote_count;
}

function openExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function resolveHomeFeedCommunityId(community: HomeFeedPresentationEntry["community"]): string {
  const rawCommunityId =
    (community as typeof community & { community?: string }).community
    ?? (community as typeof community & { community_id?: string }).community_id
    ?? community.id
    ?? "";
  return rawCommunityId.replace(/^com_/u, "");
}

export function toHomeFeedItem(
  entry: HomeFeedPresentationEntry,
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
  const storyPortalHref = resolvePostStoryPortalHref({
    asset: postResponse.asset_story ?? (post as typeof post & { asset_story?: NonNullable<ApiPost["asset_story"]> | null }).asset_story,
    fallbackAsset: songOptions?.asset,
    storyNetwork: songOptions?.storyNetwork,
    upstreamAssetRefs: post.upstream_asset_refs,
  });
  const { hasPostMenu, postMenuItems } = buildPostMenu({
    canModeratePost: opts?.canModeratePost,
    eventStatus: event?.status ?? null,
    onCancelEvent: opts?.onCancelEvent,
    onDelete: opts?.onDelete,
    onRemove: opts?.onRemove,
    post,
    storyPortalHref,
    viewerIsAuthor: postResponse.viewer_is_author,
  });
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
    title: heading.title,
    titleDir: heading.dir,
    titleHref: `/p/${postId}`,
    titleLang: heading.lang,
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
        upvoteCount: postResponse.upvote_count,
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
        if (key === "view-story" && storyPortalHref) openExternalUrl(storyPortalHref);
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
    booking: entry.booking ? {
      basePriceCents: entry.booking.base_price_cents,
      currency: entry.booking.currency,
      hostUserId: entry.booking.host_user_id,
      startingPriceCents: entry.booking.starting_price_cents,
    } : undefined,
    id: postId,
    post: localizedPost,
    postOriginal: originalPost,
  };
}
