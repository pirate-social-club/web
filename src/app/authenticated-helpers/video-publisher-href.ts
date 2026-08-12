import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

function selectCommunityThreads(href: string): string {
  const target = new URL(href, "https://app.invalid");
  const pathname = target.pathname.replace(/\/+$/u, "");
  target.pathname = pathname.endsWith("/threads") ? pathname : `${pathname}/threads`;
  return `${target.pathname}${target.search}${target.hash}`;
}

/**
 * Imported-root applications keep community routes on their app subdomain so
 * authentication providers always see a conventional URL. Creator identities
 * still live on canonical Pirate.
 */
export function resolveVideoPublisherHref(input: {
  href?: string;
  importedRootHostname?: string;
  kind: VideoFeedItem["publisher"]["kind"];
}): string | undefined {
  if (!input.href || !input.importedRootHostname) return input.href;
  if (input.kind === "community") return selectCommunityThreads(input.href);
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
