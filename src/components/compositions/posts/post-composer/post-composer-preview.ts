import type { PlaybackState, PostCardContent } from "@/components/compositions/posts/post-card/post-card.types";

import type { AttachmentState, LinkPreviewState, LiveComposerState, VideoDetailsState } from "./post-composer.types";
import type { LiveRoomParticipant } from "@/components/compositions/posts/post-card/post-card.types";

const fallbackImageSrc = "https://picsum.photos/seed/post-composer-image-preview/720/720";
const fallbackVideoSrc = "https://www.w3schools.com/html/mov_bbb.mp4";

function formatLiveStartsAtLabel(scheduleAt: string | undefined): string | undefined {
  const value = scheduleAt?.trim();
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function buildPostComposerPreviewContent({
  access,
  attachment,
  body,
  linkPreview,
  price,
  songTitle,
  title,
  videoDetails,
  videoPosterSrc,
  songPlayback,
  liveCoverSrc,
  liveState,
  liveHostIdentity,
  liveGuestLabel,
}: {
  access: "free" | "paid";
  attachment: AttachmentState;
  body: string;
  linkPreview?: LinkPreviewState;
  liveCoverSrc?: string;
  liveState?: LiveComposerState;
  liveHostIdentity?: { label: string; href?: string; avatarSrc?: string };
  liveGuestLabel?: string;
  price: string;
  songTitle?: string;
  title: string;
  videoDetails?: VideoDetailsState;
  videoPosterSrc?: string;
  songPlayback?: {
    durationMs?: number;
    onPause?: () => void;
    onPlay?: () => void;
    onSeek?: (progressMs: number) => void;
    progressMs?: number;
    state: PlaybackState;
  };
}): PostCardContent {
  const bodyText = body.trim();
  const accessMode = access === "paid" ? "locked" : "public";
  const priceLabel = price.trim() ? `$${price.trim()}` : undefined;

  if (!attachment) {
    return { type: "text", body: bodyText };
  }

  if (attachment.kind === "image") {
    return {
      type: "image",
      src: attachment.previewUrl ?? fallbackImageSrc,
      alt: title || "Post image",
      caption: bodyText || undefined,
    };
  }

  if (attachment.kind === "video") {
    return {
      type: "video",
      src: attachment.previewUrl ?? fallbackVideoSrc,
      posterSrc: videoPosterSrc ?? videoDetails?.thumbnail?.previewUrl,
      title: title || "Video",
      caption: bodyText || undefined,
      accessMode,
      listingMode: access === "paid" ? "listed" : "not_listed",
      listingStatus: access === "paid" ? "active" : undefined,
      priceLabel: access === "paid" ? priceLabel : undefined,
      playbackState: "idle",
    };
  }

  if (attachment.kind === "link") {
    const href = attachment.url.trim() || "https://example.com";

    if (linkPreview?.provider === "x") {
      return {
        type: "embed",
        body: bodyText || undefined,
        canonicalUrl: linkPreview.canonicalUrl ?? href,
        originalUrl: linkPreview.originalUrl ?? href,
        preview: {
          authorName: linkPreview.embedPreview?.authorName,
          authorUrl: linkPreview.embedPreview?.authorUrl,
          text: linkPreview.embedPreview?.text ?? linkPreview.title,
          hasMedia: linkPreview.embedPreview?.hasMedia,
          mediaUrl: linkPreview.embedPreview?.mediaUrl,
        },
        oembedHtml: linkPreview.oembedHtml,
        provider: "x",
        renderMode: linkPreview.state === "embed" ? "official" : "preview",
        state: linkPreview.state ?? "preview",
      };
    }

    if (linkPreview?.provider === "youtube") {
      return {
        type: "embed",
        body: bodyText || undefined,
        canonicalUrl: linkPreview.canonicalUrl ?? href,
        originalUrl: linkPreview.originalUrl ?? href,
        preview: {
          authorName: linkPreview.embedPreview?.authorName,
          authorUrl: linkPreview.embedPreview?.authorUrl,
          thumbnailUrl: linkPreview.embedPreview?.thumbnailUrl,
          thumbnailWidth: linkPreview.embedPreview?.thumbnailWidth,
          thumbnailHeight: linkPreview.embedPreview?.thumbnailHeight,
          title: linkPreview.embedPreview?.text ?? linkPreview.title,
        },
        oembedHtml: linkPreview.oembedHtml,
        provider: "youtube",
        renderMode: linkPreview.state === "embed" ? "official" : "preview",
        state: linkPreview.state ?? "preview",
      };
    }

    return {
      type: "link",
      href,
      body: bodyText || undefined,
      linkLabel: href.replace(/^https?:\/\//i, ""),
      previewTitle: linkPreview?.title || undefined,
      previewImageSrc: linkPreview?.imageSrc,
    };
  }

  if (attachment.kind === "song") {
    const trackTitle = songTitle?.trim() || attachment.label || "Untitled track";

    return {
      type: "song",
      title: trackTitle,
      caption: bodyText || undefined,
      artworkSrc: attachment.artworkUrl,
      accessMode,
      listingMode: access === "paid" ? "listed" : "not_listed",
      listingStatus: access === "paid" ? "active" : undefined,
      priceLabel: access === "paid" ? priceLabel : undefined,
      onPause: songPlayback?.onPause,
      onPlay: attachment.previewUrl ? songPlayback?.onPlay : undefined,
      onSeek: attachment.previewUrl ? songPlayback?.onSeek : undefined,
      playbackState: songPlayback?.state ?? "idle",
      progressMs: songPlayback?.progressMs,
      durationMs: songPlayback?.durationMs,
    };
  }

  if (attachment.kind === "live") {
    const liveAccessMode = liveState?.accessMode ?? "free";
    const participants: LiveRoomParticipant[] | undefined = liveHostIdentity
      ? [
          { role: "host", ...liveHostIdentity },
          ...(liveGuestLabel ? [{ role: "guest" as const, label: liveGuestLabel }] : []),
        ]
      : undefined;

    return {
      type: "live_room",
      liveRoomId: "composer-preview-live-room",
      title: title.trim() || "Live event",
      description: bodyText || liveState?.description,
      coverSrc: liveCoverSrc,
      roomKind: liveState?.roomKind ?? "solo",
      status: "scheduled",
      accessMode: liveAccessMode,
      visibility: liveState?.visibility ?? "public",
      accessState: liveAccessMode === "paid"
        ? "purchase_required"
        : liveAccessMode === "free"
          ? "waiting"
          : undefined,
      concertHref: "#",
      startsAtLabel: liveState?.scheduleForLater
        ? formatLiveStartsAtLabel(liveState.scheduleAt)
        : undefined,
      setlistPreview: liveState?.setlistItems
        .filter((item) => item.titleText.trim())
        .slice(0, 3)
        .map((item) => ({
          title: item.titleText.trim(),
          artist: item.artistText?.trim() || undefined,
          rightsStatus: "pending",
        })),
      listingMode: liveAccessMode === "paid" ? "listed" : "not_listed",
      listingStatus: liveAccessMode === "paid" ? "active" : undefined,
      onBuy: liveAccessMode === "paid" ? () => undefined : undefined,
      priceLabel: liveAccessMode === "paid" ? priceLabel : undefined,
      hasEntitlement: false,
      participants,
    };
  }

  return {
    type: "text",
    body: bodyText || "Live event",
  };
}
