import { ArrowSquareOut } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { defaultRouteCopy } from "../../system/route-copy-defaults";
import type { RoutesMessages } from "@/locales";
import { postCardType } from "./post-card.styles";
import type { PostCardContent } from "./post-card.types";

type EmbedContent = Extract<PostCardContent, { type: "embed" }>;

const YOUTUBE_EMBED_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);
const YOUTUBE_IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
const X_WIDGETS_SCRIPT_URL = "https://platform.x.com/widgets.js";
const X_EMBED_SANDBOX = "allow-scripts";

type SafeYouTubeEmbed = {
  src: string;
  title: string;
};

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
}

function extractHtmlAttribute(html: string, tagName: string, attributeName: string): string | null {
  const tagMatch = new RegExp(`<${tagName}\\b[^>]*>`, "iu").exec(html);
  const tag = tagMatch?.[0];
  if (!tag) return null;

  const attributeMatch = new RegExp(`\\s${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)')`, "iu").exec(tag);
  const value = attributeMatch?.[2] ?? attributeMatch?.[3];
  return typeof value === "string" ? decodeHtmlAttribute(value) : null;
}

function resolveSafeYouTubeSrc(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value, "https://www.youtube.com");
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || !YOUTUBE_EMBED_HOSTS.has(url.hostname)
      || !url.pathname.startsWith("/embed/")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function resolveSafeYouTubeEmbed(oembedHtml: string, fallbackTitle: string): SafeYouTubeEmbed | null {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(oembedHtml, "text/html");
    const iframe = document.body.querySelector("iframe");
    const src = resolveSafeYouTubeSrc(iframe?.getAttribute("src") ?? null);
    if (!src) return null;

    const title = iframe?.getAttribute("title")?.trim();
    return {
      src,
      title: title || fallbackTitle,
    };
  }

  const src = resolveSafeYouTubeSrc(extractHtmlAttribute(oembedHtml, "iframe", "src"));
  if (!src) return null;

  return {
    src,
    title: extractHtmlAttribute(oembedHtml, "iframe", "title")?.trim() || fallbackTitle,
  };
}

function findXBlockquote(sourceDocument: Document): Element | null {
  return sourceDocument.body.querySelector("blockquote.twitter-tweet")
    ?? sourceDocument.querySelector("blockquote.twitter-tweet");
}

