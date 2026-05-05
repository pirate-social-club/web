import * as React from "react";
import { Check } from "@phosphor-icons/react";
import { Lock as FilledLockIcon, Play as PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { FormattedText } from "@/components/primitives/formatted-text";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { mediaControlButtonVariants } from "@/components/primitives/media-control-button";
import { extractVideoPosterFrameSourceDataUrl } from "@/components/compositions/posts/post-composer/video-poster-frame";
import { postCardType } from "./post-card.styles";
import type { UpstreamAttribution, VideoContentSpec } from "./post-card.types";

const LazyVideoPlayer = React.lazy(async () => {
  const module = await import("@/components/compositions/posts/video-player");
  return { default: module.VideoPlayer };
});

function isBlobUrl(src: string): boolean {
  return src.startsWith("blob:");
}

function BlobVideoPlayer({ autoPlay, src, poster, title, className }: { autoPlay?: boolean; src: string; poster?: string; title?: string; className?: string }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      return;
    }
    video.pause();
  }

  return (
    <video
      ref={videoRef}
      className={cn("aspect-video w-full rounded-lg bg-black object-contain", className)}
      autoPlay={autoPlay}
      controls
      muted
      onClick={togglePlayback}
      playsInline
      poster={poster}
      preload="metadata"
      src={src}
      title={title}
    />
  );
}

function VideoThumbnail({
  className,
  posterSrc,
  src,
  title,
}: {
  className?: string;
  posterSrc?: string;
  src: string;
  title?: string;
}) {
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [generatedPosterSrc, setGeneratedPosterSrc] = React.useState<string | undefined>();
  const [posterFailed, setPosterFailed] = React.useState(false);
  const videoSrc = src.trim();
  const resolvedPosterSrc = generatedPosterSrc ?? posterSrc;
  const showPoster = Boolean(resolvedPosterSrc && !posterFailed);

  React.useEffect(() => {
    setGeneratedPosterSrc(undefined);
    setPosterFailed(false);
  }, [posterSrc]);

  async function replaceBlankPoster() {
    const image = imageRef.current;
    if (generatedPosterSrc) return;
    if (!image || !videoSrc) return;

    try {
      const width = Math.min(64, image.naturalWidth);
      const height = Math.min(64, image.naturalHeight);
      if (width <= 0 || height <= 0) return;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let totalLuma = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        totalLuma += 0.2126 * pixels[index]! + 0.7152 * pixels[index + 1]! + 0.0722 * pixels[index + 2]!;
      }
      if (totalLuma / (pixels.length / 4) >= 10) return;

      const generated = await extractVideoPosterFrameSourceDataUrl(videoSrc, "0");
      setGeneratedPosterSrc(generated.dataUrl);
      setPosterFailed(false);
    } catch {
      setPosterFailed(true);
    }
  }

  if (showPoster) {
    return (
      <img
        ref={imageRef}
        crossOrigin="anonymous"
        alt={title ?? ""}
        className={className}
        onError={() => setPosterFailed(true)}
        onLoad={() => void replaceBlankPoster()}
        src={resolvedPosterSrc}
      />
    );
  }

  if (videoSrc) {
    return (
      <video
        aria-label={title}
        className={className}
        muted
        playsInline
        preload="metadata"
        src={videoSrc}
      />
    );
  }

  return null;
}

export interface VideoPostContentProps {
  content: VideoContentSpec;
  className?: string;
}

export interface DerivedVideoUI {
  isAgeGated: boolean;
  ageGateRequiresProof: boolean;
  showLockedThumbnail: boolean;
  showAgeGatedThumbnail: boolean;
  showOwned: boolean;
  showAttribution: boolean;
  canPlay: boolean;
}

