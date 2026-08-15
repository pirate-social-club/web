// Embed URL sanitization and presentation derivation, ported exactly from the
// React post-card-embed.tsx. The sanitizers are security-sensitive: port
// changes here must keep post-card-embed's test expectations intact.

import type { PostCardContent } from "./types";

export type EmbedContent = Extract<PostCardContent, { type: "embed" }>;

const YOUTUBE_EMBED_HOSTS = new Set(["www.youtube.com", "www.youtube-nocookie.com"]);
export const YOUTUBE_IFRAME_ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
const X_WIDGETS_SCRIPT_URL = "https://platform.x.com/widgets.js";
export const X_EMBED_SANDBOX = "allow-scripts";
const X_EMBED_CSP = "default-src 'none'; script-src https://platform.x.com https://platform.twitter.com; frame-src https://platform.x.com https://platform.twitter.com https://syndication.twitter.com https://x.com https://twitter.com; connect-src https://platform.x.com https://platform.twitter.com https://syndication.twitter.com https://x.com https://twitter.com; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

export type SafeYouTubeEmbed = {
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

export function resolveXTweetId(canonicalUrl: string): string | null {
  try {
    const pathname = new URL(canonicalUrl).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();
    if (lastSegment && /^\d+$/.test(lastSegment)) return lastSegment;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Presentation helpers (pure; copy via EmbedLabels).
// ---------------------------------------------------------------------------

export interface EmbedLabels {
  onX: string;
  onYouTube: string;
  youtubeVideo: string;
  youtubeVideoUnavailable: string;
  xPost: string;
  xPostUnavailable: string;
  predictionMarket: string;
  marketUnavailable: string;
  chance: string;
  closed: string;
  closes: string;
  settled: string;
  resolvedYes: string;
  resolvedNo: string;
}

export const defaultEmbedLabels: EmbedLabels = {
  onX: "on X",
  onYouTube: "on YouTube",
  youtubeVideo: "YouTube video",
  youtubeVideoUnavailable: "This YouTube video is unavailable",
  xPost: "X post",
  xPostUnavailable: "This X post is unavailable",
  predictionMarket: "Prediction market",
  marketUnavailable: "This market is unavailable",
  chance: "chance",
  closed: "Closed",
  closes: "Closes",
  settled: "Settled",
  resolvedYes: "Resolved Yes",
  resolvedNo: "Resolved No",
};

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

export function formatEmbedSource(content: EmbedContent, labels: EmbedLabels = defaultEmbedLabels): string {
  const preview = content.preview;
  if (content.provider === "kalshi") {
    return "Kalshi";
  }
  if (content.provider === "polymarket") {
    return "Polymarket";
  }
  if (content.provider === "youtube") {
    const author = preview?.authorName?.trim();
    if (author) return `${author} ${labels.onYouTube}`;
    return "YouTube";
  }

  return formatXSource(preview, labels.onX);
}

export function resolveEmbedText(content: EmbedContent, labels: EmbedLabels = defaultEmbedLabels): string {
  if (content.state === "unavailable") {
    return content.provider === "youtube"
      ? labels.youtubeVideoUnavailable
      : content.provider === "kalshi" || content.provider === "polymarket"
      ? labels.marketUnavailable
      : labels.xPostUnavailable;
  }

  if (content.provider === "youtube") {
    return content.preview?.title?.trim() || labels.youtubeVideo;
  }
  if (content.provider === "kalshi" || content.provider === "polymarket") {
    return content.preview?.translatedQuestion?.trim()
      || content.preview?.question?.trim()
      || content.preview?.title?.trim()
      || labels.predictionMarket;
  }

  return content.preview?.text?.trim() || labels.xPost;
}

export function resolveEmbedImage(content: EmbedContent): string | null {
  if (content.provider === "youtube") {
    return content.preview?.thumbnailUrl ?? null;
  }
  if (content.provider === "kalshi" || content.provider === "polymarket") {
    return content.preview?.imageUrl ?? null;
  }
  return content.preview?.mediaUrl ?? null;
}

export function formatProbability(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

const postEmbedDateFormatters = new Map<string, Intl.DateTimeFormat>();
const postEmbedChartDateFormatters = new Map<string, Intl.DateTimeFormat>();

function getPostEmbedDateFormatter(locale?: string | null): Intl.DateTimeFormat {
  const key = locale || "";
  const existing = postEmbedDateFormatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    day: "numeric",
    month: "short",
  });
  postEmbedDateFormatters.set(key, formatter);
  return formatter;
}

function getPostEmbedChartDateFormatter(locale?: string | null): Intl.DateTimeFormat {
  const key = locale || "";
  const existing = postEmbedChartDateFormatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    month: "short",
  });
  postEmbedChartDateFormatters.set(key, formatter);
  return formatter;
}

export function formatEmbedDateLabel(value: string | null | undefined, locale?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return getPostEmbedDateFormatter(locale).format(date);
}

function formatChartDateLabel(value: number | null | undefined, locale?: string | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return getPostEmbedChartDateFormatter(locale).format(date);
}

export interface EmbedSparkline {
  areaPath: string;
  endLabel: string | null;
  linePath: string;
  startLabel: string | null;
}

export function buildEmbedSparkline(
  points: NonNullable<EmbedContent["preview"]>["chart"],
  locale?: string | null,
  width = 320,
  height = 96,
): EmbedSparkline | null {
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
  return {
    areaPath: `${linePath} L${width} ${height} L0 ${height} Z`,
    endLabel: formatChartDateLabel(chartPoints[chartPoints.length - 1]?.ts, locale),
    linePath,
    startLabel: formatChartDateLabel(chartPoints[0]?.ts, locale),
  };
}

export function isClosedMarketStatus(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "closed"
    || normalized === "settled"
    || normalized === "resolved"
    || normalized === "determined";
}
