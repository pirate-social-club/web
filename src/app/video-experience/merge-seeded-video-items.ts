import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

export function mergeSeededVideoItems(
  seed: VideoFeedItem,
  ranked: readonly VideoFeedItem[],
): VideoFeedItem[] {
  return [seed, ...ranked.filter((item) => item.id !== seed.id)];
}
