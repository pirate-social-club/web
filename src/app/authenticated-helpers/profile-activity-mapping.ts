import type {
  CommentListItem,
  CommunityPreview,
  LocalizedPostResponse,
  Profile,
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
  resolveCommentAuthorAvatarSeed,
  resolveCommentAuthorLabel,
  toCommentViewerVote,
} from "@/app/authenticated-helpers/post-identity-presentation";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";
import { formatRelativeTimestamp } from "@/lib/formatting/time";
import { buildPublicProfilePath } from "@/lib/profile-routing";

export const PROFILE_ACTIVITY_PAGE_LIMIT = 25;

type AuthorProfilesByUserId = Record<string, Profile | null>;

type ProfileActivityHomeFeedEntry = {
  community: ProfileActivityPostPage["community"];
  post: ProfileActivityPostPage["post"];
};

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

function publicAuthorHandle(item: CommentListItem): string | null {
  if (item.comment.identity_mode !== "public") {
    return null;
  }
  return item.comment.author_public_handle ?? null;
}

function publicAuthorHref(item: CommentListItem): string | undefined {
  const handle = item.comment.identity_mode === "public" ? item.comment.author_public_handle : null;
  return handle ? buildPublicProfilePath(handle) : undefined;
}

function postAuthorHandle(post: LocalizedPostResponse): string | null {
  if (post.post.identity_mode !== "public") {
    return null;
  }
  return post.post.author_public_handle ?? null;
}

function postAuthorHref(post: LocalizedPostResponse): string | undefined {
  const handle = postAuthorHandle(post);
  return handle ? buildPublicProfilePath(handle) : undefined;
}

function postTitle(post: LocalizedPostResponse): string | undefined {
  const title = post.translated_title ?? post.post.title ?? post.post.body ?? post.post.caption ?? null;
  return title?.trim() || undefined;
}

function scoreLabel(score: number): string {
  return `${score} score`;
}

function mapProfileActivityPost(
  item: ProfileActivityPostPage,
  authorProfiles: AuthorProfilesByUserId = {},
): ProfilePostItem {
  const entry: ProfileActivityHomeFeedEntry = {
    community: item.community,
    post: item.post,
  };
  const feedItem = toHomeFeedItem(entry, authorProfiles);
  const authorHandle = postAuthorHandle(item.post);
  const authorHref = postAuthorHref(item.post);
  return {
    postId: item.post.post.id,
    post: {
      ...feedItem.post,
      byline: feedItem.post.byline
        ? {
            ...feedItem.post.byline,
            author: feedItem.post.byline.author
              ? {
                  ...feedItem.post.byline.author,
                  href: authorHref,
                  label: authorHandle ?? feedItem.post.byline.author.label,
                }
              : feedItem.post.byline.author,
          }
        : feedItem.post.byline,
      viewContext: "profile",
    },
  };
}

function mapProfileActivityComment(
  item: ProfileActivityCommentPage,
  authorProfiles: AuthorProfilesByUserId = {},
): ProfileCommentItem {
  const comment = item.comment.comment;
  const rootPostId = item.thread_root_post.post.id;
  const body = item.comment.translated_body ?? comment.body ?? "";
  const authorHandle = publicAuthorHandle(item.comment);
  const authorProfile = comment.author_user ? authorProfiles[comment.author_user] ?? null : null;
  return {
    authorAvatarSeed: resolveCommentAuthorAvatarSeed(comment, authorProfile),
    authorAvatarSrc: comment.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
    authorHref: authorHandle ? buildPublicProfilePath(authorHandle) : publicAuthorHref(item.comment),
    authorLabel: authorHandle ?? resolveCommentAuthorLabel(comment, authorProfile),
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

function mapProfileActivityItem(
  item: ProfileActivityPostPage | ProfileActivityCommentPage,
  authorProfiles: AuthorProfilesByUserId = {},
): ProfileActivityItem {
  if (item.kind === "post") {
    return {
      id: `post:${item.post.post.id}`,
      kind: "post",
      post: mapProfileActivityPost(item, authorProfiles),
    };
  }
  return {
    comment: mapProfileActivityComment(item, authorProfiles),
    id: `comment:${item.comment.comment.id}`,
    kind: "comment",
  };
}

export function mapProfileActivityProps(
  activity: Pick<ProfileActivityResponse, "comments" | "overview_items" | "posts">,
  authorProfiles: AuthorProfilesByUserId = {},
): Pick<ProfilePageProps, "comments" | "overviewItems" | "posts"> {
  return {
    comments: activity.comments.map((item) => mapProfileActivityComment(item, authorProfiles)),
    overviewItems: activity.overview_items.map((item) => mapProfileActivityItem(item, authorProfiles)),
    posts: activity.posts.map((item) => mapProfileActivityPost(item, authorProfiles)),
  };
}
