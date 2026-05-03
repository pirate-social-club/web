import * as React from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

import { getLocaleMessages } from "@/locales";
import { useUiLocale } from "@/lib/ui-locale";
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
const X_EMBED_CSP = "default-src 'none'; script-src https://platform.x.com https://platform.twitter.com; frame-src https://platform.x.com https://platform.twitter.com https://syndication.twitter.com https://x.com https://twitter.com; connect-src https://platform.x.com https://platform.twitter.com https://syndication.twitter.com https://x.com https://twitter.com; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveSafeXHref(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || (url.hostname !== "x.com" && url.hostname !== "twitter.com")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeXChildNode(node: Node): string {
  if (node.nodeType === 3) {
    return escapeHtml(node.textContent ?? "");
  }
  if (node.nodeType !== 1 || !(node instanceof Element)) {
    return "";
  }

  const tagName = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map(sanitizeXChildNode).join("");
  if (tagName === "br") {
    return "<br>";
  }
  if (tagName === "p") {
    const dir = node.getAttribute("dir");
    const lang = node.getAttribute("lang");
    const attributes = [
      dir === "ltr" || dir === "rtl" || dir === "auto" ? ` dir="${dir}"` : "",
      lang?.match(/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i) ? ` lang="${escapeHtml(lang)}"` : "",
    ].join("");
    return `<p${attributes}>${children}</p>`;
  }
  if (tagName === "a") {
    const href = resolveSafeXHref(node.getAttribute("href"));
    return href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${children}</a>` : children;
  }

  return children;
}

function buildSafeXBlockquoteHtml(blockquote: Element): string | null {
  if (!blockquote.textContent?.trim()) {
    return null;
  }

  const cite = resolveSafeXHref(blockquote.getAttribute("cite"));
  const dataTheme = blockquote.getAttribute("data-theme");
  const attributes = [
    ` class="twitter-tweet"`,
    cite ? ` cite="${escapeHtml(cite)}"` : "",
    dataTheme === "dark" || dataTheme === "light" ? ` data-theme="${dataTheme}"` : "",
  ].join("");
  const children = Array.from(blockquote.childNodes).map(sanitizeXChildNode).join("").trim();
  return children ? `<blockquote${attributes}>${children}</blockquote>` : null;
}

export function isValidXEmbedHtml(oembedHtml: string): boolean {
  if (typeof DOMParser !== "undefined") {
    const sourceDocument = new DOMParser().parseFromString(oembedHtml, "text/html");
    return Boolean(findXBlockquote(sourceDocument)?.textContent?.trim());
  }

  return /<blockquote\b[^>]*class=(["'])[^"']*\btwitter-tweet\b[^"']*\1/i.test(oembedHtml);
}

export function buildSandboxedXEmbedSrcDoc(oembedHtml: string): string | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }
  const sourceDocument = new DOMParser().parseFromString(oembedHtml, "text/html");
  const blockquote = findXBlockquote(sourceDocument);
  const safeBlockquote = blockquote ? buildSafeXBlockquoteHtml(blockquote) : null;
  if (!safeBlockquote) return null;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${escapeHtml(X_EMBED_CSP)}">
    <base target="_blank">
    <style>
      html,body{margin:0;padding:0;background:transparent;color-scheme:dark;overflow:hidden;}
      body{display:flex;justify-content:center;}
      .twitter-tweet{margin:0!important;max-width:100%!important;}
    </style>
  </head>
  <body>
    ${safeBlockquote}
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
  if (content.provider === "kalshi") {
    return "Kalshi";
  }
  if (content.provider === "polymarket") {
    return "Polymarket";
  }
  if (content.provider === "youtube") {
    const author = preview?.authorName?.trim();
    if (author) return `${author} ${copy.onYouTube}`;
    return "YouTube";
  }

  return formatXSource(preview, copy.onX);
}

function resolveEmbedText(content: EmbedContent, copy: RoutesMessages["common"]): string {
  if (content.state === "unavailable") {
    return content.provider === "youtube"
      ? copy.youtubeVideoUnavailable
      : content.provider === "kalshi" || content.provider === "polymarket"
      ? copy.marketUnavailable
      : copy.xPostUnavailable;
  }

  if (content.provider === "youtube") {
    return content.preview?.title?.trim() || copy.youtubeVideo;
  }
  if (content.provider === "kalshi" || content.provider === "polymarket") {
    return content.preview?.translatedQuestion?.trim()
      || content.preview?.question?.trim()
      || content.preview?.title?.trim()
      || copy.predictionMarket;
  }

  return content.preview?.text?.trim() || copy.xPost;
}

function resolveEmbedImage(content: EmbedContent): string | null {
  if (content.provider === "youtube") {
    return content.preview?.thumbnailUrl ?? null;
  }
  if (content.provider === "kalshi" || content.provider === "polymarket") {
    return content.preview?.imageUrl ?? null;
  }
  return content.preview?.mediaUrl ?? null;
}

function formatProbability(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatDateLabel(value: string | null | undefined, locale?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale || undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatChartDateLabel(value: number | null | undefined, locale?: string | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale || undefined, {
    month: "short",
  }).format(date);
}

function buildSparkline(points: NonNullable<EmbedContent["preview"]>["chart"], locale?: string | null, width = 320, height = 96): {
  areaPath: string;
  endLabel: string | null;
  linePath: string;
  startLabel: string | null;
} | null {
  const chartPoints = (points ?? [])
    .filter((point) => typeof point.price === "number" && Number.isFinite(point.price));
  const values = chartPoints.map((point) => point.price as number);
  if (values.length < 2) {
    return null;
  }

  const topPadding = 8;
  const bottomPadding = 8;
  const plotHeight = height - topPadding - bottomPadding;
  const coordinates = values.map((price, index) => {
    const probability = Math.max(0, Math.min(1, price));
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = topPadding + (1 - probability) * plotHeight;
    return { x, y };
  });
  const linePath = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = coordinates[coordinates.length - 1];
  return {
    areaPath: `${linePath} L${width} ${height} L0 ${height} Z`,
    endLabel: formatChartDateLabel(chartPoints[chartPoints.length - 1]?.ts, locale),
    linePath,
    startLabel: formatChartDateLabel(chartPoints[0]?.ts, locale),
  };
}

function isClosedMarketStatus(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "closed"
    || normalized === "settled"
    || normalized === "resolved"
    || normalized === "determined";
}

function PredictionMarketEmbed({
  className,
  content,
  copy,
  locale,
}: {
  className?: string;
  content: EmbedContent;
  copy: RoutesMessages["common"];
  locale: string;
}) {
  const preview = content.preview;
  const question = resolveEmbedText(content, copy);
  const provider = formatEmbedSource(content, copy);
  const baseAccent = content.provider === "polymarket"
    ? { fill: "#2f80ff3d", line: "#2f80ff", text: "#6aa7ff" }
    : { fill: "#13d6a340", line: "#13d6a3", text: "#54e0c2" };
  const yesPrice = preview?.yesPrice ?? preview?.lastPrice;
  const resolution = preview?.resolution ?? null;
  const isClosed = isClosedMarketStatus(preview?.status);
  const accent = isClosed
    ? { fill: "rgba(148, 163, 184, 0.18)", line: "rgba(148, 163, 184, 0.78)", text: "hsl(var(--muted-foreground))" }
    : baseAccent;
  const sparkline = buildSparkline(preview?.chart, locale);
  const closeLabel = formatDateLabel(preview?.closeTime, locale);
  const imageSrc = preview?.imageUrl?.trim();
  const footerDateLabel = closeLabel
    ? `${resolution ? copy.settled : isClosed ? copy.closed : copy.closes} ${closeLabel}`
    : null;
  const isMultiOutcome = (preview?.outcomes?.length ?? 0) >= 2;
  const resolvedOutcome = preview?.resolvedOutcome?.trim();
  const resolvedOutcomeLabel = resolvedOutcome
    ? preview?.outcomes?.find((outcome) => outcome.label === resolvedOutcome)?.translatedLabel?.trim() || resolvedOutcome
    : null;
  const visibleOutcomes = (preview?.outcomes ?? []).filter((outcome) => outcome.label !== resolvedOutcome);
  const marketState = resolution
    ? {
      label: resolution === "yes" ? copy.resolvedYes : copy.resolvedNo,
      tone: resolution === "yes" ? baseAccent.text : "hsl(var(--muted-foreground))",
    }
    : isClosed && !isMultiOutcome
    ? {
      label: copy.closed,
      tone: "hsl(var(--muted-foreground))",
    }
    : null;

  return (
    <a
      className={cn(
        "block w-full rounded-lg border border-border-soft bg-muted/20 p-3 text-start transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      data-post-card-interactive="true"
      href={content.canonicalUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="space-y-3">
        <div className="flex min-w-0 items-center gap-3">
          {imageSrc ? (
            <img
              alt=""
              aria-hidden="true"
              className="size-14 shrink-0 rounded-md object-cover"
              src={imageSrc}
            />
          ) : null}
          <div className="min-w-0">
            <p
              className={cn(postCardType.title, "line-clamp-2 font-semibold text-foreground")}
              dir={preview?.questionDir ?? "auto"}
              lang={preview?.questionLang ?? undefined}
            >
              {question}
            </p>
          </div>
        </div>

        {isMultiOutcome ? (
          <div className="space-y-2">
            {resolvedOutcomeLabel ? (
              <div className="flex min-w-0 items-baseline gap-2 text-foreground">
                <span
                  className={cn("truncate font-semibold", postCardType.title)}
                  dir={preview?.questionDir ?? "auto"}
                  lang={preview?.questionLang ?? undefined}
                >
                  {resolvedOutcomeLabel}
                </span>
                <span className={cn("shrink-0 font-semibold", postCardType.meta)} style={{ color: baseAccent.text }}>
                  {copy.closed}
                </span>
              </div>
            ) : null}
            {visibleOutcomes.map((outcome) => (
              <div key={outcome.label} className="space-y-1">
                <div className={cn("flex min-w-0 items-baseline justify-between gap-2", postCardType.title)}>
                  <span
                    className="truncate text-foreground"
                    dir={preview?.questionDir ?? "auto"}
                    lang={preview?.questionLang ?? undefined}
                  >
                    {outcome.translatedLabel?.trim() || outcome.label}
                  </span>
                  <span className="shrink-0 font-semibold" style={{ color: accent.text }}>{formatProbability(outcome.probability)}</span>
                </div>
                <div className="h-1.5 min-w-0 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(Math.max(0, Math.min(1, outcome.probability)) * 100)}%`, backgroundColor: accent.line }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : marketState ? (
          <div className="flex min-w-0 items-baseline gap-2 text-foreground">
            <span className={cn("font-semibold", postCardType.title)}>{marketState.label}</span>
            {resolution ? (
              <span className={cn("shrink-0 font-semibold", postCardType.meta)} style={{ color: marketState.tone }}>
                {copy.closed}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex min-w-0 items-baseline gap-1.5 text-foreground">
            <div className="text-2xl font-semibold leading-none" style={{ color: accent.text }}>{formatProbability(yesPrice)}</div>
            <div className={cn("font-semibold", postCardType.meta)}>{copy.chance}</div>
          </div>
        )}

        {!isMultiOutcome ? (
          <div className="relative h-32 min-w-0 overflow-hidden">
            <div className="absolute bottom-7 left-0 right-12 top-2">
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-white/10" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/10" />
              <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-white/10" />
            </div>
            <div className={cn("pointer-events-none absolute bottom-7 right-0 top-2 grid grid-rows-3 text-muted-foreground/80", postCardType.meta)}>
              <span className="self-start">100%</span>
              <span className="self-center">50%</span>
              <span className="self-end">0%</span>
            </div>
            {sparkline ? (
              <div className="absolute bottom-7 left-0 right-12 top-2">
                <svg aria-label="Recent odds movement" className="size-full" role="img" viewBox="0 0 320 96" preserveAspectRatio="none">
                  <path d={sparkline.areaPath} fill={accent.fill} />
                  <path d={sparkline.linePath} fill="none" stroke={accent.line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            ) : (
              <div className={cn("flex size-full items-center justify-center text-muted-foreground", postCardType.meta)}>No chart</div>
            )}
            {sparkline ? (
              <div className={cn("absolute bottom-0 left-0 right-12 flex items-center justify-between text-muted-foreground/85", postCardType.meta)}>
                <span>{sparkline.startLabel}</span>
                <span>{sparkline.endLabel}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {(provider || closeLabel) ? (
          <div className={cn("flex min-w-0 items-center justify-between gap-3 border-t border-border-soft pt-2 text-muted-foreground", postCardType.meta)}>
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate font-semibold text-foreground">{provider}</span>
              <ArrowSquareOut className="size-4 shrink-0" />
            </div>
            {footerDateLabel ? <div className="shrink-0">{footerDateLabel}</div> : null}
          </div>
        ) : null}
      </div>
    </a>
  );
}

export function PostEmbedPreview({ content, className }: { content: EmbedContent; className?: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes");

  if (content.provider === "kalshi" || content.provider === "polymarket") {
    return <PredictionMarketEmbed content={content} className={className} copy={copy.common} locale={locale} />;
  }

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
        rel="noopener noreferrer"
        target="_blank"
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

const X_EMBED_MIN_HEIGHT = 200;
const X_EMBED_MAX_HEIGHT = 800;
const X_EMBED_FALLBACK_HEIGHT = 400;

function useIsClient(): boolean {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);
  return isClient;
}

function resolveXTweetId(canonicalUrl: string): string | null {
  try {
    const pathname = new URL(canonicalUrl).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    if (lastSegment && /^\d+$/.test(lastSegment)) return lastSegment;
  } catch {}
  return null;
}

function useXTweetEmbedHeight(): number {
  const [height, setHeight] = React.useState(X_EMBED_FALLBACK_HEIGHT);
  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://platform.twitter.com" && event.origin !== "https://platform.x.com") return;
      const data = event.data;
      if (typeof data !== "object" || data === null) return;
      const resize = data?.["twttr.embed"]?.params?.[0];
      if (typeof resize?.height === "number") {
        const clamped = Math.min(X_EMBED_MAX_HEIGHT, Math.max(X_EMBED_MIN_HEIGHT, Math.round(resize.height)));
        setHeight(clamped);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  return height;
}

export function OfficialOEmbed({ content, className }: { content: EmbedContent; className?: string }) {
  const isClient = useIsClient();
  const xEmbedHeight = useXTweetEmbedHeight();

  if (!isClient || content.provider === "youtube") {
    return <PostEmbedPreview content={content} className={className} />;
  }

  if (content.provider === "x") {
    if (content.state !== "embed") {
      return <PostEmbedPreview content={content} className={className} />;
    }

    const tweetId = resolveXTweetId(content.canonicalUrl);
    if (!tweetId) {
      return <PostEmbedPreview content={content} className={className} />;
    }

    const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(tweetId)}&dnt=true&theme=dark`;

    return (
      <div
        className={cn("mx-auto w-full max-w-[550px] overflow-hidden rounded-lg border border-border-soft bg-card transition-[height] duration-200", className)}
        style={{ height: xEmbedHeight }}
      >
        <iframe
          allow="autoplay; fullscreen"
          className="size-full border-0"
          data-post-card-interactive="true"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          src={embedUrl}
          title={content.preview?.text?.trim() || defaultRouteCopy.common.xPost}
        />
      </div>
    );
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
