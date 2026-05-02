"use client";

import type { CommentListItem as ApiCommentListItem } from "@pirate/api-contracts";
import type { Community as ApiCommunity } from "@pirate/api-contracts";
import type { CommunityPreview as ApiCommunityPreview } from "@pirate/api-contracts";
import type { CommunityListing as ApiCommunityListing } from "@pirate/api-contracts";
import type { CommunityPurchase as ApiCommunityPurchase } from "@pirate/api-contracts";
import type { HomeFeedItem as ApiHomeFeedItem } from "@pirate/api-contracts";
import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";
import type { Profile as ApiProfile } from "@pirate/api-contracts";

import { buildPublicProfilePathForProfile, getProfileHandleLabel } from "@/lib/profile-routing";
import type { FeedItem } from "@/components/compositions/posts/feed/feed";
import type { PostCardProps, SongContentSpec } from "@/components/compositions/posts/post-card/post-card.types";
import { buildNationalityBadgeLabel } from "@/components/compositions/posts/post-card/post-card-nationality";
import { buildCommunityPath, formatCommunityRouteLabel } from "@/lib/community-routing";

import type { AssetSourceDescriptor, SongPlaybackController, SongPlaybackDescriptor } from "@/app/authenticated-helpers/song-commerce";
import { centsToUsd, formatUsdLabel } from "@/lib/formatting/currency";
import { formatRelativeTimestamp } from "@/lib/formatting/time";

export type HomeFeedEntry = ApiHomeFeedItem;
export { toHomeFeedItem } from "@/app/authenticated-helpers/home-feed-presentation";
export type { PostVoteValue } from "@/app/authenticated-helpers/post-vote";

export type SongPresentationOptions = {
  currentUserId?: string | null;
  listing?: ApiCommunityListing;
  localeTag?: string;
  purchase?: ApiCommunityPurchase;
  playback?: SongPlaybackController;
  onBuy?: () => void;
};

export type PostPresentationOptions = {
  commentCountOverride?: number;
  onVote?: PostCardProps["onVote"];
  onComment?: PostCardProps["onComment"];
  preferOriginalText?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeContentLocale(locale: string | null | undefined): string | null {
  const trimmed = String(locale ?? "").trim();
  if (!trimmed) return null;
  const lowered = trimmed.replace(/_/gu, "-").toLowerCase();
  if (lowered === "pt" || lowered === "pt-br") return "pt-BR";
  if (lowered === "zh" || lowered === "zh-cn" || lowered === "zh-hans") return "zh-Hans";
  if (lowered === "zh-tw" || lowered === "zh-hk" || lowered === "zh-hant") return "zh-Hant";
  const [language, ...rest] = lowered.split("-").filter(Boolean);
  if (!language) return null;
  return rest.length ? [language, ...rest.map((segment) => segment.length === 4
    ? segment[0]!.toUpperCase() + segment.slice(1)
    : segment.toUpperCase())].join("-") : language;
}

function resolveLinkEnrichmentForLocale(
  enrichment: Record<string, unknown> | null | undefined,
  locale: string | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!isRecord(enrichment)) {
    return enrichment;
  }

  const normalizedLocale = normalizeContentLocale(locale);
  if (!normalizedLocale || normalizedLocale === "en") {
    return enrichment;
  }

  const translations = isRecord(enrichment.translations) ? enrichment.translations : null;
  const exact = translations && isRecord(translations[normalizedLocale]) ? translations[normalizedLocale] : null;
  const language = normalizedLocale.split("-")[0];
  const languageMatch = !exact && translations && language
    ? Object.entries(translations).find(([key, value]) => key.split("-")[0] === language && isRecord(value))?.[1]
    : null;
  const translated = exact ?? (isRecord(languageMatch) ? languageMatch : null);
  if (!translated) {
    return enrichment;
  }

  const translatedSummary = isRecord(translated.summary) ? translated.summary : null;
  return {
    ...enrichment,
    title: typeof translated.title === "string" && translated.title.trim() ? translated.title : enrichment.title,
    description: typeof translated.description === "string" && translated.description.trim() ? translated.description : enrichment.description,
    summary: translatedSummary
      ? {
        ...(isRecord(enrichment.summary) ? enrichment.summary : {}),
        short_summary: translatedSummary.short_summary,
        summary_paragraph: translatedSummary.summary_paragraph,
        key_points: translatedSummary.key_points,
      }
      : enrichment.summary,
  };
}

