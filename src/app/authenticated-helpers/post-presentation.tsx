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

import type { AssetSourceDescriptor, SongPlaybackController, SongPlaybackDescriptor } from "@/app/authenticated-helpers/song-commerce";
import { formatUsdLabel } from "@/lib/formatting/currency";
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
  onVote?: PostCardProps["onVote"];
  onComment?: PostCardProps["onComment"];
  preferOriginalText?: boolean;
  showOriginalLabel?: string;
  showTranslationLabel?: string;
};

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
      return "anon_thread";
    case "post_ephemeral":
      return "anon_post";
    case "community_stable":
    default:
      return "anon_community";
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
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "anonymous_label" | "author_user_id" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (post.identity_mode === "anonymous") {
    return post.anonymous_label ?? "anon";
  }

  return post.authorship_mode === "user_agent" && post.agent_display_name_snapshot
    ? post.agent_display_name_snapshot
    : resolvePublicAuthorFallback(post.author_user_id, authorProfile);
}

export function resolveAgentAuthor(
  post: Pick<ApiPost["post"], "agent_display_name_snapshot" | "agent_owner_handle_snapshot" | "author_user_id" | "authorship_mode" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
) {
  if (post.identity_mode !== "public" || post.authorship_mode !== "user_agent" || !post.agent_display_name_snapshot) {
    return undefined;
  }

  const ownerLabel = post.agent_owner_handle_snapshot?.trim()
    || resolvePublicIdentityLabel(authorProfile)
    || resolvePublicAuthorFallback(post.author_user_id, authorProfile);
  const ownerHref = post.author_user_id && authorProfile
    ? buildPublicProfilePathForProfile(authorProfile)
    : undefined;

  return {
    label: post.agent_display_name_snapshot,
    ownerLabel,
    ownerHref,
  };
}

export function resolveCommentAuthorLabel(
  comment: Pick<ApiCommentListItem["comment"], "anonymous_label" | "author_user_id" | "identity_mode">,
  authorProfile?: Pick<ApiProfile, "display_name" | "global_handle" | "primary_public_handle"> | null,
): string {
  if (comment.identity_mode === "anonymous") {
    return comment.anonymous_label ?? "anon";
  }

  return resolvePublicAuthorFallback(comment.author_user_id, authorProfile);
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
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user_id === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = !isLocked || viewerOwnsPost || Boolean(input.purchase);

  if (!isLocked && mediaRef) {
    return {
      key: `public:${post.post_id}`,
      title: post.title ?? "song",
      kind: "source",
      sourcePath: mediaRef,
      requiresAuth: false,
    };
  }

  if (hasFullAccess && post.asset_id) {
    return {
      key: `asset:${post.asset_id}`,
      title: post.title ?? "song",
      kind: "asset",
      communityId: post.community_id,
      assetId: post.asset_id,
    };
  }

  if (mediaRef) {
    return {
      key: `preview:${post.post_id}`,
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
  const viewerOwnsPost = Boolean(input.currentUserId && post.author_user_id === input.currentUserId);
  const isLocked = (post.access_mode ?? "public") === "locked";
  const hasFullAccess = isLocked && (viewerOwnsPost || Boolean(input.purchase));

  if (!hasFullAccess || !post.asset_id) {
    return null;
  }

  return {
    key: `video-asset:${post.asset_id}`,
    title: post.title ?? "video",
    communityId: post.community_id,
    assetId: post.asset_id,
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
          || Boolean(songOptions?.currentUserId && post.author_user_id === songOptions.currentUserId),
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
        priceLabel: listing ? formatUsdLabel(listing.price_usd, songOptions?.localeTag) : undefined,
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
            createdAt: embed.preview?.created_at,
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
      return {
        type: "link",
        body: resolvedBody || undefined,
        bodyDir: translatedTextPresentation.dir,
        bodyLang: translatedTextPresentation.lang,
        href: post.link_url ?? "#",
        linkLabel: post.link_url ?? undefined,
        previewTitle: post.link_og_title ?? undefined,
        previewImageSrc: post.link_og_image_url ?? undefined,
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
          || Boolean(songOptions?.currentUserId && post.author_user_id === songOptions.currentUserId),
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
        priceLabel: listing ? formatUsdLabel(listing.price_usd, songOptions?.localeTag) : undefined,
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
  const authorProfile = post.author_user_id ? authorProfiles[post.author_user_id] ?? undefined : undefined;

  const localizedPost = withTranslationToggleProps({
      byline: {
        author: {
          kind: "user",
          label: resolvePostAuthorLabel(post, authorProfile),
          avatarSeed: post.identity_mode === "public" ? authorProfile?.user_id ?? post.author_user_id ?? undefined : undefined,
          avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
          href: post.identity_mode === "public" && post.author_user_id && authorProfile
            ? buildPublicProfilePathForProfile(authorProfile)
            : undefined,
        },
        agentAuthor: resolveAgentAuthor(post, authorProfile),
        timestampLabel: formatRelativeTimestamp(post.created_at),
      },
      content: toCommunityPostContent(postResponse, songOptions),
      engagement: {
        commentCount: postResponse.thread_snapshot?.comment_count ?? 0,
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
      postHref: `/p/${post.post_id}`,
      qualifierLabels: resolvePostQualifierLabels(postResponse),
      title: postResponse.translated_title ?? post.title ?? undefined,
      titleDir: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).dir : undefined,
      titleLang: postResponse.translation_state === "ready" ? resolveTranslatedTextPresentation(postResponse.resolved_locale).lang : undefined,
      titleHref: `/p/${post.post_id}`,
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
    id: post.post_id,
    post: localizedPost,
    postOriginal: originalPost,
  };
}


export function toThreadPostCard(
  postResponse: ApiPost,
  community: Pick<ApiCommunity, "community_id" | "display_name"> | Pick<ApiCommunityPreview, "community_id" | "display_name"> | null,
  authorProfile?: ApiProfile,
  songOptions?: SongPresentationOptions,
  opts?: PostPresentationOptions,
): PostCardProps {
  const { post } = postResponse;

  return withTranslationToggleProps({
    byline: {
      author: {
        kind: "user",
        label: resolvePostAuthorLabel(post, authorProfile),
        avatarSeed: post.identity_mode === "public" ? authorProfile?.user_id ?? post.author_user_id ?? undefined : undefined,
        avatarSrc: post.identity_mode === "public" ? authorProfile?.avatar_ref ?? undefined : undefined,
        href: post.identity_mode === "public" && post.author_user_id && authorProfile
          ? buildPublicProfilePathForProfile(authorProfile)
          : undefined,
      },
      agentAuthor: resolveAgentAuthor(post, authorProfile),
      community: community
        ? { kind: "community", label: `c/${community.display_name}`, href: `/c/${community.community_id}` }
        : undefined,
      timestampLabel: formatRelativeTimestamp(post.created_at),
    },
    content: toCommunityPostContent(postResponse, songOptions, { ...opts, embedMode: "official" }),
    engagement: {
      commentCount: postResponse.thread_snapshot?.comment_count ?? 0,
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
    postHref: `/p/${post.post_id}`,
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
    titleHref: `/p/${post.post_id}`,
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
