import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";

import type { VideoFeedItem } from "./video-feed.types";

type VideoViewerSource = Pick<FeedItem, "booking" | "id"> & {
  post: PostCardProps;
};

export function toVideoViewerItem(item: VideoViewerSource): VideoFeedItem | null {
  const { post } = item;
  if (post.content.type !== "video") return null;
  const content = post.content;
  if (!content.src.trim() && !content.posterSrc) return null;
  const publisher = post.byline.author ?? post.byline.community;
  if (!publisher) return null;
  const linkedSong = content.upstreamAttributions?.find((source) => source.relationshipType === "references_song");

  return {
    id: item.id,
    booking: item.booking,
    caption: content.caption,
    captionDir: content.captionDir,
    captionLang: content.captionLang,
    commentCount: post.engagement.commentCount,
    karaoke: "unavailable",
    likeCount: post.engagement.upvoteCount ?? Math.max(0, post.engagement.score),
    downvoted: post.engagement.viewerVote === "down",
    liked: post.engagement.viewerVote === "up",
    media: {
      orientation: content.aspectRatio != null && content.aspectRatio < 1 ? "portrait" : "landscape",
      posterSrc: content.posterSrc,
      src: content.src,
    },
    publisher: {
      avatarSrc: publisher.avatarSrc,
      handle: publisher.label,
      href: publisher.href,
      kind: publisher.kind === "user" ? "profile" : "community",
    },
    shareActions: post.shareActions,
    song: linkedSong ? {
      artist: linkedSong.artist ?? "",
      songHref: linkedSong.sourcePostId
        ? `/p/${encodeURIComponent(linkedSong.sourcePostId)}`
        : undefined,
      sourcePostId: linkedSong.sourcePostId,
      title: linkedSong.title,
    } : undefined,
    study: "unavailable",
    viewerState: content.ageGateViewerState === "proof_required" ? "age_proof_required" : "allowed",
  };
}

export function adjacentVideoSourcePostIds(
  items: readonly VideoFeedItem[],
  activeIndex: number,
): string[] {
  return items
    .slice(Math.max(0, activeIndex - 1), activeIndex + 2)
    .flatMap((item) => item.song?.sourcePostId ? [item.song.sourcePostId] : []);
}
