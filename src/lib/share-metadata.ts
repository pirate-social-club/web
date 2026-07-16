import type { CommunityPreview, LocalizedPostResponse } from "@pirate/api-contracts";

import type { SeoMetadata } from "@/app/app-context";
import { getLocaleMessages, type RoutesMessages } from "@/locales";
import { resolveLocaleLanguageTag, type UiLocaleCode } from "@/lib/ui-locale-core";
import type { PublicAgentResolution, PublicProfileResolution } from "@/worker-public.types";

export type PublicCommunityPreviewResponse = CommunityPreview & {
  omitted_surfaces?: unknown;
  links?: unknown;
};

export type PublicPostResponse = LocalizedPostResponse & {
  community?: PublicCommunityPreviewResponse | null;
  omitted_surfaces?: unknown;
  links?: unknown;
};

const ROUTE_KINDS_WITH_ENTITY_SEO = new Set([
  "community",
  "crosspost",
  "live-room",
  "post",
  "public-agent",
  "public-profile",
  "telegram-community",
  "telegram-post",
]);

const SHARE_PREVIEW_QUERY_KEY = "share";
const META_DESCRIPTION_MAX_LENGTH = 180;
export const DEFAULT_SHARE_IMAGE_PATH = "/og/pirate-share-card.jpg";
export const DEFAULT_SHARE_IMAGE_TYPE = "image/jpeg";
export const DEFAULT_SHARE_IMAGE_WIDTH = 1200;
export const DEFAULT_SHARE_IMAGE_HEIGHT = 630;
const TRANSFORMED_SHARE_IMAGE_QUALITY = 80;
// Must stay in sync with the pirate.sc zone's Image Transformations allowed-origins
// list (Cloudflare dashboard → Images → Transformations). Sources on any other host
// are served untransformed: /cdn-cgi/image/ rejects them with ERROR 9401.
const TRANSFORMABLE_IMAGE_SOURCE_HOSTS = new Set([
  "psc.myfilebase.com",
]);
const TRANSFORMED_SHARE_IMAGE_OPTIONS = [
  `width=${DEFAULT_SHARE_IMAGE_WIDTH}`,
  `height=${DEFAULT_SHARE_IMAGE_HEIGHT}`,
  "fit=cover",
  "format=jpeg",
  `quality=${TRANSFORMED_SHARE_IMAGE_QUALITY}`,
  "metadata=none",
  "anim=false",
].join(",");

type ShareImageCandidate = {
  alt?: string | null;
  height?: number | null;
  transformable?: boolean;
  type?: string | null;
  url: string;
  width?: number | null;
};