function extractLinkSummary(
  enrichment: Record<string, unknown> | null | undefined,
): NonNullable<Extract<PostCardProps["content"], { type: "link" }>["summary"]> | undefined {
  if (!isRecord(enrichment?.summary)) {
    return undefined;
  }

  const summary = enrichment.summary;
  const shortSummary = typeof summary.short_summary === "string"
    ? summary.short_summary.trim()
    : null;
  const summaryParagraph = typeof summary.summary_paragraph === "string"
    ? summary.summary_paragraph.trim()
    : null;
  const keyPoints = Array.isArray(summary.key_points)
    ? summary.key_points
      .filter((point): point is string => typeof point === "string")
      .map((point) => point.trim())
      .filter(Boolean)
    : [];
  const status = typeof summary.status === "string"
    ? summary.status
    : null;

  if (!summaryParagraph && !shortSummary && keyPoints.length === 0) {
    return undefined;
  }

  return {
    status: status === "pending"
      || status === "ready"
      || status === "failed"
      || status === "unavailable"
      || status === "manual"
      ? status
      : null,
    shortSummary,
    summaryParagraph,
    keyPoints,
  };
}

function formatLinkSourceLabel(url: string | null | undefined, enrichment: Record<string, unknown> | null | undefined): string | undefined {
  try {
    const hostname = new URL(url ?? "").hostname.replace(/^www\./u, "");
    return hostname || undefined;
  } catch {
    const publisher = typeof enrichment?.publisher === "string" ? enrichment.publisher.trim() : "";
    if (publisher) return publisher;
    return undefined;
  }
}

