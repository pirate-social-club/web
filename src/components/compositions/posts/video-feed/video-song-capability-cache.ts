import type { VideoFeedCapability } from "./video-feed.types";

export type VideoSongCapabilityReadMode = "authenticated" | "public";

export interface VideoSongCapabilityResolution {
  karaoke: VideoFeedCapability;
  karaokeHref?: string;
  readMode: VideoSongCapabilityReadMode;
  sourcePostId: string;
  study: VideoFeedCapability;
  studyHref?: string;
}

export type VideoSongCapabilityLoader = (
  sourcePostId: string,
) => Promise<VideoSongCapabilityResolution>;

type CachedResolution = VideoSongCapabilityResolution | null;

/** Viewer-session cache. Null is a durable, fail-closed miss for this scope. */
export class VideoSongCapabilityCache {
  private readonly entries = new Map<string, CachedResolution>();
  private readonly inFlight = new Map<string, Promise<boolean>>();
  private readonly resolvedKeyBySource = new Map<string, string>();

  constructor(
    private readonly scope: string,
    private readonly load: VideoSongCapabilityLoader,
    private readonly maxAttempts = 2,
  ) {}

  get(sourcePostId: string): CachedResolution | undefined {
    const key = this.resolvedKeyBySource.get(sourcePostId);
    return key ? this.entries.get(key) : undefined;
  }

  async prefetch(sourcePostIds: readonly string[]): Promise<boolean> {
    const uniqueIds = Array.from(new Set(sourcePostIds.map((id) => id.trim()).filter(Boolean)));
    const changes = await Promise.all(uniqueIds.map((sourcePostId) => this.ensure(sourcePostId)));
    return changes.some(Boolean);
  }

  private async ensure(sourcePostId: string): Promise<boolean> {
    if (this.resolvedKeyBySource.has(sourcePostId)) return false;
    const pending = this.inFlight.get(sourcePostId);
    if (pending) return await pending;

    const request = this.loadWithBoundedRetries(sourcePostId).finally(() => {
      this.inFlight.delete(sourcePostId);
    });
    this.inFlight.set(sourcePostId, request);
    return await request;
  }

  private async loadWithBoundedRetries(sourcePostId: string): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const resolution = await this.load(sourcePostId);
        const key = `${this.scope}:${sourcePostId}:${resolution.readMode}`;
        this.entries.set(key, resolution);
        this.resolvedKeyBySource.set(sourcePostId, key);
        return true;
      } catch {
        if (attempt < this.maxAttempts) continue;
      }
    }

    const key = `${this.scope}:${sourcePostId}:negative`;
    this.entries.set(key, null);
    this.resolvedKeyBySource.set(sourcePostId, key);
    return true;
  }
}
