"use client";

import { Avatar } from "@/components/primitives/avatar";
import { Type } from "@/components/primitives/type";
import type { VideoFeedItem } from "./video-feed.types";
import { VideoPublisherLink } from "./video-publisher-link";

type Publisher = VideoFeedItem["publisher"];

export function VideoPublisherByline({
  openPublisherInPirateLabel,
  publisher,
}: {
  openPublisherInPirateLabel?: string;
  publisher: Publisher;
}) {
  return publisher.href ? (
    <VideoPublisherLink
      className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      external={publisher.external}
      href={publisher.href}
      handle={publisher.handle}
      label={openPublisherInPirateLabel}
      showExternalIcon
    >
      <Type as="span" className="text-inherit" variant="body-strong">{publisher.handle}</Type>
    </VideoPublisherLink>
  ) : <Type variant="body-strong">{publisher.handle}</Type>;
}

export function VideoPublisherAvatar({
  openPublisherInPirateLabel,
  publisher,
}: {
  openPublisherInPirateLabel?: string;
  publisher: Publisher;
}) {
  if (!publisher.href) {
    return (
      <div aria-label={`Publisher ${publisher.handle}`} className="rounded-full shadow-md ring-2 ring-white" data-video-publisher-avatar role="img">
        <Avatar fallback={publisher.handle} size="md" src={publisher.avatarSrc} />
      </div>
    );
  }
  return (
    <VideoPublisherLink
      className="rounded-full shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      external={publisher.external}
      href={publisher.href}
      handle={publisher.handle}
      label={openPublisherInPirateLabel}
    >
      <span aria-label={`Publisher ${publisher.handle}`} className="block rounded-full ring-2 ring-white" data-video-publisher-avatar role="img">
        <Avatar fallback={publisher.handle} size="md" src={publisher.avatarSrc} />
      </span>
    </VideoPublisherLink>
  );
}
