import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

/**
 * Sovereign video applications intentionally keep community identity on their
 * root domain and creator identity on canonical Pirate. Publisher links cross
 * to the origin that owns each destination instead of emitting relative app
 * routes that the sovereign scope rejects.
 */
export function resolveVideoPublisherHref(input: {
  href?: string;
  importedRootHostname?: string;
  kind: VideoFeedItem["publisher"]["kind"];
}): string | undefined {
  if (!input.href || !input.importedRootHostname) return input.href;
  if (input.kind === "community") return `https://${input.importedRootHostname}/`;
  return new URL(input.href, "https://pirate.sc").toString();
}

export function resolveVideoPublisher(input: {
  href?: string;
  importedRootHostname?: string;
  kind: VideoFeedItem["publisher"]["kind"];
}) {
  return {
    external: input.kind === "profile" && Boolean(input.importedRootHostname),
    href: resolveVideoPublisherHref(input),
  };
}
