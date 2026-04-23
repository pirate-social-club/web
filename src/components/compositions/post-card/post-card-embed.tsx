import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { postCardType } from "./post-card.styles";
import type { PostCardContent } from "./post-card.types";

type EmbedContent = Extract<PostCardContent, { type: "embed" }>;

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement | null) => Promise<unknown> | void;
      };
    };
  }
}

let xWidgetsLoadPromise: Promise<void> | null = null;
const YOUTUBE_EMBED_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:"]);
const YOUTUBE_IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

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

export function resolveSafeYouTubeEmbed(oembedHtml: string): SafeYouTubeEmbed | null {
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(oembedHtml, "text/html");
    const iframe = document.body.querySelector("iframe");
    const src = resolveSafeYouTubeSrc(iframe?.getAttribute("src") ?? null);
    if (!src) return null;

    const title = iframe?.getAttribute("title")?.trim();
    return {
      src,
      title: title || "YouTube video",
    };
  }

  const src = resolveSafeYouTubeSrc(extractHtmlAttribute(oembedHtml, "iframe", "src"));
  if (!src) return null;

  return {
    src,
    title: extractHtmlAttribute(oembedHtml, "iframe", "title")?.trim() || "YouTube video",
  };
}

function isSafeLinkHref(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeXNode(node: Node, document: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (tagName === "br") {
    return document.createElement("br");
  }

  if (tagName === "p") {
    const paragraph = document.createElement("p");
    const dir = element.getAttribute("dir");
    const lang = element.getAttribute("lang");
    if (dir === "ltr" || dir === "rtl" || dir === "auto") {
      paragraph.setAttribute("dir", dir);
    }
    if (lang?.trim()) {
      paragraph.setAttribute("lang", lang.trim().slice(0, 35));
    }
    for (const child of Array.from(element.childNodes)) {
      const sanitized = sanitizeXNode(child, document);
      if (sanitized) paragraph.append(sanitized);
    }
    return paragraph;
  }

  if (tagName === "a") {
    const href = isSafeLinkHref(element.getAttribute("href"));
    if (!href) return document.createTextNode(element.textContent ?? "");

    const anchor = document.createElement("a");
    anchor.href = href;
    for (const child of Array.from(element.childNodes)) {
      const sanitized = sanitizeXNode(child, document);
      if (sanitized) anchor.append(sanitized);
    }
    if (!anchor.textContent?.trim()) {
      anchor.textContent = href;
    }
    return anchor;
  }

  const fragment = document.createDocumentFragment();
  for (const child of Array.from(element.childNodes)) {
    const sanitized = sanitizeXNode(child, document);
    if (sanitized) fragment.append(sanitized);
  }
  return fragment;
}

export function sanitizeXEmbedHtml(oembedHtml: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const template = document.createElement("template");
  template.innerHTML = oembedHtml;
  const sourceBlockquote = template.content.querySelector("blockquote.twitter-tweet");
  if (!sourceBlockquote) {
    return null;
  }

  const safeDocument = document.implementation?.createHTMLDocument("") ?? document;
  const blockquote = safeDocument.createElement("blockquote");
  blockquote.className = "twitter-tweet";

  for (const child of Array.from(sourceBlockquote.childNodes)) {
    const sanitized = sanitizeXNode(child, safeDocument);
    if (sanitized) blockquote.append(sanitized);
  }

  return blockquote.textContent?.trim() ? blockquote.outerHTML : null;
}

function ensureXWidgetsScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.twttr?.widgets) {
    return Promise.resolve();
  }
  if (xWidgetsLoadPromise) {
    return xWidgetsLoadPromise;
  }

  xWidgetsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-pirate-x-widgets]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("x_widgets_load_failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.dataset.pirateXWidgets = "true";
    script.src = "https://platform.x.com/widgets.js";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("x_widgets_load_failed")), { once: true });
    document.head.append(script);
  });

  return xWidgetsLoadPromise;
}

function formatXSource(preview: EmbedContent["preview"]): string {
  const author = preview?.authorName?.trim();
  if (author) return `${author} on X`;

  try {
    const authorUrl = new URL(preview?.authorUrl ?? "");
    const handle = authorUrl.pathname.split("/").filter(Boolean)[0];
    if (handle) return `@${handle} on X`;
  } catch {}

  return "X";
}

