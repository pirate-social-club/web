import * as React from "react";
import { Check, Lock as FilledLockIcon, Play as PlayIcon, VideoCamera } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives/button";
import { Type } from "@/components/primitives/type";
import { FormattedText } from "@/components/primitives/formatted-text";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { mediaControlButtonVariants } from "@/components/primitives/media-control-button";
import { extractVideoPosterFrameSourceDataUrl } from "@/components/compositions/posts/post-composer/video-poster-frame";
import {
  getMediaAspectRatioStyle,
  getVideoPreviewFrameClassName,
  getVideoPreviewObjectFitClassName,
} from "@/components/compositions/posts/video-preview-layout";
import { postCardCaptionTextColor, postCardTextWrap, postCardType } from "./post-card.styles";
import { StoryRegistrationBadge } from "./post-card-story-registration";
import type { UpstreamAttribution, VideoContentSpec } from "./post-card.types";

const LazyVideoPlayer = React.lazy(async () => {
  const module = await import("@/components/compositions/posts/video-player");
  return { default: module.VideoPlayer };
});

function isBlobUrl(src: string): boolean {
  return src.startsWith("blob:");
}

function BlobVideoPlayer({
  aspectRatio,
  autoPlay,
  src,
  poster,
  title,
  className,
}: {
  aspectRatio?: number;
  autoPlay?: boolean;
  src: string;
  poster?: string;
  title?: string;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const aspectRatioStyle = getMediaAspectRatioStyle(aspectRatio);

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
      className={cn(
        "rounded-lg bg-black object-contain",
        aspectRatioStyle ? getVideoPreviewFrameClassName(aspectRatio) : "aspect-video w-full",
        className,
      )}
      style={aspectRatioStyle}
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
  showBuy: boolean;
  showUnlock: boolean;
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
    listingMode,
    listingStatus,
    onBuy,
    onUnlock,
    videoMode,
    upstreamAttributions,
  } = content;

  const isAgeGated = ageGatePolicy === "18_plus" && contentSafetyState === "adult";
  const ageGateRequiresProof = isAgeGated && ageGateViewerState !== "verified_allowed";
  const isLocked = accessMode === "locked";
  const isOwned = hasEntitlement === true;
  const isListedActive = listingMode === "listed" && listingStatus === "active";

  const showLockedThumbnail = isLocked && !isOwned;
  const showAgeGatedThumbnail = ageGateRequiresProof;
  const showOwned = isLocked && isOwned;
  const showBuy = isLocked && !isOwned && isListedActive && Boolean(onBuy);
  const showUnlock = isLocked && !isOwned && !isListedActive && Boolean(onUnlock);

  const showAttribution = !!(
    videoMode &&
    videoMode !== "original" &&
    upstreamAttributions &&
    upstreamAttributions.length > 0
  );

  const hasPlayableSource = content.src.trim().length > 0;
  const hasResolvableSource = hasPlayableSource || !!content.onPlay;
  const hasLockedAccess = !isLocked || isOwned;
  const canPlay = hasResolvableSource && hasLockedAccess && !ageGateRequiresProof;

  return {
    isAgeGated,
    ageGateRequiresProof,
    showLockedThumbnail,
    showAgeGatedThumbnail,
    showOwned,
    showBuy,
    showUnlock,
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
      className={cn(postCardCaptionTextColor, postCardType.caption)}
      dir={content.captionDir ?? "auto"}
      lang={content.captionLang}
      value={content.caption}
    />
  );
}

interface VideoOfferRowProps {
  action: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}

function VideoOfferRow({ action, icon, label }: VideoOfferRowProps) {
  return (
    <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-border-soft px-4 py-3">
      <div className="grid size-8 shrink-0 place-items-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <Type as="p" className={cn(postCardTextWrap, "font-semibold text-foreground")} variant="body-strong">
          {label}
        </Type>
      </div>
      <div className="flex justify-end">
        {action}
      </div>
    </div>
  );
}

function VideoOfferRows({ content, ui }: { content: VideoContentSpec; ui: DerivedVideoUI }) {
  if (ui.ageGateRequiresProof) return null;

  const effectivePrice = content.regionalPriceLabel ?? content.priceLabel;
  const icon = <VideoCamera className="size-5" />;

  if (ui.showBuy && content.onBuy) {
    return (
      <VideoOfferRow
        action={(
          <Button
            aria-label={effectivePrice ? `Buy Full video for ${effectivePrice}` : "Buy Full video"}
            className="h-10 w-32 px-5"
            data-post-card-interactive="true"
            onClick={content.onBuy}
            size="sm"
          >
            {effectivePrice ? `Buy ${effectivePrice}` : "Buy"}
          </Button>
        )}
        icon={icon}
        label="Full video"
      />
    );
  }

  if (ui.showUnlock && content.onUnlock) {
    return (
      <VideoOfferRow
        action={(
          <Button
            aria-label="Unlock Full video"
            className="h-10 w-32 px-5"
            data-post-card-interactive="true"
            onClick={content.onUnlock}
            size="sm"
          >
            Unlock
          </Button>
        )}
        icon={icon}
        label="Full video"
      />
    );
  }

  if (ui.showOwned) {
    return (
      <VideoOfferRow
        action={(
          <span className="inline-flex h-10 w-32 items-center justify-center gap-1.5 rounded-full px-3 font-semibold text-success">
            <span>Unlocked</span>
            <Check className="size-4" weight="bold" />
          </span>
        )}
        icon={icon}
        label="Full video"
      />
    );
  }

  return null;
}

