import type {
  CommentListItem,
  CommunityPreview,
  HomeFeedItem,
  LocalizedPostResponse,
  ProfileActivityCommentPage,
  ProfileActivityPostPage,
  ProfileActivityResponse,
} from "@pirate/api-contracts";

import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePageProps,
  ProfilePostItem,
} from "@/components/compositions/profiles/profile-page/profile-page.types";
import { toHomeFeedItem } from "@/app/authenticated-helpers/home-feed-presentation";
import {
  resolveCommentAuthorLabel,
  toCommentViewerVote,
} from "@/app/authenticated-helpers/post-identity-presentation";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { buildPublicProfilePath } from "@/lib/profile-routing";

export const PROFILE_ACTIVITY_PAGE_LIMIT = 25;

function communityId(community: CommunityPreview): string {
  return (community as CommunityPreview & { community?: string; community_id?: string }).community
    ?? (community as CommunityPreview & { community_id?: string }).community_id
    ?? community.id
    ?? "";
}

function communityLabel(community: CommunityPreview): string {
  return formatCommunityRouteLabel(communityId(community), community.route_slug ?? community.display_name);
}

function communityHref(community: CommunityPreview): string {
  return buildCommunityPath(communityId(community), community.route_slug ?? undefined);
}

function publicAuthorHref(item: CommentListItem): string | undefined {
  const handle = item.comment.identity_mode === "public" ? item.comment.author_public_handle : null;
  return handle ? buildPublicProfilePath(handle) : undefined;
}

function postAuthorHref(post: LocalizedPostResponse): string | undefined {
  const handle = post.post.identity_mode === "public" ? post.post.author_public_handle : null;
  return handle ? buildPublicProfilePath(handle) : undefined;
}

function postTitle(post: LocalizedPostResponse): string | undefined {
  const title = post.translated_title ?? post.post.title ?? post.post.body ?? post.post.caption ?? null;
  return title?.trim() || undefined;
}

function scoreLabel(score: number): string {
  return `${score} score`;
}

export function mapProfileActivityPost(item: ProfileActivityPostPage): ProfilePostItem {
  const feedItem = toHomeFeedItem({
    community: item.community,
    post: item.post,
  } as unknown as HomeFeedItem, {});
  const authorHref = postAuthorHref(item.post);
  return {
    postId: item.post.post.id,
    post: {
      ...feedItem.post,
      byline: feedItem.post.byline
        ? {
            ...feedItem.post.byline,
            author: feedItem.post.byline.author
              ? { ...feedItem.post.byline.author, href: authorHref }
              : feedItem.post.byline.author,
          }
        : feedItem.post.byline,
      viewContext: "profile",
    },
  };
}

export function mapProfileActivityComment(item: ProfileActivityCommentPage): ProfileCommentItem {
  const comment = item.comment.comment;
  const rootPostId = item.thread_root_post.post.id;
  const body = item.comment.translated_body ?? comment.body ?? "";
  return {
    authorHref: publicAuthorHref(item.comment),
    authorLabel: resolveCommentAuthorLabel(comment, null),
    body,
    bodyDir: item.comment.translation_state === "ready" && item.comment.resolved_locale.toLowerCase().startsWith("ar")
      ? "rtl"
      : "auto",
    bodyLang: item.comment.translation_state === "ready" && item.comment.resolved_locale.toLowerCase().startsWith("ar")
      ? "ar"
      : undefined,
    commentId: comment.id,
    communityHref: communityHref(item.community),
    communityLabel: communityLabel(item.community),
    postHref: `/p/${rootPostId}`,
    postTitle: postTitle(item.thread_root_post),
    scoreLabel: scoreLabel(comment.score),
    timestampLabel: formatRelativeTimestamp(comment.created),
    viewerVote: toCommentViewerVote(item.comment.viewer_vote),
  };
}

export function mapProfileActivityItem(
  item: ProfileActivityPostPage | ProfileActivityCommentPage,
): ProfileActivityItem {
  if (item.kind === "post") {
    return {
      id: `post:${item.post.post.id}`,
      kind: "post",
      post: mapProfileActivityPost(item),
    };
  }
  return {
    comment: mapProfileActivityComment(item),
    id: `comment:${item.comment.comment.id}`,
    kind: "comment",
  };
}

export function mapProfileActivityProps(
  activity: Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts">,
): Pick<ProfilePageProps, "comments" | "overviewItems" | "posts"> {
  return {
    comments: activity.comments.map(mapProfileActivityComment),
    overviewItems: activity.overview_items.map(mapProfileActivityItem),
    posts: activity.posts.map(mapProfileActivityPost),
  };
}
