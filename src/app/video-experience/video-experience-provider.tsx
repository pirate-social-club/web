"use client";

import * as React from "react";

import {
  VideoExperienceContext,
  type VideoExperienceSeed,
} from "@/app/video-experience/video-experience-context";
import {
  hrefWithVideo,
  VIDEO_EXPERIENCE_HISTORY_KEY,
  videoIdFromLocation,
} from "@/app/video-experience/video-experience-history";
import type { VideoExperienceOpenRequest } from "@/app/video-experience/video-experience-overlay";

const LazyVideoExperienceOverlay = React.lazy(async () => {
  const mod = await import("@/app/video-experience/video-experience-overlay");
  return { default: mod.VideoExperienceOverlay };
});

export function GlobalVideoExperienceProvider({ children }: { children: React.ReactNode }) {
  const nextRequestIdRef = React.useRef(0);
  const [activated, setActivated] = React.useState(false);
  const [request, setRequest] = React.useState<VideoExperienceOpenRequest | null>(null);

  const openVideo = React.useCallback((seed: VideoExperienceSeed) => {
    nextRequestIdRef.current += 1;
    setRequest({ id: nextRequestIdRef.current, seed });
    setActivated(true);
    const nextState = {
      ...(window.history.state && typeof window.history.state === "object" ? window.history.state : {}),
      [VIDEO_EXPERIENCE_HISTORY_KEY]: { postId: seed.item.id },
    };
    window.history.pushState(nextState, "", hrefWithVideo(window.location.href, seed.item.id));
  }, []);

  React.useEffect(() => {
    const activateFromLocation = () => {
      if (videoIdFromLocation(window.location)) setActivated(true);
    };
    activateFromLocation();
    window.addEventListener("popstate", activateFromLocation);
    return () => window.removeEventListener("popstate", activateFromLocation);
  }, []);

  const contextValue = React.useMemo(() => ({ openVideo }), [openVideo]);

  return (
    <VideoExperienceContext.Provider value={contextValue}>
      {children}
      {activated ? (
        <React.Suspense fallback={null}>
          <LazyVideoExperienceOverlay request={request} />
        </React.Suspense>
      ) : null}
    </VideoExperienceContext.Provider>
  );
}
