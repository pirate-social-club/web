"use client";

import {
  Gesture,
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerProps,
} from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";

import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "./video-player.styles.css";

import { cn } from "@/lib/utils";
import {
  getMediaAspectRatioStyle,
  getVideoPreviewObjectFitClassName,
} from "@/components/compositions/posts/video-preview-layout";

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  aspectRatio?: number;
  playsinline?: boolean;
  loop?: boolean;
  currentTime?: number;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  title,
  aspectRatio,
  playsinline = true,
  loop = false,
  currentTime,
  autoPlay = false,
  className,
  onEnded,
}: VideoPlayerProps) {
  const aspectRatioStyle = getMediaAspectRatioStyle(aspectRatio) as MediaPlayerProps["style"] | undefined;
  const objectFitClassName = getVideoPreviewObjectFitClassName(aspectRatio);

  return (
    <MediaPlayer
      src={src}
      poster={poster}
      title={title}
      autoPlay={autoPlay}
      playsInline={playsinline}
      loop={loop}
      currentTime={currentTime}
      onEnd={onEnded}
      style={aspectRatioStyle}
      data-video-object-fit={objectFitClassName === "object-contain" ? "contain" : "cover"}
      className={cn(
        "vp-player relative w-full overflow-hidden rounded-lg bg-black text-white",
        !aspectRatioStyle && "aspect-video",
        className,
      )}
    >
      <Gesture className="absolute inset-0 z-10" event="pointerup" action="toggle:paused" />
      <MediaProvider>
        {poster && (
          <Poster
            className={cn(
              "vp-poster absolute inset-0 block h-full w-full opacity-0 transition-opacity data-[visible]:opacity-100",
              objectFitClassName,
            )}
            src={poster}
            alt={title ?? ""}
          />
        )}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} noGestures />
    </MediaPlayer>
  );
}