function normalizeMetaText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function truncateMetaDescription(value: string | null | undefined): string | null {
  const normalized = normalizeMetaText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length <= META_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}...`;
}

function resolvePublicImageUrl(value: string | null | undefined, appOrigin: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = trimmed.startsWith("/") ? new URL(trimmed, appOrigin) : new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isLikelyImageUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = trimmed.startsWith("/") ? new URL(trimmed, "https://pirate.sc") : new URL(trimmed);
    return /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return /\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(trimmed);
  }
}

function resolvePublicShareImageCandidate(
  value: string | null | undefined,
  appOrigin: string,
  metadata?: Omit<ShareImageCandidate, "url">,
): ShareImageCandidate | null {
  const imageUrl = resolvePublicImageUrl(value, appOrigin);
  return imageUrl
    ? {
        alt: metadata?.alt ?? null,
        height: metadata?.height ?? null,
        transformable: metadata?.transformable ?? true,
        type: metadata?.type ?? null,
        url: imageUrl,
        width: metadata?.width ?? null,
      }
    : null;
}

function defaultShareImageCandidate(appOrigin: string, alt: string): ShareImageCandidate {
  return {
    alt,
    height: DEFAULT_SHARE_IMAGE_HEIGHT,
    transformable: false,
    type: DEFAULT_SHARE_IMAGE_TYPE,
    url: new URL(DEFAULT_SHARE_IMAGE_PATH, appOrigin).toString(),
    width: DEFAULT_SHARE_IMAGE_WIDTH,
  };
}

function firstPublicImageCandidate(
  values: Array<string | null | undefined>,
  appOrigin: string,
  metadata?: Omit<ShareImageCandidate, "url">,
): ShareImageCandidate | null {
  for (const value of values) {
    const image = resolvePublicShareImageCandidate(value, appOrigin, metadata);
    if (image) {
      return image;
    }
  }
  return null;
}

function shouldUseCloudflareImageTransform(appOrigin: string): boolean {
  try {
    const url = new URL(appOrigin);
    return url.protocol === "https:"
      && url.hostname !== "localhost"
      && !url.hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export function shouldAlwaysResolveEntitySeo(route: { kind: string }): boolean {
  return ROUTE_KINDS_WITH_ENTITY_SEO.has(route.kind);
}

export function resolveSharePreviewQueryValue(url: URL): string | null {
  return url.searchParams.has(SHARE_PREVIEW_QUERY_KEY) ? "1" : null;
}

export function buildOpenGraphUrl(
  canonicalUrl: string,
  locale: UiLocaleCode,
  hasLocaleOverride: boolean,
  sharePreviewValue: string | null,
): string {
  if (!hasLocaleOverride && !sharePreviewValue) {
    return canonicalUrl;
  }

  const url = new URL(canonicalUrl);
  if (sharePreviewValue) {
    url.searchParams.set(SHARE_PREVIEW_QUERY_KEY, sharePreviewValue);
  }
  if (hasLocaleOverride) {
    url.searchParams.set("locale", resolveLocaleLanguageTag(locale));
  }
  return url.toString();
}

export function buildCloudflareShareImageUrl(appOrigin: string, sourceUrl: string): string {
  const source = new URL(sourceUrl);
  source.hash = "";
  return `${appOrigin.replace(/\/+$/, "")}/cdn-cgi/image/${TRANSFORMED_SHARE_IMAGE_OPTIONS}/${source.toString()}`;
}

function isTransformableImageSource(sourceUrl: string, appOrigin: string): boolean {
  try {
    const source = new URL(sourceUrl);
    if (TRANSFORMABLE_IMAGE_SOURCE_HOSTS.has(source.hostname)) {
      return true;
    }
    // Same-zone sources never need allowlisting in the transform config.
    return source.hostname === new URL(appOrigin).hostname;
  } catch {
    return false;
  }
}

function shareMetadataFromImageCandidate(appOrigin: string, image: ShareImageCandidate): Pick<
  SeoMetadata,
  "imageAlt" | "imageHeight" | "imageType" | "imageUrl" | "imageWidth"
> {
  const shouldTransform = image.transformable === true
    && shouldUseCloudflareImageTransform(appOrigin)
    && isTransformableImageSource(image.url, appOrigin);
  return {
    imageAlt: image.alt ?? null,
    imageHeight: shouldTransform ? DEFAULT_SHARE_IMAGE_HEIGHT : image.height ?? null,
    imageType: shouldTransform ? DEFAULT_SHARE_IMAGE_TYPE : image.type ?? null,
    imageUrl: shouldTransform ? buildCloudflareShareImageUrl(appOrigin, image.url) : image.url,
    imageWidth: shouldTransform ? DEFAULT_SHARE_IMAGE_WIDTH : image.width ?? null,
  };
}

function firstPostMediaImageCandidate(
  post: LocalizedPostResponse["post"],
  appOrigin: string,
  alt: string,
): ShareImageCandidate | null {
  for (const media of post.media_refs ?? []) {
    const mimeType = media.mime_type?.toLowerCase() ?? null;
    if (mimeType?.startsWith("image/") || (!mimeType && isLikelyImageUrl(media.storage_ref))) {
      const image = resolvePublicShareImageCandidate(media.storage_ref, appOrigin, {
        alt,
        type: media.mime_type ?? null,
      });
      if (image) {
        return image;
      }
      continue;
    }

    const poster = resolvePublicShareImageCandidate(media.poster_ref, appOrigin, {
      alt,
      height: media.poster_height ?? null,
      type: media.poster_mime_type ?? null,
      width: media.poster_width ?? null,
    });
    if (poster) {
      return poster;
    }
  }
  return null;
}

function getPublicIdentityHandleLabel(input: {
  global_handle: { label: string };
  primary_public_handle?: { label: string } | null;
}): string {
  return input.primary_public_handle?.label ?? input.global_handle.label;
}

function joinMetaParts(parts: Array<string | null | undefined>): string | null {
  const normalized = parts.flatMap((part) => {
    const value = normalizeMetaText(part);
    return value ? [value] : [];
  });
  return normalized.length > 0 ? normalized.join(" · ") : null;
}

function resolvePostMediaLabel(
  postType: string | null | undefined,
  copy: RoutesMessages["post"],
): string | null {
  if (postType === "image") return copy.imagePost;
  if (postType === "video") return copy.videoPost;
  if (postType === "song") return copy.song;
  if (postType === "link") return copy.linkPost;
  return null;
}

export function buildCommunitySeoMetadata(input: {
  appOrigin: string;
  locale: UiLocaleCode;
  preview: PublicCommunityPreviewResponse;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes");
  const title = `${input.preview.display_name} • Pirate`;
  const description = truncateMetaDescription(input.preview.description)
    ?? copy.community.shareFallbackDescription;
  const imageAlt = `${input.preview.display_name} on Pirate`;
  const image = firstPublicImageCandidate([
    input.preview.banner_ref,
    input.preview.avatar_ref,
  ], input.appOrigin, { alt: imageAlt })
    ?? defaultShareImageCandidate(input.appOrigin, imageAlt);

  return {
    description,
    ...shareMetadataFromImageCandidate(input.appOrigin, image),
    title,
    type: "website",
  };
}

export function buildPostSeoMetadata(input: {
  appOrigin: string;
  community: PublicCommunityPreviewResponse | null;
  locale: UiLocaleCode;
  postResponse: PublicPostResponse;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes");
  const post = input.postResponse.post;
  const community = input.community ?? input.postResponse.community ?? null;
  const postTitleText = normalizeMetaText(input.postResponse.translated_title ?? post.title);
  const linkTitleText = normalizeMetaText(post.link_og_title);
  const mediaLabel = resolvePostMediaLabel(post.post_type, copy.post);
  const contentText = normalizeMetaText(
    input.postResponse.translated_body
      ?? input.postResponse.translated_caption
      ?? post.body
      ?? post.caption,
  );
  const titleText = postTitleText ?? linkTitleText;
  const communityName = normalizeMetaText(community?.display_name);
  const contextTitle = communityName
    ? copy.post.titleInCommunity.replace("{name}", communityName)
    : copy.post.postOnPirate;
  // Untitled posts fall back to the community context as the card title; titled
  // posts carry that context in the description instead so the post title stays
  // the headline.
  const title = titleText ?? contextTitle;
  const imageAlt = `${titleText ?? copy.post.fallbackTitle} on Pirate`;
  const description = truncateMetaDescription(
    contentText
      ?? joinMetaParts([
        mediaLabel,
        titleText ? contextTitle : null,
      ])
      ?? (titleText ? contextTitle : null)
      ?? copy.post.postOnPirate,
  ) ?? copy.post.postOnPirate;
  const image = firstPostMediaImageCandidate(post, input.appOrigin, imageAlt)
    ?? resolvePublicShareImageCandidate(input.postResponse.song_presentation?.cover_art_ref, input.appOrigin, {
      alt: imageAlt,
    })
    ?? firstPublicImageCandidate([
      post.link_og_image_url,
      community?.banner_ref,
      community?.avatar_ref,
    ], input.appOrigin, { alt: imageAlt })
    ?? defaultShareImageCandidate(input.appOrigin, imageAlt);

  return {
    description,
    ...shareMetadataFromImageCandidate(input.appOrigin, image),
    title,
    type: "article",
  };
}

export function buildProfileSeoMetadata(input: {
  appOrigin: string;
  locale: UiLocaleCode;
  resolution: PublicProfileResolution;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes").publicProfile;
  const handle = getPublicIdentityHandleLabel(input.resolution.profile);
  const displayName = normalizeMetaText(input.resolution.profile.display_name) ?? handle;
  const communityCount = input.resolution.created_communities.length;
  const description = truncateMetaDescription(input.resolution.profile.bio)
    ?? (communityCount > 0
      ? communityCount === 1
        ? copy.createdCommunityMeta.replace("{handle}", handle)
        : copy.createdCommunitiesMeta
            .replace("{handle}", handle)
            .replace("{count}", String(communityCount))
      : copy.defaultMeta.replace("{handle}", handle));
  const imageAlt = `${displayName} on Pirate`;
  const image = firstPublicImageCandidate([
    input.resolution.profile.cover_ref,
    input.resolution.profile.avatar_ref,
  ], input.appOrigin, { alt: imageAlt })
    ?? defaultShareImageCandidate(input.appOrigin, imageAlt);

  return {
    description,
    ...shareMetadataFromImageCandidate(input.appOrigin, image),
    title: `${displayName} • Pirate`,
    type: "profile",
  };
}

export function buildAgentSeoMetadata(input: {
  appOrigin: string;
  locale: UiLocaleCode;
  resolution: PublicAgentResolution;
}): SeoMetadata {
  const copy = getLocaleMessages(input.locale, "routes").publicAgent;
  const handle = input.resolution.agent.handle.label_display;
  const displayName = normalizeMetaText(input.resolution.agent.display_name) ?? handle;
  const ownerHandle = getPublicIdentityHandleLabel(input.resolution.owner);
  const description = `${handle} ${copy.ownerLabel.toLowerCase()} ${ownerHandle}.`;

  return {
    description,
    ...shareMetadataFromImageCandidate(input.appOrigin, defaultShareImageCandidate(input.appOrigin, `${displayName} on Pirate`)),
    title: `${displayName} • Pirate Agent`,
    type: "profile",
  };
}
