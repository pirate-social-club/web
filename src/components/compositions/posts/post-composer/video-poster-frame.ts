import { logger } from "@/lib/logger";

export type ExtractedVideoPosterFrame = {
  dataUrl: string;
  frameMs: number;
  height: number;
  width: number;
};

type VideoPosterFrameOptions = {
  maxWidth?: number;
  traceId?: string;
};

const VIDEO_POSTER_EVENT_TIMEOUT_MS = 8_000;
const VIDEO_POSTER_LOADED_DATA_TIMEOUT_MS = 3_000;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsedMs(sinceMs: number): number {
  return Math.round(nowMs() - sinceMs);
}

function logPosterTrace(traceId: string | undefined, event: string, fields: Record<string, unknown> = {}): void {
  if (!traceId) return;
  logger.info("[video-poster-frame]", {
    trace_id: traceId,
    event,
    ...fields,
  });
}

function parsePosterFrameSeconds(value: string | undefined): number {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadeddata" | "loadedmetadata" | "seeked",
  traceId?: string,
  timeoutMs = VIDEO_POSTER_EVENT_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAtMs = nowMs();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    logPosterTrace(traceId, `${eventName}:wait`, {
      ready_state: video.readyState,
      timeout_ms: timeoutMs,
    });
    const handleEvent = () => {
      cleanup();
      logPosterTrace(traceId, `${eventName}:done`, {
        duration_ms: elapsedMs(startedAtMs),
        ready_state: video.readyState,
        video_height: video.videoHeight,
        video_width: video.videoWidth,
      });
      resolve();
    };
    const handleError = () => {
      cleanup();
      logPosterTrace(traceId, `${eventName}:failed`, {
        duration_ms: elapsedMs(startedAtMs),
        ready_state: video.readyState,
      });
      reject(new Error("Could not read the selected video frame."));
    };
    const handleTimeout = () => {
      cleanup();
      logPosterTrace(traceId, `${eventName}:timeout`, {
        duration_ms: elapsedMs(startedAtMs),
        ready_state: video.readyState,
        video_height: video.videoHeight,
        video_width: video.videoWidth,
      });
      reject(new Error(`Timed out while reading the selected video frame (${eventName}).`));
    };
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
    timeoutId = setTimeout(handleTimeout, timeoutMs);
  });
}

function isBlankFrame(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  const sampleWidth = Math.min(64, canvas.width);
  const sampleHeight = Math.min(64, canvas.height);
  if (sampleWidth <= 0 || sampleHeight <= 0) return false;

  const image = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let totalLuma = 0;
  let brightPixels = 0;
  const pixelCount = image.length / 4;

  for (let index = 0; index < image.length; index += 4) {
    const luma = 0.2126 * image[index]! + 0.7152 * image[index + 1]! + 0.0722 * image[index + 2]!;
    totalLuma += luma;
    if (luma > 24) brightPixels += 1;
  }

  return totalLuma / pixelCount < 10 && brightPixels / pixelCount < 0.01;
}

async function seekTo(video: HTMLVideoElement, seconds: number, traceId?: string): Promise<void> {
  const target = Math.max(0, seconds);
  if (Math.abs(video.currentTime - target) < 0.01) {
    logPosterTrace(traceId, "seek:skipped", {
      current_time_seconds: Math.round(video.currentTime * 10) / 10,
      target_seconds: target,
    });
    return;
  }
  const startedAtMs = nowMs();
  logPosterTrace(traceId, "seek:start", {
    current_time_seconds: Math.round(video.currentTime * 10) / 10,
    target_seconds: target,
  });
  video.currentTime = target;
  await waitForVideoEvent(video, "seeked", traceId);
  logPosterTrace(traceId, "seek:done", {
    duration_ms: elapsedMs(startedAtMs),
    current_time_seconds: Math.round(video.currentTime * 10) / 10,
    target_seconds: target,
  });
}

function candidateSeconds(duration: number, selectedSeconds: number): number[] {
  const rawCandidates = selectedSeconds > 0
    ? [selectedSeconds]
    : [0, 0.5, 1, duration * 0.1];

  return Array.from(new Set(rawCandidates.reduce<number[]>((result, candidate) => {
    if (Number.isFinite(candidate) && candidate >= 0) {
      const clampedCandidate = Math.min(Math.max(0, duration), candidate);
      result.push(Math.round(clampedCandidate * 10) / 10);
    }
    return result;
  }, [])));
}

function drawPosterFrame(
  video: HTMLVideoElement,
  maxWidth: number | undefined,
): { canvas: HTMLCanvasElement; height: number; width: number } {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Could not read the selected video frame.");
  }

  const scale = maxWidth && sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the selected video frame.");
  }
  context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
  return { canvas, height, width };
}

