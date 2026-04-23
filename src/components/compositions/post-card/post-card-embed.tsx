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
        load: (element?: HTMLElement | null) => void;
      };
    };
  }
}

let xWidgetsLoadPromise: Promise<void> | null = null;

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

export function PostEmbedPreview({ content, className }: { content: EmbedContent; className?: string }) {
  const preview = content.preview;
  const unavailable = content.state === "unavailable";
  const text = unavailable
    ? "This X post is unavailable."
    : preview?.text?.trim() || "X post";

  return (
    <div className={cn("w-full space-y-2 text-start", className)}>
      <a
        className={cn(
          "grid w-full items-stretch gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          preview?.mediaUrl ? "grid-cols-[minmax(0,7fr)_minmax(5rem,3fr)]" : "grid-cols-1",
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
              <span className="truncate">{formatXSource(preview)}</span>
              <ArrowSquareOut className="size-4 shrink-0" />
            </div>
          </div>
        </div>
        {preview?.mediaUrl ? (
          <div className="min-h-20 overflow-hidden rounded-lg">
            <img
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              src={preview.mediaUrl}
            />
          </div>
        ) : null}
      </a>
    </div>
  );
}

export function OfficialOEmbed({ content, className }: { content: EmbedContent; className?: string }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (content.provider !== "x" || content.state !== "embed" || !content.oembedHtml) {
      return;
    }

    let cancelled = false;
    void ensureXWidgetsScript()
      .then(() => {
        if (!cancelled) {
          window.twttr?.widgets?.load(containerRef.current);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [content.oembedHtml, content.provider, content.state]);

  if (content.state !== "embed" || !content.oembedHtml) {
    return <PostEmbedPreview content={content} className={className} />;
  }

  return (
    <div
      className={cn("w-full overflow-hidden rounded-lg", className)}
      data-post-card-interactive="true"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: content.oembedHtml }}
    />
  );
}
