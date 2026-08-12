import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

/**
 * Sovereign apexes intentionally serve videos and post pages only. Publisher
 * links therefore cross to the origin that owns the destination instead of
 * emitting Pirate-shaped relative routes that the apex must reject.
 */
export function resolveVideoPublisherHref(input: {
  href?: string;
  importedRootHostname?: string;
  kind: VideoFeedItem["publisher"]["kind"];
}): string | undefined {
  if (!input.href || !input.importedRootHostname) return input.href;
  if (input.kind === "community") return `https://app.${input.importedRootHostname}/`;
  return new URL(input.href, "https://pirate.sc").toString();
}