export function dataUrlToBlob(dataUrl: string, fallbackType = "application/octet-stream"): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("Could not save the selected video frame.");
  }

  const mimeType = match[1] || fallbackType;
  const isBase64 = match[2] === ";base64";
  const body = match[3] ?? "";

  if (!isBase64) {
    return new Blob([decodeURIComponent(body)], { type: mimeType });
  }

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function extractVideoPosterFrameFromObjectUrl(
  objectUrl: string,
  frameSeconds: string | undefined,
  options: VideoPosterFrameOptions = {},
): Promise<ExtractedVideoPosterFrame> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    video.src = objectUrl;
    logPosterTrace(options.traceId, "start", {
      frame_seconds: frameSeconds ?? null,
      max_width: options.maxWidth ?? null,
    });
    video.load();
    await waitForVideoEvent(video, "loadedmetadata", options.traceId);
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        await waitForVideoEvent(video, "loadeddata", options.traceId, VIDEO_POSTER_LOADED_DATA_TIMEOUT_MS);
      } catch (error) {
        logPosterTrace(options.traceId, "loadeddata:continue_after_timeout", {
          error: error instanceof Error ? error.message : String(error),
          ready_state: video.readyState,
          video_height: video.videoHeight,
          video_width: video.videoWidth,
        });
      }
    }

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const selectedSeconds = Math.min(Math.max(0, duration), parsePosterFrameSeconds(frameSeconds));
    const candidates = candidateSeconds(duration, selectedSeconds);
    logPosterTrace(options.traceId, "candidates", {
      candidate_seconds: candidates,
      duration_seconds: Math.round(duration * 10) / 10,
      selected_seconds: selectedSeconds,
      video_height: video.videoHeight,
      video_width: video.videoWidth,
    });
    let fallback: ExtractedVideoPosterFrame | null = null;
    let lastError: unknown = null;

    for (const seconds of candidates) {
      try {
        logPosterTrace(options.traceId, "candidate:start", { seconds });
        await seekTo(video, seconds, options.traceId);
        const drawStartedAtMs = nowMs();
        const { canvas, height, width } = drawPosterFrame(video, options.maxWidth);
        logPosterTrace(options.traceId, "draw:done", {
          duration_ms: elapsedMs(drawStartedAtMs),
          height,
          seconds,
          width,
        });
        const encodeStartedAtMs = nowMs();
        const frame: ExtractedVideoPosterFrame = {
          dataUrl: canvas.toDataURL("image/jpeg", 0.86),
          frameMs: Math.round(seconds * 1000),
          height,
          width,
        };
        logPosterTrace(options.traceId, "encode:done", {
          data_url_bytes: frame.dataUrl.length,
          duration_ms: elapsedMs(encodeStartedAtMs),
          seconds,
        });

        if (!fallback) fallback = frame;
        const blankCheckStartedAtMs = nowMs();
        const blankFrame = isBlankFrame(canvas);
        logPosterTrace(options.traceId, "blank_check:done", {
          blank_frame: blankFrame,
          duration_ms: elapsedMs(blankCheckStartedAtMs),
          seconds,
        });
        if (!blankFrame) return frame;
        if (selectedSeconds > 0) return frame;
      } catch (error) {
        lastError = error;
        logPosterTrace(options.traceId, "candidate:failed", {
          error: error instanceof Error ? error.message : String(error),
          seconds,
        });
        if (selectedSeconds > 0) break;
      }
    }

    if (fallback) return fallback;
    if (lastError instanceof Error) throw lastError;
    throw new Error("Could not save the selected video frame.");
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

export async function extractVideoPosterFrameDataUrl(
  file: File,
  frameSeconds: string | undefined,
  options: VideoPosterFrameOptions = {},
): Promise<ExtractedVideoPosterFrame> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await extractVideoPosterFrameFromObjectUrl(objectUrl, frameSeconds, options);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function extractVideoPosterFrameSourceDataUrl(
  src: string,
  frameSeconds: string | undefined,
  options: VideoPosterFrameOptions = {},
): Promise<ExtractedVideoPosterFrame> {
  return await extractVideoPosterFrameFromObjectUrl(src, frameSeconds, options);
}

export async function extractVideoPosterFrameFile(
  file: File,
  frameSeconds: string | undefined,
  options: VideoPosterFrameOptions = {},
): Promise<ExtractedVideoPosterFrame & { file: File }> {
  const frame = await extractVideoPosterFrameDataUrl(file, frameSeconds, options);
  const blob = dataUrlToBlob(frame.dataUrl, "image/jpeg");
  return {
    ...frame,
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "video"}-cover-frame.jpg`, {
      type: "image/jpeg",
    }),
  };
}

export const __videoPosterFrameTestHooks = {
  candidateSeconds,
  VIDEO_POSTER_EVENT_TIMEOUT_MS,
  VIDEO_POSTER_LOADED_DATA_TIMEOUT_MS,
};
