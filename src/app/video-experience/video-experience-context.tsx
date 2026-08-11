"use client";

import * as React from "react";

import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";

interface VideoExperienceSeedActions {
  onComment?: () => void;
  onVote?: (direction: "up" | "down" | null) => Promise<void> | void;
  onVoteAccess?: () => void;
}

export interface VideoExperienceSeed {
  actions?: VideoExperienceSeedActions;
  item: VideoFeedItem;
  source: string;
}

export interface VideoExperienceContextValue {
  openVideo: (seed: VideoExperienceSeed) => void;
}

export const VideoExperienceContext = React.createContext<VideoExperienceContextValue | null>(null);

export function useVideoExperience(): VideoExperienceContextValue | null {
  return React.useContext(VideoExperienceContext);
}