function formatEmbedSource(content: EmbedContent): string {
  const preview = content.preview;
  if (content.provider === "youtube") {
    const author = preview?.authorName?.trim();
    if (author) return `${author} on YouTube`;
    return "YouTube";
  }

  return formatXSource(preview);
}

function resolveEmbedText(content: EmbedContent): string {
  if (content.state === "unavailable") {
    return content.provider === "youtube"
      ? "This YouTube video is unavailable."
      : "This X post is unavailable.";
  }

  if (content.provider === "youtube") {
    return content.preview?.title?.trim() || "YouTube video";
  }

  return content.preview?.text?.trim() || "X post";
}

function resolveEmbedImage(content: EmbedContent): string | null {
  return content.provider === "youtube"
    ? content.preview?.thumbnailUrl ?? null
    : content.preview?.mediaUrl ?? null;
}

export function PostEmbedPreview({ content, className }: { content: EmbedContent; className?: string }) {
  const text = resolveEmbedText(content);
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
              <span className="truncate">{formatEmbedSource(content)}</span>
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
  if (content.provider !== "youtube" || content.state !== "embed" || !content.oembedHtml) {
    return <PostEmbedPreview content={content} className={className} />;
  }
  const embed = resolveSafeYouTubeEmbed(content.oembedHtml);
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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (content.provider !== "x" || content.state !== "embed" || !content.oembedHtml) {
      return;
    }

    let cancelled = false;
    setHydrated(false);
    setFailed(false);
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const sanitizedHtml = sanitizeXEmbedHtml(content.oembedHtml);
    if (!sanitizedHtml) {
      setFailed(true);
      return;
    }

    container.innerHTML = sanitizedHtml;
    const blockquote = container.querySelector<HTMLElement>("blockquote.twitter-tweet");
    blockquote?.setAttribute("data-dnt", "true");
    blockquote?.setAttribute("data-theme", "dark");

    const markHydrated = () => {
      const iframe = container.querySelector<HTMLIFrameElement>(
        "iframe[title='X Post'], iframe[src*='platform.twitter.com/embed/Tweet.html']",
      );
      if (!iframe) return false;

      const renderedTweet = iframe.parentElement;
      if (renderedTweet instanceof HTMLElement) {
        renderedTweet.style.margin = "0";
        renderedTweet.style.maxWidth = "100%";
        renderedTweet.style.width = "100%";
        renderedTweet.style.overflow = "hidden";
        renderedTweet.style.borderRadius = "0.5rem";
        renderedTweet.style.backgroundColor = "#15202b";
      }

      iframe.style.border = "0";
      iframe.style.clipPath = "inset(1px round 0.5rem)";
      iframe.style.display = "block";
      iframe.style.maxWidth = "calc(100% + 2px)";
      iframe.style.transform = "translateX(-1px)";
      iframe.style.width = "calc(100% + 2px)";
      setHydrated(true);
      return true;
    };
    const requestMarkHydrated = (attempt = 0) => {
      if (cancelled || markHydrated()) return;
      if (attempt < 12) {
        window.setTimeout(() => requestMarkHydrated(attempt + 1), 250);
      }
    };
    let observer: MutationObserver | null = null;
    observer = new MutationObserver(() => {
      if (markHydrated()) {
        observer?.disconnect();
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    void ensureXWidgetsScript()
      .then(() => {
        if (!cancelled) {
          return Promise.resolve(window.twttr?.widgets?.load(container)).then(() => {
            if (!cancelled) {
              requestMarkHydrated();
            }
          });
        }
        return undefined;
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [content.oembedHtml, content.provider, content.state]);

  if (content.provider === "youtube") {
    return <OfficialYouTubeEmbed content={content} className={className} />;
  }

  if (content.state !== "embed" || !content.oembedHtml) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  if (failed) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  return (
    <div className={cn("grid w-full", className)}>
      {!hydrated ? (
        <div
          aria-hidden="true"
          className="col-start-1 row-start-1 min-h-[22rem] w-full rounded-lg border border-border-soft bg-[#15202b]"
        />
      ) : null}
      <div
        aria-hidden={!hydrated}
        className={cn(
          "col-start-1 row-start-1 w-full overflow-hidden rounded-lg bg-[#15202b] transition-opacity",
          hydrated ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        data-post-card-interactive="true"
        ref={containerRef}
      />
    </div>
  );
}
