import type { VideoFeedCapability } from "./video-feed.types";

export type VideoSongCapabilityReadMode = "authenticated" | "public";

export interface VideoSongCapabilityResolution {
  activeRewardOffer: boolean;
  artworkSrc?: string;
  karaoke: VideoFeedCapability;
  karaokeHref?: string;
  readMode: VideoSongCapabilityReadMode;
  rewards?: {
    karaoke?: { amountLabel: string };
    study?: { amountLabel: string };
  };
  sourcePostId: string;
  sourceCommunityId: string | null;
  study: VideoFeedCapability;
  studyHref?: string;
  viewerIsAuthor: boolean;
}

export type VideoSongCapabilityLoader = (
  sourcePostId: string,
) => Promise<VideoSongCapabilityResolution>;

type CachedResolution = VideoSongCapabilityResolution | null;

/** Viewer-session cache. Successful resolutions persist; transient misses expire. */
export class VideoSongCapabilityCache {
  private readonly entries = new Map<string, CachedResolution>();
  private readonly inFlight = new Map<string, Promise<boolean>>();
  private readonly negativeExpiresAtBySource = new Map<string, number>();
  private readonly resolvedKeyBySource = new Map<string, string>();

  constructor(
    private readonly scope: string,
    private readonly load: VideoSongCapabilityLoader,
    private readonly maxAttempts = 2,
    private readonly negativeTtlMs = 30_000,
    private readonly now = () => Date.now(),
  ) {}

  get(sourcePostId: string): CachedResolution | undefined {
    this.expireNegativeResolution(sourcePostId);
    const key = this.resolvedKeyBySource.get(sourcePostId);
    return key ? this.entries.get(key) : undefined;
  }

  async prefetch(sourcePostIds: readonly string[]): Promise<boolean> {
    const uniqueIds = Array.from(new Set(sourcePostIds.map((id) => id.trim()).filter(Boolean)));
    const changes = await Promise.all(uniqueIds.map((sourcePostId) => this.ensure(sourcePostId)));
    return changes.some(Boolean);
  }

  private async ensure(sourcePostId: string): Promise<boolean> {
    this.expireNegativeResolution(sourcePostId);
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
    this.negativeExpiresAtBySource.set(sourcePostId, this.now() + this.negativeTtlMs);
    return true;
  }

  private expireNegativeResolution(sourcePostId: string): void {
    const expiresAt = this.negativeExpiresAtBySource.get(sourcePostId);
    if (expiresAt === undefined || expiresAt > this.now()) return;
    const key = this.resolvedKeyBySource.get(sourcePostId);
    if (key) this.entries.delete(key);
    this.resolvedKeyBySource.delete(sourcePostId);
    this.negativeExpiresAtBySource.delete(sourcePostId);
  }
}
