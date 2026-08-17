import type { MediaPostData } from "../../../design-system";

import type { VideoFeedItem } from "./video-feed.types";

export function canPlayVideo(item: VideoFeedItem): boolean {
  return item.viewerState !== "age_proof_required" && Boolean(item.media.src?.trim());
}

export function narrowVideoFeedItems(items: ReadonlyArray<VideoFeedItem>): VideoFeedItem[] {
  return items.filter((item) => item.media.orientation === "portrait" || item.media.orientation === "landscape");
}

export function toVerticalFeedPost(item: VideoFeedItem): MediaPostData {
  return {
    id: item.id,
    videoUrl: canPlayVideo(item) ? item.media.src : undefined,
    posterUrl: item.media.posterSrc,
    authorName: item.publisher.handle,
    authorAvatarUrl: item.publisher.avatarSrc,
    caption: item.caption,
    title: item.song?.title,
    artist: item.song?.artist,
    mediaImageUrl: item.song?.artworkSrc,
    likeCount: item.likeCount,
    isLiked: item.liked,
    isFollowing: item.publisher.relationship?.kind === "join"
      ? item.publisher.relationship.active
      : undefined,
  };
}

export function getVideoFeedActionLabel(item: VideoFeedItem): string {
  if (item.interactionGate === "membership_required") return "Join community to interact";
  if (item.viewerState === "age_proof_required") return "Age proof required";
  return "Actions available";
}

export function getMediaWindowIds(items: ReadonlyArray<VideoFeedItem>, activeIndex: number, radius = 2): string[] {
  return items.slice(Math.max(0, activeIndex - radius), activeIndex + radius + 1).map((item) => item.id);
}
