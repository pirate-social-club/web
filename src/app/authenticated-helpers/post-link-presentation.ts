import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import type { PostPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";
import {
  normalizeContentLocale,
  resolveTranslatedTextPresentation,
  sameContentLanguage,
} from "@/app/authenticated-helpers/post-translation-presentation";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function linkEnrichmentSourceLanguage(enrichment: Record<string, unknown> | null | undefined): string | null {
  return typeof enrichment?.source_language === "string" && enrichment.source_language.trim()
    ? enrichment.source_language.trim()
    : null;
}

function resolveLinkEnrichmentForLocale(
  enrichment: Record<string, unknown> | null | undefined,
  locale: string | null | undefined,
): Record<string, unknown> | null | undefined {
  if (!isRecord(enrichment)) {
    return enrichment;
  }

  const normalizedLocale = normalizeContentLocale(locale);
  if (!normalizedLocale) {
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
    ? summary.key_points.reduce<string[]>((result, point) => {
      if (typeof point !== "string") {
        return result;
      }
      const trimmedPoint = point.trim();
      if (trimmedPoint) {
        result.push(trimmedPoint);
      }
      return result;
    }, [])
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

function normalizeHeadlineForComparison(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/\./gu, "")
    .replace(/[''""`]/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function isRedundantLinkPreviewTitle(postTitle: string | null | undefined, previewTitle: string | null | undefined): boolean {
  const normalizedPostTitle = normalizeHeadlineForComparison(postTitle);
  const normalizedPreviewTitle = normalizeHeadlineForComparison(previewTitle);
  return Boolean(normalizedPostTitle && normalizedPreviewTitle && normalizedPostTitle === normalizedPreviewTitle);
}

function detectClientSideXEmbed(linkUrl: string | null | undefined): { canonicalUrl: string } | null {
  const trimmed = String(linkUrl ?? "").trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.trim().toLowerCase().replace(/\.+$/u, "");
  if (host !== "x.com" && host !== "www.x.com" && host !== "twitter.com" && host !== "www.twitter.com" && host !== "mobile.twitter.com") {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let postId: string | null = null;
  let handle: string | null = null;

  const statusIndex = segments.findIndex((segment) => segment.toLowerCase() === "status");
  if (statusIndex > 0) {
    handle = segments[statusIndex - 1] ?? null;
    postId = segments[statusIndex + 1] ?? null;
  } else if (segments.length >= 4 && segments[0] === "i" && segments[1] === "web" && segments[2] === "status") {
    postId = segments[3] ?? null;
  }

  const normalizedPostId = String(postId ?? "").trim();
  if (!/^\d+$/u.test(normalizedPostId)) return null;

  const normalizedHandle = String(handle ?? "").trim();
  const canonicalPath = normalizedHandle
    ? `/${encodeURIComponent(normalizedHandle)}/status/${normalizedPostId}`
    : `/i/web/status/${normalizedPostId}`;

  return { canonicalUrl: `https://x.com${canonicalPath}` };
}

export function resolveLocalizedLinkTitle(
  postResponse: ApiPost,
  opts?: Pick<PostPresentationOptions, "preferOriginalText" | "viewerContentLocale">,
): { dir?: "ltr" | "rtl"; lang?: string; title?: string } {
  if (postResponse.post.post_type !== "link") {
    return {};
  }

  const linkLocale = opts?.preferOriginalText
    ? postResponse.post.source_language
    : opts?.viewerContentLocale
      ? opts.viewerContentLocale
      : postResponse.translation_state === "ready"
        ? postResponse.resolved_locale
        : postResponse.post.source_language;
  const localized = resolveLinkEnrichmentForLocale(postResponse.post.link_enrichment, linkLocale);
  const title = typeof localized?.title === "string" ? localized.title.trim() : "";
  const sourceLanguage = linkEnrichmentSourceLanguage(postResponse.post.link_enrichment);
  const normalizedLinkLocale = normalizeContentLocale(linkLocale);
  const translations = isRecord(postResponse.post.link_enrichment?.translations)
    ? postResponse.post.link_enrichment.translations
    : null;
  const translationForLocale = normalizedLinkLocale && translations
    ? isRecord(translations[normalizedLinkLocale])
      || Object.entries(translations).some(([key, value]) => key.split("-")[0] === normalizedLinkLocale.split("-")[0] && isRecord(value))
    : false;
  if (
    title
    && !opts?.preferOriginalText
    && sameContentLanguage(linkLocale, "en")
    && sourceLanguage
    && !sameContentLanguage(sourceLanguage, "en")
    && !translationForLocale
  ) {
    const fallbackTitle = postResponse.translated_title ?? postResponse.post.title;
    if (fallbackTitle?.trim()) {
      return {
        dir: resolveTranslatedTextPresentation("en").dir,
        lang: resolveTranslatedTextPresentation("en").lang,
        title: fallbackTitle.trim(),
      };
    }
  }
  if (!title) {
    return {};
  }

  const presentation = linkLocale ? resolveTranslatedTextPresentation(linkLocale) : {};
  return {
    dir: presentation.dir,
    lang: presentation.lang,
    title,
  };
}

/**
 * Resolve the post card's heading title with authored-first precedence.
 *
 * Precedence:
 *   1. non-empty translated authored title (dir/lang from the translation)
 *   2. non-empty original authored title (dir/lang from the source language)
 *   3. localized article enrichment/og title — only for genuinely untitled
 *      link posts (dir/lang from the resolved link locale)
 *
 * Translated and original titles are passed separately (not pre-coalesced) so
 * an empty/whitespace translated title falls through to the original authored
 * title rather than skipping straight to the article title. The article title
 * still drives `content.previewTitle` inside the link preview — this only
 * governs the heading. dir/lang always follow the winning source.
 */
export function resolvePostCardHeadingTitle(input: {
  translatedTitle?: string | null;
  originalTitle?: string | null;
  translatedPresentation?: { dir?: "ltr" | "rtl"; lang?: string };
  originalPresentation?: { dir?: "ltr" | "rtl"; lang?: string };
  localizedLinkTitle: { dir?: "ltr" | "rtl"; lang?: string; title?: string };
}): { dir?: "ltr" | "rtl"; lang?: string; title?: string } {
  const translated = input.translatedTitle?.trim();
  if (translated) {
    return {
      dir: input.translatedPresentation?.dir,
      lang: input.translatedPresentation?.lang,
      title: translated,
    };
  }
  const original = input.originalTitle?.trim();
  if (original) {
    return {
      dir: input.originalPresentation?.dir,
      lang: input.originalPresentation?.lang,
      title: original,
    };
  }
  return {
    dir: input.localizedLinkTitle.dir,
    lang: input.localizedLinkTitle.lang,
    title: input.localizedLinkTitle.title,
  };
}

export function toLinkPostContent(
  postResponse: ApiPost,
  input: {
    bodyDir?: "rtl";
    bodyLang?: string;
    embedMode?: "preview" | "official";
    linkLocale?: string | null;
    linkTextDir?: "rtl";
    linkTextLang?: string;
    preferOriginalText?: boolean;
    resolvedBody?: string;
    title: string;
  },
): PostCardProps["content"] {
  const { post } = postResponse;
  const xEmbed = post.embeds?.[0]?.provider === "x" ? post.embeds[0] : undefined;
  const clientSideX = !xEmbed ? detectClientSideXEmbed(post.link_url) : null;
  if (xEmbed || clientSideX) {
    return {
      type: "embed",
      body: input.resolvedBody || undefined,
      bodyDir: input.bodyDir,
      bodyLang: input.bodyLang,
      canonicalUrl: xEmbed?.canonical_url ?? clientSideX!.canonicalUrl,
      oembedHtml: xEmbed?.oembed_html ?? null,
      originalUrl: xEmbed?.original_url ?? post.link_url ?? undefined,
      preview: {
        authorName: xEmbed?.preview?.author_name ?? null,
        authorUrl: xEmbed?.preview?.author_url ?? null,
        createdAt: xEmbed?.preview?.created ?? null,
        hasMedia: xEmbed?.preview?.has_media ?? null,
        mediaUrl: xEmbed?.preview?.media_url ?? null,
        text: xEmbed?.preview?.text ?? null,
      },
      provider: "x",
      renderMode: input.embedMode ?? "official",
      state: "embed",
    };
  }

  if (post.embeds?.[0]?.provider === "youtube") {
    const embed = post.embeds[0];
    return {
      type: "embed",
      body: input.resolvedBody || undefined,
      bodyDir: input.bodyDir,
      bodyLang: input.bodyLang,
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
      renderMode: input.embedMode ?? "official",
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
      body: input.resolvedBody || undefined,
      bodyDir: input.bodyDir,
      bodyLang: input.bodyLang,
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

  const localizedLinkEnrichment = resolveLinkEnrichmentForLocale(post.link_enrichment, input.linkLocale);
  const localizedLinkTitle = resolveLocalizedLinkTitle(postResponse, {
    preferOriginalText: input.preferOriginalText,
    viewerContentLocale: input.linkLocale ?? undefined,
  });
  const previewTitle = localizedLinkTitle.title ?? (typeof localizedLinkEnrichment?.title === "string"
    ? localizedLinkEnrichment.title
    : post.link_og_title ?? undefined);
  return {
    type: "link",
    body: input.resolvedBody || undefined,
    bodyDir: input.bodyDir,
    bodyLang: input.bodyLang,
    href: post.link_url ?? "#",
    linkLabel: post.link_url ?? undefined,
    sourceLabel: formatLinkSourceLabel(post.link_url, post.link_enrichment),
    publishedLabel: extractPublishedLabel(post.link_enrichment),
    previewTitle: isRedundantLinkPreviewTitle(input.title, previewTitle) ? undefined : previewTitle,
    previewTitleDir: localizedLinkTitle.dir ?? input.linkTextDir,
    previewTitleLang: localizedLinkTitle.lang ?? input.linkTextLang,
    previewImageSrc: post.link_og_image_url ?? undefined,
    summary: extractLinkSummary(localizedLinkEnrichment),
    summaryDir: input.linkTextDir,
    summaryLang: input.linkTextLang,
  };
}
