import * as React from "react";

const portraitAspectRatioMaxWidthClass = "mx-auto w-full max-w-[22rem]";
const defaultAspectRatioMaxWidthClass = "w-full";

export function normalizeMediaAspectRatio(width: number, height: number): number | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }

  return width / height;
}

function isPortraitMedia(aspectRatio: number | undefined): boolean {
  return typeof aspectRatio === "number" && aspectRatio > 0 && aspectRatio < 1;
}

export function getVideoPreviewFrameClassName(aspectRatio: number | undefined): string {
  return isPortraitMedia(aspectRatio)
    ? portraitAspectRatioMaxWidthClass
    : defaultAspectRatioMaxWidthClass;
}

export function getVideoPreviewObjectFitClassName(aspectRatio: number | undefined): string {
  return isPortraitMedia(aspectRatio) ? "object-contain" : "object-cover";
}

export function getMediaAspectRatioStyle(aspectRatio: number | undefined): React.CSSProperties | undefined {
  return typeof aspectRatio === "number" && aspectRatio > 0
    ? { aspectRatio }
    : undefined;
}

export function useVideoSourceAspectRatio(src: string | undefined): number | undefined {
  const [aspectRatio, setAspectRatio] = React.useState<number | undefined>();

  React.useEffect(() => {
    if (!src) {
      setAspectRatio(undefined);
      return;
    }

    const video = document.createElement("video");
    let cancelled = false;

    video.preload = "metadata";
    video.src = src;

    function updateAspectRatio() {
      if (cancelled) return;
      setAspectRatio(normalizeMediaAspectRatio(video.videoWidth, video.videoHeight));
    }

    function clearAspectRatio() {
      if (cancelled) return;
      setAspectRatio(undefined);
    }

    setAspectRatio(undefined);
    video.addEventListener("loadedmetadata", updateAspectRatio, { once: true });
    video.addEventListener("error", clearAspectRatio, { once: true });
    video.load();

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return aspectRatio;
}