export function deriveVideoUI(content: VideoContentSpec): DerivedVideoUI {
  const {
    accessMode,
    contentSafetyState,
    ageGatePolicy,
    ageGateViewerState,
    hasEntitlement,
    videoMode,
    upstreamAttributions,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";
  const isLocked = accessMode === "locked";

  const showLockedThumbnail = isLocked && !hasEntitlement;
  const showAgeGatedThumbnail = isAgeGated;
  const showOwned = isLocked && hasEntitlement === true;

  const showAttribution = !!(
    videoMode &&
    videoMode !== "original" &&
    upstreamAttributions &&
    upstreamAttributions.length > 0
  );

  const hasPlayableSource = content.src.trim().length > 0;
  const hasResolvableSource = hasPlayableSource || !!content.onPlay;
  const hasLockedAccess = !isLocked || hasEntitlement === true;
  const canPlay = hasResolvableSource && hasLockedAccess && !ageGateRequiresProof;

  return {
    isAgeGated,
    ageGateRequiresProof,
    showLockedThumbnail,
    showAgeGatedThumbnail,
    showOwned,
    showAttribution,
    canPlay,
  };
}

function getDerivativeSummary(upstreamAttributions?: UpstreamAttribution[]): string | null {
  if (!upstreamAttributions || upstreamAttributions.length === 0) {
    return null;
  }

  if (upstreamAttributions.length === 1) {
    const src = upstreamAttributions[0];
    return src.artist
      ? `Derived from ${src.title} by ${src.artist}`
      : `Derived from ${src.title}`;
  }

  return `Derived from ${upstreamAttributions[0].title} +${upstreamAttributions.length - 1}`;
}

function VideoCaption({ content }: { content: VideoContentSpec }) {
  if (!content.caption) return null;

  return (
    <FormattedText
      className={cn("text-muted-foreground", postCardType.caption)}
      dir={content.captionDir ?? "auto"}
      lang={content.captionLang}
      value={content.caption}
    />
  );
}

export function VideoPostContent({ content, className }: VideoPostContentProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const [expanded, setExpanded] = React.useState(false);
  const [playRequested, setPlayRequested] = React.useState(false);
  const ui = deriveVideoUI(content);
  const {
    durationLabel,
    upstreamAttributions,
    onPlay,
    onVerifyAge,
  } = content;

  const derivativeSummary = ui.showAttribution ? getDerivativeSummary(upstreamAttributions) : null;
  const hasPlayableSource = content.src.trim().length > 0;
  const isBuffering = content.playbackState === "buffering";

  React.useEffect(() => {
    if (playRequested && hasPlayableSource) {
      setExpanded(true);
      setPlayRequested(false);
    }
  }, [hasPlayableSource, playRequested]);

  const handlePlay = () => {
    if (ui.canPlay) {
      if (hasPlayableSource) {
        setExpanded(true);
      } else {
        setPlayRequested(true);
      }
      onPlay?.();
    }
  };

  if (expanded && ui.canPlay && hasPlayableSource) {
    if (isBlobUrl(content.src)) {
      return (
        <div className={cn("flex flex-col gap-2 text-start", className)}>
          <BlobVideoPlayer
            autoPlay
            src={content.src}
            poster={content.posterSrc}
            title={content.title}
          />
          {derivativeSummary && (
            <p className={cn("truncate text-muted-foreground", postCardType.meta)}>
              {derivativeSummary}
            </p>
          )}
          <VideoCaption content={content} />
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-2 text-start", className)}>
        <React.Suspense
          fallback={
            <div className="aspect-video w-full rounded-lg bg-black/90" aria-busy="true" />
          }
        >
          <LazyVideoPlayer
            autoPlay
            src={content.src}
            poster={content.posterSrc}
            title={content.title}
            playsinline
          />
        </React.Suspense>
        {derivativeSummary && (
          <p className={cn("truncate text-muted-foreground", postCardType.meta)}>
            {derivativeSummary}
          </p>
        )}
        <VideoCaption content={content} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 text-start", className)}>
      <button
        className={cn(
          "relative block w-full overflow-hidden rounded-lg bg-muted",
          ui.canPlay && "cursor-pointer",
        )}
        type="button"
        onClick={handlePlay}
        disabled={!ui.canPlay}
        aria-label={content.title ? `Play ${content.title}` : copy.playVideo}
      >
        {content.posterSrc || content.src.trim() ? (
          <VideoThumbnail
            className={cn(
              "aspect-video w-full object-cover transition-[filter,transform]",
              ui.showLockedThumbnail && "scale-[1.02] blur-[3px]",
              ui.showAgeGatedThumbnail && "blur-md saturate-0",
            )}
            posterSrc={content.posterSrc}
            src={content.src}
            title={content.title ?? copy.videoThumbnail}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <PlayIcon className="size-8 text-muted-foreground" weight="fill" />
          </div>
        )}

        {ui.showLockedThumbnail && (
          <div className="absolute inset-0 bg-black/22" />
        )}

        {ui.showAgeGatedThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Button
              size="lg"
              className="gap-2 font-semibold shadow-lg"
              onClick={onVerifyAge}
              disabled={!onVerifyAge}
            >
              <FilledLockIcon className="size-4" weight="fill" />
              <Type variant="body-strong">{copy.ageGateVerify}</Type>
            </Button>
          </div>
        )}

        {ui.canPlay && !isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              className={mediaControlButtonVariants({ size: "md" })}
            >
              <PlayIcon className="size-[18px]" weight="fill" />
            </span>
          </div>
        )}

        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="size-10 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
          </div>
        )}

        {durationLabel && !ui.isAgeGated && (
          <div className="absolute bottom-2 end-2">
            <span
              className={cn(
                "rounded bg-black/70 px-1.5 py-0.5 text-white",
                postCardType.caption,
              )}
            >
              {durationLabel}
            </span>
          </div>
        )}
      </button>

      {derivativeSummary && (
        <p className={cn("truncate text-muted-foreground", postCardType.meta)}>
          {derivativeSummary}
        </p>
      )}

      <VideoCaption content={content} />

      {ui.showOwned && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-medium text-success",
            postCardType.label,
          )}
        >
          <Check className="size-4" weight="bold" />
          <span>Unlocked</span>
        </span>
      )}
    </div>
  );
}
