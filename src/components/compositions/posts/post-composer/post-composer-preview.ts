import type { PostCardContent } from "@/components/compositions/posts/post-card/post-card.types";

import type { AttachmentState, LinkPreviewState, VideoDetailsState } from "./post-composer.types";

const fallbackImageSrc = "https://picsum.photos/seed/post-composer-image-preview/720/720";
const fallbackVideoSrc = "https://www.w3schools.com/html/mov_bbb.mp4";

export function buildPostComposerPreviewContent({
  access,
  attachment,
  body,
  linkPreview,
  price,
  title,
  videoDetails,
  videoPosterSrc,
}: {
  access: "free" | "paid";
  attachment: AttachmentState;
  body: string;
  linkPreview?: LinkPreviewState;
  price: string;
  title: string;
  videoDetails?: VideoDetailsState;
  videoPosterSrc?: string;
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
    return {
      type: "song",
      title: title || attachment.label || "Untitled track",
      artworkSrc: "https://picsum.photos/seed/post-composer-song-preview/240/240",
      accessMode,
      listingMode: access === "paid" ? "listed" : "not_listed",
      listingStatus: access === "paid" ? "active" : undefined,
      priceLabel: access === "paid" ? priceLabel : undefined,
      playbackState: "idle",
    };
  }

  return {
    type: "text",
    body: bodyText || "Live event",
  };
}
