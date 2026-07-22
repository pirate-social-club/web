export interface VideoViewerReturnState {
  createdAt: number;
  itemId: string;
  muted: boolean;
  paused: boolean;
  playbackSeconds: number;
  returnPath: string;
  scrollY: number;
}

const STORAGE_KEY = "pirate.videoViewer.returnState";
const MAX_AGE_MS = 30 * 60 * 1000;

export function currentRelativePath(location: Pick<Location, "hash" | "pathname" | "search"> = window.location): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://pirate.invalid");
    return url.origin === "https://pirate.invalid" ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

export function routeReturnPath(fallback: string): string {
  return safeReturnPath(new URLSearchParams(window.location.search).get("return_to")) ?? fallback;
}

export function saveVideoViewerReturnState(state: VideoViewerReturnState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Restoration is a convenience; navigation must still work without storage.
  }
}

export function readVideoViewerReturnState(returnPath: string, now = Date.now()): VideoViewerReturnState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as Partial<VideoViewerReturnState>;
    if (
      typeof state.createdAt !== "number"
      || now - state.createdAt > MAX_AGE_MS
      || state.returnPath !== returnPath
      || typeof state.itemId !== "string"
      || typeof state.playbackSeconds !== "number"
      || typeof state.muted !== "boolean"
      || typeof state.paused !== "boolean"
      || typeof state.scrollY !== "number"
    ) return null;
    return state as VideoViewerReturnState;
  } catch {
    return null;
  }
}

export function clearVideoViewerReturnState(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