function extractPublishedLabel(enrichment: Record<string, unknown> | null | undefined): string | undefined {
  const raw = typeof enrichment?.published_at === "string" ? enrichment.published_at : "";
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const oneMinuteMs = 60_000;
  const oneHourMs = 60 * oneMinuteMs;
  const oneDayMs = 24 * oneHourMs;
  if (diffMs >= 0 && diffMs < oneDayMs) {
    if (diffMs < oneHourMs) {
      const minutes = Math.max(1, Math.floor(diffMs / oneMinuteMs));
      return `${minutes}m ago`;
    }
    const hours = Math.max(1, Math.floor(diffMs / oneHourMs));
    return `${hours}h ago`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfPublishedDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  if (startOfToday - startOfPublishedDay === oneDayMs) {
    return "Yesterday";
  }

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(parsed.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function formatQualifierLabel(qualifierTemplateId: string): string {
  const trimmed = qualifierTemplateId.trim();
  if (!trimmed) return "Qualifier";

  const normalized = trimmed
    .replace(/^qlf_/iu, "")
    .replace(/^vc_/iu, "")
    .replace(/^proof_/iu, "");

  if (normalized === "age_over_18") return "18+";
  if (normalized === "unique_human") return "Unique Human";

  return normalized
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

export function resolveAnonymousComposerLabel(
  scope: ApiCommunity["anonymous_identity_scope"] | undefined | null,
): string {
  switch (scope) {
    case "thread_stable":
      return "Pseudonym";
    case "post_ephemeral":
      return "Pseudonym";
    case "community_stable":
    default:
      return "Pseudonym";
  }
}

export function resolveAnonymousComposerDescription(
  scope: ApiCommunity["anonymous_identity_scope"] | undefined | null,
): string {
  switch (scope) {
    case "thread_stable":
      return "Same identity in this thread";
    case "post_ephemeral":
      return "New identity for this post";
    case "community_stable":
    default:
      return "Same identity across this community";
  }
}

export function resolvePublicIdentityLabel(
  profile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string | null {
  if (!profile?.global_handle?.label) {
    return null;
  }

  return getProfileHandleLabel(profile);
}

export function resolvePublicAuthorFallback(
  authorUserId?: string | null,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  return resolvePublicIdentityLabel(authorProfile)
    ?? (authorUserId ? authorUserId.slice(0, 8) : "Pirate user");
}

export function resolvePostAuthorLabel(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "anonymous_label" | "author_user" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? "anon";
  }

  return post.authorship_mode === "user_agent" && post.agent_display_name_snapshot
    ? post.agent_display_name_snapshot
    : resolvePublicAuthorFallback(post.author_user, authorProfile);
}

export function resolvePostAuthorAvatarSeed(
  post: Pick<ApiPost["post"], "anonymous_label" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "id"> | null,
): string | undefined {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? post.author_user ?? undefined;
  }
  return authorProfile?.id ?? post.author_user ?? undefined;
}

export function resolveAgentAuthor(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "agent_owner_handle_snapshot" | "author_user" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
) {
  if (post.identity_mode !== "public" || post.authorship_mode !== "user_agent" || !post.agent_display_name_snapshot) {
    return undefined;
  }

  const ownerLabel = post.agent_owner_handle_snapshot?.trim()
    || resolvePublicIdentityLabel(authorProfile)
    || resolvePublicAuthorFallback(post.author_user, authorProfile);
  const ownerHref = post.author_user && authorProfile
    ? buildPublicProfilePathForProfile(authorProfile)
    : undefined;

  return {
    label: post.agent_display_name_snapshot,
    ownerLabel,
    ownerHref,
  };
}

export function resolveCommentAuthorLabel(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? "anon";
  }

  return resolvePublicAuthorFallback(comment.author_user, authorProfile);
}

export function resolveCommentAuthorAvatarSeed(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_user" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "id"> | null,
): string | undefined {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? comment.author_user ?? undefined;
  }
  return authorProfile?.id ?? comment.author_user ?? undefined;
}

export function resolvePostQualifierLabels(postResponse: ApiPost): string[] | undefined {
  const disclosedQualifierLabels = postResponse.post.disclosed_qualifiers_json
    ?.map((qualifier) => qualifier.rendered_label?.trim())
    .filter((label): label is string => Boolean(label));

  if (disclosedQualifierLabels?.length) {
    return disclosedQualifierLabels;
  }

  return postResponse.label?.label ? [postResponse.label.label] : undefined;
}

export function toViewerVote(value: ApiPost["viewer_vote"]): PostCardProps["engagement"]["viewerVote"] {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}

export function getPostCommentCount(postResponse: ApiPost): number {
  return postResponse.comment_count ?? postResponse.thread_snapshot?.comment_count ?? 0;
}

export function toCommentViewerVote(value: ApiCommentListItem["viewer_vote"]): "up" | "down" | null {
  if (value === 1) return "up";
  if (value === -1) return "down";
  return null;
}

function toSongPlaybackDescriptor(
  postResponse: ApiPost,
  input: {
    currentUserId?: string | null;
    purchase?: ApiCommunityPurchase;
  },
): SongPlaybackDescriptor | null {
  const { post } = postResponse;
  const mediaRef = post.media_refs?.[0]?.storage_ref ?? null;
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = !isLocked || viewerOwnsPost || Boolean(input.purchase);

  if (!isLocked && mediaRef) {
    return {
      key: `public:${post.id}`,
      title: post.title ?? "song",
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  if (hasFullAccess && post.asset) {
    return {
      key: `asset:${post.asset}`,
      title: post.title ?? "song",
      kind: "asset",
      communityId: post.community,
      assetId: post.asset,
    };
  }

  if (mediaRef) {
    return {
      key: `preview:${post.id}`,
      title: post.title ?? "song preview",
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  return null;
}

function toVideoAssetSourceDescriptor(
  postResponse: ApiPost,
  input: {
    currentUserId?: string | null;
    purchase?: ApiCommunityPurchase;
  },
): AssetSourceDescriptor | null {
  const { post } = postResponse;
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = isLocked && (viewerOwnsPost || Boolean(input.purchase));

  if (!hasFullAccess || !post.asset) {
    return null;
  }

  return {
    key: `video-asset:${post.asset}`,
    title: post.title ?? "video",
    communityId: post.community,
    assetId: post.asset,
  };
}

export function resolveTranslatedTextPresentation(resolvedLocale: string | null | undefined): {
  dir?: "rtl";
  lang?: string;
} {
  const normalized = String(resolvedLocale ?? "").toLowerCase();
  if (normalized === "ar" || normalized.startsWith("ar-")) {
    return { dir: "rtl", lang: "ar" };
  }
  return {};
}

type RenderedTranslationField = "title" | "body" | "caption";

function renderedTranslationFields(post: ApiPost["post"]): RenderedTranslationField[] {
  switch (post.post_type) {
    case "image":
      return ["title", "caption"];
    case "link":
      return ["title", "body"];
    case "song":
    case "video":
      return ["title"];
    case "text":
    default:
      return ["title", "body"];
  }
}

function hasVisibleTranslationDifference(translated: string | null | undefined, original: string | null | undefined): boolean {
  return translated != null && translated !== original;
}

export function canShowOriginalToggle(postResponse: ApiPost, opts?: Pick<PostPresentationOptions, "showOriginalLabel" | "showTranslationLabel">): boolean {
  return shouldShowOriginalPost(postResponse)
    && Boolean(postResponse.post.source_language)
    && Boolean(opts?.showOriginalLabel)
    && Boolean(opts?.showTranslationLabel);
}

export function withTranslationToggleProps(
  card: PostCardProps,
  postResponse: ApiPost,
  opts?: Pick<PostPresentationOptions, "showOriginalLabel" | "showTranslationLabel">,
): PostCardProps {
  if (!canShowOriginalToggle(postResponse, opts)) {
    return card;
  }

  return {
    ...card,
    showOriginalLabel: opts?.showOriginalLabel,
    showTranslationLabel: opts?.showTranslationLabel,
    sourceLanguage: postResponse.post.source_language,
  };
}

export function toCommunityPostContent(
  postResponse: ApiPost,
  songOptions?: SongPresentationOptions,
  opts?: { embedMode?: "preview" | "official"; preferOriginalText?: boolean },
): PostCardProps["content"] {
  const { post, translated_body, translated_caption, translated_title } = postResponse;
  const resolvedBody = opts?.preferOriginalText ? post.body ?? "" : translated_body ?? post.body ?? "";
  const resolvedCaption = opts?.preferOriginalText ? post.caption ?? undefined : translated_caption ?? post.caption ?? undefined;
  const translatedTextPresentation = !opts?.preferOriginalText && postResponse.translation_state === "ready"
    ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
    : {};
  const linkLocale = opts?.preferOriginalText
    ? post.source_language
    : postResponse.translation_state === "ready"
      ? postResponse.resolved_locale
      : post.source_language;
  const linkTextPresentation = linkLocale ? resolveTranslatedTextPresentation(linkLocale) : {};
  const primaryMedia = post.media_refs?.[0];
  const imageMedia = primaryMedia as ({ width?: number | null; height?: number | null } & typeof primaryMedia) | undefined;
  const title = opts?.preferOriginalText ? (post.title ?? "Untitled post") : (translated_title ?? post.title ?? "Untitled post");

  switch (post.post_type) {
    case "image": {
      const aspectRatio = typeof imageMedia?.width === "number" && typeof imageMedia?.height === "number" && imageMedia.height > 0
        ? imageMedia.width / imageMedia.height
        : undefined;
      return {
        type: "image",
        aspectRatio,
        alt: title,
        caption: resolvedCaption,
        captionDir: translatedTextPresentation.dir,
        captionLang: translatedTextPresentation.lang,
        src: primaryMedia?.storage_ref ?? "",
      };
    }
    case "video": {
      const listing = songOptions?.listing;
      const purchase = songOptions?.purchase;
      const accessMode = post.access_mode ?? "public";
      const assetSourceDescriptor = toVideoAssetSourceDescriptor(postResponse, {
        currentUserId: songOptions?.currentUserId,
        purchase,
      });
      const assetSourceState = assetSourceDescriptor && songOptions?.playback
        ? songOptions.playback.getAssetSourceState(assetSourceDescriptor.key)
        : undefined;
      return {
        type: "video",
        accessMode,
        ageGatePolicy: post.age_gate_policy,
        analysisState: post.analysis_state,
        contentSafetyState: post.content_safety_state,
        durationMs: primaryMedia?.duration_ms ?? undefined,
        hasEntitlement: accessMode === "public"
          || Boolean(purchase)
          || Boolean(songOptions?.currentUserId && post.author_user === songOptions.currentUserId),
        listingMode: listing ? "listed" : "not_listed",
        listingStatus: listing?.status === "active"
          ? "active"
          : listing?.status === "paused"
          ? "paused"
          : undefined,
        onBuy: songOptions?.onBuy,
        onPlay: assetSourceDescriptor && songOptions?.playback
          ? () => void songOptions.playback?.loadAssetSource(assetSourceDescriptor)
          : undefined,
        playbackState: assetSourceState?.playbackState ?? "idle",
        posterSrc: primaryMedia?.poster_ref ?? undefined,
        priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), songOptions?.localeTag) : undefined,
        src: assetSourceState?.src ?? primaryMedia?.storage_ref ?? "",
        title,
      };
    }
    case "link":
      if (post.embeds?.[0]?.provider === "x") {
        const embed = post.embeds[0];
        return {
          type: "embed",
          body: resolvedBody || undefined,
          bodyDir: translatedTextPresentation.dir,
          bodyLang: translatedTextPresentation.lang,
          canonicalUrl: embed.canonical_url,
          oembedHtml: embed.oembed_html,
          originalUrl: embed.original_url,
          preview: {
            authorName: embed.preview?.author_name,
            authorUrl: embed.preview?.author_url,
            createdAt: embed.preview?.created,
            hasMedia: embed.preview?.has_media,
            mediaUrl: embed.preview?.media_url,
            text: embed.preview?.text,
          },
          provider: "x",
          renderMode: opts?.embedMode ?? "preview",
          state: embed.state,
        };
      }
      if (post.embeds?.[0]?.provider === "youtube") {
        const embed = post.embeds[0];
        return {
          type: "embed",
          body: resolvedBody || undefined,
          bodyDir: translatedTextPresentation.dir,
          bodyLang: translatedTextPresentation.lang,
          canonicalUrl: embed.canonical_url,
          oembedHtml: embed.oembed_html,
          originalUrl: embed.original_url,
          preview: {
            authorName: embed.preview?.author_name,
            authorUrl: embed.preview?.author_url,
            thumbnailHeight: embed.preview?.thumbnail_height,
            thumbnailUrl: embed.preview?.thumbnail_url,
            thumbnailWidth: embed.preview?.thumbnail_width,
            title: embed.preview?.title,
          },
          provider: "youtube",
          renderMode: opts?.embedMode ?? "preview",
          state: embed.state,
        };
      }
      if (post.embeds?.[0]?.provider === "kalshi" || post.embeds?.[0]?.provider === "polymarket") {
        const embed = post.embeds[0];
        const translatedEmbed = postResponse.translated_embeds?.find((item) => item.embed_key === embed.embed_key);
        const translatedEmbedPresentation = translatedEmbed?.translated_question && postResponse.translation_state === "ready"
          ? resolveTranslatedTextPresentation(postResponse.resolved_locale)
          : {};
        return {
          type: "embed",
          body: resolvedBody || undefined,
          bodyDir: translatedTextPresentation.dir,
          bodyLang: translatedTextPresentation.lang,
          canonicalUrl: embed.canonical_url,
          oembedHtml: embed.oembed_html,
          originalUrl: embed.original_url,
          preview: {
            chart: embed.preview?.chart?.map((point) => ({
              openInterest: point.open_interest,
              price: point.price,
              ts: point.ts,
              volume: point.volume,
            })),
            closeTime: embed.preview?.close_time,
            imageUrl: embed.preview?.image_url,
            lastPrice: embed.preview?.last_price,
            liquidity: embed.preview?.liquidity,
            noAsk: embed.preview?.no_ask,
            noBid: embed.preview?.no_bid,
            openInterest: embed.preview?.open_interest,
            question: embed.preview?.question,
            questionDir: translatedEmbedPresentation.dir,
            questionLang: translatedEmbedPresentation.lang,
            resolution: embed.preview?.resolution,
            resolvedOutcome: embed.preview?.resolved_outcome,
            status: embed.preview?.status,
            title: embed.preview?.title,
            translatedQuestion: postResponse.translation_state === "ready"
              ? translatedEmbed?.translated_question
              : null,
            updatedAt: embed.preview?.updated_at,
            volume: embed.preview?.volume,
            volume24h: embed.preview?.volume_24h,
            yesAsk: embed.preview?.yes_ask,
            yesBid: embed.preview?.yes_bid,
            yesPrice: embed.preview?.yes_price,
            outcomes: embed.preview?.outcomes?.map((outcome) => ({
              label: outcome.label,
              translatedLabel: postResponse.translation_state === "ready"
                ? translatedEmbed?.translated_outcomes?.find((item) => item.label === outcome.label)?.translated_label
                : null,
              probability: outcome.probability,
            })),
          },
          provider: embed.provider,
          renderMode: "preview",
          state: embed.state,
        };
      }
      const localizedLinkEnrichment = resolveLinkEnrichmentForLocale(post.link_enrichment, linkLocale);
      return {
        type: "link",
        body: resolvedBody || undefined,
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
        href: post.link_url ?? "#",
        linkLabel: post.link_url ?? undefined,
        sourceLabel: formatLinkSourceLabel(post.link_url, post.link_enrichment),
        publishedLabel: extractPublishedLabel(post.link_enrichment),
        previewTitle: typeof localizedLinkEnrichment?.title === "string"
          ? localizedLinkEnrichment.title
          : post.link_og_title ?? undefined,
        previewTitleDir: linkTextPresentation.dir,
        previewTitleLang: linkTextPresentation.lang,
        previewImageSrc: post.link_og_image_url ?? undefined,
        summary: extractLinkSummary(localizedLinkEnrichment),
        summaryDir: linkTextPresentation.dir,
        summaryLang: linkTextPresentation.lang,
      };
    case "song": {
      const listing = songOptions?.listing;
      const purchase = songOptions?.purchase;
      const playback = songOptions?.playback;
      const playbackDescriptor = toSongPlaybackDescriptor(postResponse, {
        currentUserId: songOptions?.currentUserId,
        purchase,
      });
      const playbackState: SongContentSpec["playbackState"] = playbackDescriptor && playback
        ? playback.getPlaybackState(playbackDescriptor.key)
        : "idle";
      const upstreamAttributions = post.upstream_asset_refs?.map((assetRef, index) => ({
        assetId: assetRef,
        relationshipType: "remix_of" as const,
        title: `Source ${index + 1}`,
      }));

      return {
        type: "song",
        accessMode: post.access_mode ?? "public",
        ageGatePolicy: post.age_gate_policy,
        analysisState: post.analysis_state,
        contentSafetyState: post.content_safety_state,
        hasEntitlement: (post.access_mode ?? "public") === "public"
          || Boolean(purchase)
          || Boolean(songOptions?.currentUserId && post.author_user === songOptions.currentUserId),
        listingMode: listing ? "listed" : "not_listed",
        listingStatus: listing?.status === "active"
          ? "active"
          : listing?.status === "paused"
          ? "paused"
          : undefined,
        onBuy: songOptions?.onBuy,
        onPause: playbackDescriptor && playback ? () => playback.pauseTrack(playbackDescriptor.key) : undefined,
        onPlay: playbackDescriptor && playback ? () => void playback.playTrack(playbackDescriptor) : undefined,
        playbackState,
        priceLabel: listing ? formatUsdLabel(centsToUsd(listing.price_cents), songOptions?.localeTag) : undefined,
        rightsBasis: post.rights_basis ?? undefined,
        songMode: post.song_mode ?? undefined,
        title,
        upstreamAttributions: upstreamAttributions?.length ? upstreamAttributions : undefined,
      };
    }
    case "text":
    default:
      return {
        type: "text",
        body: resolvedBody,
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
      };
  }
}

export function toCommunityFeedItem(
  postResponse: ApiPost,
  authorProfiles: Record<string, ApiProfile | null>,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): FeedItem {
  const { post } = postResponse;
  const authorProfile = post.author_user ? authorProfiles[post.author_user] ?? undefined : undefined;

  const localizedPost = withTranslationToggleProps({
      byline: {
        author: {
          kind: "user",
          label: resolvePostAuthorLabel(post, authorProfile),
          avatarSeed: resolvePostAuthorAvatarSeed(post, authorProfile),
          avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
          href: post.identity_mode === "public" && post.author_user && authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined,
        },
        agentAuthor: resolveAgentAuthor(post, authorProfile),
        timestampLabel: formatRelativeTimestamp(post.created),
      },
      content: toCommunityPostContent(postResponse, songOptions),
      engagement: {
        commentCount: getPostCommentCount(postResponse),
        score: postResponse.upvote_count - postResponse.downvote_count,
        viewerVote: toViewerVote(postResponse.viewer_vote),
      },
      authorCommunityRole: postResponse.author_community_role ?? undefined,
      identityPresentation: post.identity_mode === "anonymous" ? "anonymous_primary" : "author_primary",
      authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
      authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
        ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
        : undefined,
      onComment: opts?.onComment,
      onVote: opts?.onVote,
      postHref: `/p/${post.id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: postResponse.translated_title ?? post.title ?? undefined,
      titleDir: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir : undefined,
      titleLang: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang : undefined,
      titleHref: `/p/${post.id}`,
      viewContext: "community",
    },
    postResponse,
    opts,
  );
  const originalPost = canShowOriginalToggle(postResponse, opts)
    ? withTranslationToggleProps({
      ...localizedPost,
      content: toCommunityPostContent(postResponse, songOptions, { preferOriginalText: true }),
      title: post.title ?? undefined,
      titleDir: undefined,
      titleLang: undefined,
    }, postResponse, opts)
    : undefined;

  return {
    id: post.id,
    post: localizedPost,
    postOriginal: originalPost,
  };
}


export function toThreadPostCard(
  postResponse: ApiPost,
  community:
    | Pick<ApiCommunity, "id" | "display_name" | "namespace_verification" | "route_slug">
    | Pick<ApiCommunityPreview, "id" | "display_name" | "namespace_verification" | "route_slug">
    | null,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): PostCardProps {
  const { post } = postResponse;
  const communityVerified = Boolean(community?.namespace_verification);
  const communityLabel = community?.id
    ? communityVerified
      ? formatCommunityRouteLabel(community.id, community.route_slug)
      : community.display_name?.trim() || formatCommunityRouteLabel(community.id, community.route_slug)
    : undefined;

  return withTranslationToggleProps({
    byline: {
      author: {
        kind: "user",
        label: resolvePostAuthorLabel(post, authorProfile),
        avatarSeed: resolvePostAuthorAvatarSeed(post, authorProfile),
        avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
        href: post.identity_mode === "public" && post.author_user && authorProfile
          ? buildPublicProfilePathForProfile(authorProfile)
          : undefined,
      },
      agentAuthor: resolveAgentAuthor(post, authorProfile),
      community: community?.id
        ? {
          kind: "community",
          label: communityLabel ?? community.id,
          href: buildCommunityPath(community.id, community.route_slug),
          verificationStatus: communityVerified ? undefined : "unverified",
        }
        : undefined,
      timestampLabel: formatRelativeTimestamp(post.created),
    },
    content: toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" }),
    engagement: {
      commentCount: opts?.commentCountOverride ?? getPostCommentCount(postResponse),
      score: postResponse.upvote_count - postResponse.downvote_count,
      viewerVote: toViewerVote(postResponse.viewer_vote),
    },
    authorCommunityRole: postResponse.author_community_role ?? undefined,
    identityPresentation: "community_with_author",
    authorNationalityBadgeCountry: post.identity_mode === "public" ? authorProfile?.nationality_badge_country ?? undefined : undefined,
    authorNationalityBadgeLabel: post.identity_mode === "public" && authorProfile?.nationality_badge_country
      ? buildNationalityBadgeLabel(authorProfile.nationality_badge_country)
      : undefined,
    onComment: opts?.onComment,
    onVote: opts?.onVote,
    postHref: `/p/${post.id}`,
    qualifierLabels: resolvePostQualifierLabels(postResponse),
    title: opts?.preferOriginalText
      ? post.title ?? undefined
      : postResponse.translated_title ?? post.title ?? undefined,
    titleDir: !opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir
      : undefined,
    titleLang: !opts?.preferOriginalText && postResponse.translation_state === "ready"
      ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang
      : undefined,
    titleHref: `/p/${post.id}`,
    viewContext: "home",
  }, postResponse, opts);
}

export function shouldShowOriginalPost(postResponse: ApiPost): boolean {
  if (postResponse.translation_state !== "ready") {
    return false;
  }

  return renderedTranslationFields(postResponse.post).some((field) => {
    switch (field) {
      case "title":
        return hasVisibleTranslationDifference(postResponse.translated_title, postResponse.post.title);
      case "body":
        return hasVisibleTranslationDifference(postResponse.translated_body, postResponse.post.body);
      case "caption":
        return hasVisibleTranslationDifference(postResponse.translated_caption, postResponse.post.caption);
    }
  });
}
