import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import { formatCommunityRouteLabel } from "@/lib/community-routing";
import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/posts/post-card/post-card-nationality";

import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { resolveCommunityAvatarSrc } from "@/lib/default-community-media";
import {
  toCommunityPostContent,
  toViewerVote,
  resolvePostAuthorLabel,
  resolveAgentAuthor,
  resolvePostQualifierLabels,
  resolveTranslatedTextPresentation,
  withTranslationToggleProps,
  canShowOriginalToggle,
  type SongPresentationOptions,
  type PostPresentationOptions,
} from "@/app/authenticated-helpers/post-presentation";

export type HomeFeedEntry = ApiHomeFeedItem;

function formatCommunityLabel(displayName: string): string {
  const normalized = displayName.trim().replace(/^c\//iu, "");
  return normalized ? formatCommunityRouteLabel("community", normalized) : "c/community";
}

function getPostScore(post: ApiPost): number {
  return post.upvote_count - post.downvote_count;
}

export function toHomeFeedItem(
  entry: HomeFeedEntry,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { community, post: postResponse } = entry;
  const { post } = postResponse;
  const authorProfile = post.author_user_id ? authorProfiles[post.author_user_id] ?? undefined : undefined;

  const localizedPost = withTranslationToggleProps({
      byline: {
        author: {
          kind: "user",
          label: resolvePostAuthorLabel(post, authorProfile),
          avatarSeed: post.identity_mode === "public" ? authorProfile?.user_id ?? post.author_user_id ?? undefined : undefined,
          avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
          href: post.identity_mode === "public" && post.author_user_id && authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined,
        },
        agentAuthor: resolveAgentAuthor(post, authorProfile),
        community: {
          kind: "community",
          avatarSrc: resolveCommunityAvatarSrc({
            avatarSrc: community.avatar_ref,
            communityId: community.community_id,
            displayName: community.display_name,
          }),
          href: `/c/${community.community_id}`,
          label: formatCommunityLabel(community.route_slug ?? community.display_name),
        },
        timestampLabel: formatRelativeTimestamp(post.created_at),
      },
      content: toCommunityPostContent(postResponse, songOptions),
      engagement: {
        commentCount: postResponse.thread_snapshot?.comment_count ?? 0,
        score: getPostScore(postResponse),
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      identityPresentation: "community_primary",
      authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
      authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
        ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
        : undefined,
      onComment: opts?.onComment,
      onVote: opts?.onVote,
      postHref: `/p/${post.post_id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: postResponse.translated_title ?? post.title ?? undefined,
      titleDir: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir : undefined,
      titleLang: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang : undefined,
      titleHref: `/p/${post.post_id}`,
      viewContext: "home",
    },
    postResponse,
    opts,
  );
  const originalPost = canShowOriginalToggle(postResponse, opts)
    ? withTranslationToggleProps({
      ...localizedPost,
      content: toCommunityPostContent(postResponse, songOptions, { preferOriginalText: true }),
      title: post.title ?? undefined,
      titleDir: undefined,
      titleLang: undefined,
    }, postResponse, opts)
    : undefined;

  return {
    id: post.post_id,
    post: localizedPost,
    postOriginal: originalPost,
  };
}
