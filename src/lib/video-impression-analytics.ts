import type { VideoFeedImpression } from "@/components/compositions/posts/video-feed/video-feed";
import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

export function videoImpressionAnalyticsProperties(
  item: VideoFeedItem,
  impression: VideoFeedImpression,
): Record<string, string | number | boolean> {
  return {
    completion_ratio: Number(impression.completionRatio.toFixed(4)),
    duration_seconds: Number(impression.durationSeconds.toFixed(3)),
    dwell_ms: impression.dwellMs,
    exit_reason: impression.exitReason,
    feed_request_id: impression.feedRequestId,
    muted: impression.muted,
    orientation: item.media.orientation,
    playback_seconds: Number(impression.playbackSeconds.toFixed(3)),
    position: impression.position,
    publisher_kind: item.publisher.kind,
    replay_count: impression.replayCount,
    slide_entry_sequence: impression.slideEntrySequence,
    sound_on: impression.soundOnAtAnyPoint,
  };
}