export function VideoPostContent({ content, className }: VideoPostContentProps) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").common;
  const [expanded, setExpanded] = React.useState(false);
  const playRequestedRef = React.useRef(false);
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
  const aspectRatioStyle = getMediaAspectRatioStyle(content.aspectRatio);
  const frameClassName = getVideoPreviewFrameClassName(content.aspectRatio);
  const objectFitClassName = getVideoPreviewObjectFitClassName(content.aspectRatio);
  const videoFrameClassName = aspectRatioStyle ? "w-full" : "aspect-video w-full";
  const offerRows = <VideoOfferRows content={content} ui={ui} />;

  React.useEffect(() => {
    if (playRequestedRef.current && hasPlayableSource) {
      setExpanded(true);
      playRequestedRef.current = false;
    }
  }, [hasPlayableSource]);

  const handlePlay = () => {
    if (ui.canPlay) {
      if (hasPlayableSource) {
        setExpanded(true);
      } else {
        playRequestedRef.current = true;
      }
      onPlay?.();
    }
  };

  if (expanded && ui.canPlay && hasPlayableSource) {
    if (isBlobUrl(content.src)) {
      return (
      <div className={cn("flex flex-col gap-2 text-start", className)}>
        <div className="overflow-hidden rounded-lg border border-border-soft bg-card">
          <div className={frameClassName}>
            <BlobVideoPlayer
                aspectRatio={content.aspectRatio}
                autoPlay
                className="rounded-none"
                src={content.src}
                poster={content.posterSrc}
                title={content.title}
              />
            </div>
            {offerRows}
          </div>
          {derivativeSummary && (
            <p className={cn("truncate", postCardCaptionTextColor, postCardType.meta)}>
              {derivativeSummary}
            </p>
          )}
          <VideoCaption content={content} />
          <StoryRegistrationBadge status={content.storyRegistration} />
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-2 text-start", className)}>
        <div className="overflow-hidden rounded-lg border border-border-soft bg-card">
          <div className={frameClassName}>
            <React.Suspense
              fallback={
                <div
                  className={cn("w-full bg-black/90", aspectRatioStyle ? undefined : "aspect-video")}
                  style={aspectRatioStyle}
                  aria-busy="true"
                />
              }
            >
              <LazyVideoPlayer
                aspectRatio={content.aspectRatio}
                autoPlay
                src={content.src}
                poster={content.posterSrc}
                title={content.title}
                playsinline
              />
            </React.Suspense>
          </div>
          {offerRows}
        </div>
        {derivativeSummary && (
          <p className={cn("truncate", postCardCaptionTextColor, postCardType.meta)}>
            {derivativeSummary}
          </p>
        )}
        <VideoCaption content={content} />
        <StoryRegistrationBadge status={content.storyRegistration} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 text-start", className)}>
      <div className="overflow-hidden rounded-lg border border-border-soft bg-card">
        <div className={frameClassName}>
          <button
            className={cn(
              "relative block overflow-hidden bg-muted",
              videoFrameClassName,
              ui.canPlay && "cursor-pointer",
            )}
            type="button"
            style={aspectRatioStyle}
            onClick={handlePlay}
            disabled={!ui.canPlay}
            aria-label={content.title ? `Play ${content.title}` : copy.playVideo}
          >
            {ui.ageGateRequiresProof ? (
              <div
                aria-label={content.title ?? copy.videoThumbnail}
                className="size-full bg-muted"
                role="img"
              />
            ) : content.posterSrc || content.src.trim() ? (
              <VideoThumbnail
                className={cn(
                  "size-full",
                  objectFitClassName,
                  "transition-[filter,transform]",
                  ui.showLockedThumbnail && "scale-[1.02] blur-[3px]",
                )}
                posterSrc={content.posterSrc}
                src={content.src}
                title={content.title ?? copy.videoThumbnail}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-muted">
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

            {durationLabel && !ui.ageGateRequiresProof && (
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
        </div>
        {offerRows}
      </div>

      {derivativeSummary && (
        <p className={cn("truncate", postCardCaptionTextColor, postCardType.meta)}>
          {derivativeSummary}
        </p>
      )}

      <VideoCaption content={content} />

      <StoryRegistrationBadge status={content.storyRegistration} />

    </div>
  );
}