export function isValidXEmbedHtml(oembedHtml: string): boolean {
  if (typeof DOMParser !== "undefined") {
    const sourceDocument = new DOMParser().parseFromString(oembedHtml, "text/html");
    return Boolean(findXBlockquote(sourceDocument)?.textContent?.trim());
  }

  return /<blockquote\b[^>]*class=(["'])[^"']*\btwitter-tweet\b[^"']*\1/i.test(oembedHtml);
}

export function buildSandboxedXEmbedSrcDoc(oembedHtml: string): string | null {
  if (!isValidXEmbedHtml(oembedHtml)) {
    return null;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <base target="_blank">
    <style>
      html,body{margin:0;padding:0;background:transparent;color-scheme:dark;overflow:hidden;}
      body{display:flex;justify-content:center;}
      .twitter-tweet{margin:0!important;max-width:100%!important;}
    </style>
  </head>
  <body>
    ${oembedHtml}
    <script async charset="utf-8" src="${X_WIDGETS_SCRIPT_URL}"></script>
  </body>
</html>`;
}

function formatXSource(preview: EmbedContent["preview"], onXLabel = "on X"): string {
  const author = preview?.authorName?.trim();
  if (author) return `${author} ${onXLabel}`;

  try {
    const authorUrl = new URL(preview?.authorUrl ?? "");
    const handle = authorUrl.pathname.split("/").filter(Boolean)[0];
    if (handle) return `@${handle} ${onXLabel}`;
  } catch {}

  return "X";
}

function formatEmbedSource(content: EmbedContent, copy: RoutesMessages["common"]): string {
  const preview = content.preview;
  if (content.provider === "youtube") {
    const author = preview?.authorName?.trim();
    if (author) return `${author} ${copy.onYouTube}`;
    return "YouTube";
  }

  return formatXSource(preview, copy.onYouTube);
}

function resolveEmbedText(content: EmbedContent, copy: RoutesMessages["common"]): string {
  if (content.state === "unavailable") {
    return content.provider === "youtube"
      ? copy.youtubeVideoUnavailable
      : copy.xPostUnavailable;
  }

  if (content.provider === "youtube") {
    return content.preview?.title?.trim() || copy.youtubeVideo;
  }

  return content.preview?.text?.trim() || copy.xPost;
}

function resolveEmbedImage(content: EmbedContent): string | null {
  return content.provider === "youtube"
    ? content.preview?.thumbnailUrl ?? null
    : content.preview?.mediaUrl ?? null;
}

export function PostEmbedPreview({ content, className }: { content: EmbedContent; className?: string }) {
  const copy = defaultRouteCopy;
  const text = resolveEmbedText(content, copy.common);
  const imageSrc = resolveEmbedImage(content);

  return (
    <div className={cn("w-full space-y-2 text-start", className)}>
      <a
        className={cn(
          "grid w-full items-stretch gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          imageSrc ? "grid-cols-[minmax(0,7fr)_minmax(5rem,3fr)]" : "grid-cols-1",
        )}
        data-post-card-interactive="true"
        href={content.canonicalUrl}
      >
        <div className="flex min-h-20 min-w-0 items-center rounded-lg border border-border-soft bg-muted/30 px-3 py-2.5">
          <div className="min-w-0 space-y-1">
            <p className={cn(postCardType.title, "line-clamp-2 font-semibold text-foreground")} dir="auto">
              {text}
            </p>
            <div className={cn("flex min-w-0 items-center gap-1.5 text-muted-foreground", postCardType.meta)}>
              <span className="truncate">{formatEmbedSource(content, copy.common)}</span>
              <ArrowSquareOut className="size-4 shrink-0" />
            </div>
          </div>
        </div>
        {imageSrc ? (
          <div className="min-h-20 overflow-hidden rounded-lg">
            <img
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              src={imageSrc}
            />
          </div>
        ) : null}
      </a>
    </div>
  );
}

function OfficialYouTubeEmbed({ content, className }: { content: EmbedContent; className?: string }) {
  const copy = defaultRouteCopy;
  if (content.provider !== "youtube" || content.state !== "embed" || !content.oembedHtml) {
    return <PostEmbedPreview content={content} className={className} />;
  }
  const embed = resolveSafeYouTubeEmbed(content.oembedHtml, copy.common.youtubeVideo);
  if (!embed) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden rounded-lg border border-border-soft bg-black [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0",
        className,
      )}
      data-post-card-interactive="true"
    >
      <iframe
        allow={YOUTUBE_IFRAME_ALLOW}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={embed.src}
        title={embed.title}
      />
    </div>
  );
}

export function OfficialOEmbed({ content, className }: { content: EmbedContent; className?: string }) {
  if (content.provider === "youtube") {
    return <OfficialYouTubeEmbed content={content} className={className} />;
  }

  if (content.state !== "embed" || !content.oembedHtml) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  const srcDoc = buildSandboxedXEmbedSrcDoc(content.oembedHtml);
  if (!srcDoc) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  return (
    <div className={cn("h-[34rem] w-full overflow-hidden rounded-lg border border-border-soft bg-card", className)}>
      <iframe
        className="size-full border-0"
        data-post-card-interactive="true"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox={X_EMBED_SANDBOX}
        srcDoc={srcDoc}
        title={content.preview?.title?.trim() || content.preview?.text?.trim() || defaultRouteCopy.common.xPost}
      />
    </div>
  );
}
