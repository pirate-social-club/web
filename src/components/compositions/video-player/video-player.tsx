"use client";

import * as React from "react";
import {
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

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  playsinline?: boolean;
  loop?: boolean;
  currentTime?: number;
  className?: string;
  onEnded?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  title,
  playsinline = true,
  loop = false,
  currentTime,
  className,
  onEnded,
}: VideoPlayerProps) {
  return (
    <MediaPlayer
      src={src}
      title={title}
      playsinline={playsinline}
      loop={loop}
      currentTime={currentTime}
      onEnd={onEnded}
      className={cn(
        "vp-player relative w-full overflow-hidden rounded-lg bg-black text-white",
        className,
      )}
    >
      <MediaProvider>
        {poster && (
          <Poster
            className="vp-poster absolute inset-0 block h-full w-full object-cover opacity-0 transition-opacity data-[visible]:opacity-100"
            src={poster}
            alt={title ?? ""}
          />
        )}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
