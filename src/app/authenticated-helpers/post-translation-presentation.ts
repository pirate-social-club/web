import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import type { PostPresentationOptions } from "@/app/authenticated-helpers/post-presentation-types";

export function normalizeContentLocale(locale: string | null | undefined): string | null {
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

export function sameContentLanguage(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeContentLocale(left);
  const normalizedRight = normalizeContentLocale(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.startsWith("zh-") || normalizedRight.startsWith("zh-")) {
    return normalizedLeft === normalizedRight || normalizedLeft === "zh-Hans" && normalizedRight === "zh";
  }
  return normalizedLeft.split("-")[0] === normalizedRight.split("-")[0];
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
    case "video":
    case "song":
      return ["title", "caption"];
    case "text":
    default:
      return ["title", "body"];
  }
}

function hasVisibleTranslationDifference(translated: string | null | undefined, original: string | null | undefined): boolean {
  return translated != null && translated !== original;
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
