import type { LocalizedPostResponse, SongKaraokePayload } from "@pirate/api-contracts";

import type { RawKaraokeLine } from "@/components/compositions/karaoke/lyric-transform";
import { resolveApiUrl } from "@/lib/api/base-url";

type KaraokeAudioArtifact = {
  decentralized_storage?: unknown;
  gateway_url?: string | null;
  storage_ref?: string | null;
};

type KaraokeSongPresentation = NonNullable<LocalizedPostResponse["song_presentation"]> & {
  alignment_status?: "pending" | "processing" | "completed" | "failed" | null;
  downloadable_audio?: Array<KaraokeAudioArtifact & { kind?: string | null }> | null;
  instrumental_audio?: KaraokeAudioArtifact | null;
  timed_lyrics?: unknown;
};

export interface NormalizedKaraokePayload {
  artistName?: string;
  artworkSrc?: string;
  instrumentalAudioUrl: string;
  rawLines: RawKaraokeLine[];
  title: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//u.test(value);
}

function toPlayableAudioUrl(value: unknown): string | undefined {
  const audioUrl = stringValue(value);

  if (!audioUrl) {
    return undefined;
  }

  if (audioUrl.startsWith("/")) {
    return resolveApiUrl(audioUrl);
  }

  if (isHttpUrl(audioUrl)) {
    // Song-artifact content is served by the API, so it must be fetched from the
    // API base this client is configured for. Rebase such absolute URLs onto the
    // active API origin so a bundle that stored a different environment's absolute
    // URL (e.g. staging) still loads — and stays CORS-clean — in dev and prod.
    // External URLs (e.g. IPFS gateways) are left untouched.
    try {
      const parsed = new URL(audioUrl);
      if (parsed.pathname.includes("/song-artifact-uploads/") && parsed.pathname.endsWith("/content")) {
        return resolveApiUrl(`${parsed.pathname}${parsed.search}`);
      }
    } catch {
      // Not a parseable URL — fall through and return as-is.
    }
    return audioUrl;
  }

  return undefined;
}

function gatewayUrlFromArtifact(artifact: KaraokeAudioArtifact | null | undefined): string | undefined {
  if (!artifact) return undefined;

  const proof = isRecord(artifact.decentralized_storage) ? artifact.decentralized_storage : null;
  return stringValue(proof?.gateway_url) ?? stringValue(artifact.gateway_url);
}

function toPlayableArtifactAudioUrl(artifact: KaraokeAudioArtifact | null | undefined): string | undefined {
  return toPlayableAudioUrl(artifact?.storage_ref) ?? toPlayableAudioUrl(gatewayUrlFromArtifact(artifact));
}

const rawLineContainerKeys = [
  "raw_lines",
  "rawLines",
  "full_karaoke_lines",
  "fullKaraokeLines",
  "lines",
  "lyrics",
] as const;

const rawLineTextKeys = [
  "original_text",
  "text",
  "en_text",
  "zh_text",
  "ja_text",
  "ko_text",
  "vi_text",
  "id_text",
] as const;

function nestedRawLines(value: Record<string, unknown>): unknown {
  for (const key of rawLineContainerKeys) {
    if (value[key] !== undefined) {
      return value[key];
    }
  }

  return undefined;
}

function isLikelyRawKaraokeLine(value: Record<string, unknown>): boolean {
  if (Array.isArray(value.words)) return true;
  if (
    value.start_ms !== undefined
    || value.end_ms !== undefined
    || value.startMs !== undefined
    || value.endMs !== undefined
    || value.start !== undefined
    || value.end !== undefined
  ) {
    return true;
  }

  return rawLineTextKeys.some((key) => value[key] !== undefined);
}

function extractRawLines(value: unknown): RawKaraokeLine[] {
  if (Array.isArray(value)) {
    const lines: RawKaraokeLine[] = [];

    for (const item of value) {
      if (!isRecord(item)) continue;
      if (isLikelyRawKaraokeLine(item)) {
        lines.push(item as RawKaraokeLine);
        continue;
      }

      const nested = nestedRawLines(item);
      if (nested !== undefined) {
        lines.push(...extractRawLines(nested));
      }
    }

    return lines;
  }

  if (!isRecord(value)) {
    return [];
  }

  return extractRawLines(nestedRawLines(value));
}

export function postTitle(post: LocalizedPostResponse | null): string {
  return post?.song_presentation?.title?.trim()
    || post?.post.song_title?.trim()
    || post?.post.title?.trim()
    || "Karaoke";
}

export function normalizeApiKaraokePayload(
  payload: SongKaraokePayload,
  post: LocalizedPostResponse,
): NormalizedKaraokePayload | null {
  const instrumentalAudioUrl = toPlayableAudioUrl(payload.instrumental_audio_url);
  const rawLines = extractRawLines(payload.karaoke_lines ?? payload.raw_lines);

  if (!instrumentalAudioUrl || rawLines.length === 0) {
    return null;
  }

  return {
    artistName: stringValue(payload.artist_name),
    artworkSrc: stringValue(payload.artwork_src) ?? post.song_presentation?.cover_art_ref ?? undefined,
    instrumentalAudioUrl,
    rawLines,
    title: stringValue(payload.title) ?? postTitle(post),
  };
}

function getInstrumentalArtifact(presentation: KaraokeSongPresentation | null | undefined): KaraokeAudioArtifact | null {
  return presentation?.instrumental_audio
    ?? presentation?.downloadable_audio?.find((item) => item.kind === "instrumental")
    ?? null;
}

export function normalizePostKaraokePayload(post: LocalizedPostResponse): NormalizedKaraokePayload | null {
  const presentation = post.song_presentation as KaraokeSongPresentation | null | undefined;
  const instrumentalAudioUrl = toPlayableArtifactAudioUrl(getInstrumentalArtifact(presentation));
  const rawLines = extractRawLines(presentation?.timed_lyrics);

  if (!instrumentalAudioUrl || rawLines.length === 0) {
    return null;
  }

  return {
    artworkSrc: post.song_presentation?.cover_art_ref ?? undefined,
    instrumentalAudioUrl,
    rawLines,
    title: postTitle(post),
  };
}

export function karaokeUnavailableMessage(post: LocalizedPostResponse): string {
  const presentation = post.song_presentation as KaraokeSongPresentation | null | undefined;
  const instrumental = getInstrumentalArtifact(presentation);

  if (post.post.post_type !== "song") {
    return "This post is not a song.";
  }
  if (!instrumental?.storage_ref) {
    return "This song does not have an instrumental track for karaoke.";
  }
  if (!toPlayableArtifactAudioUrl(instrumental)) {
    return "This song's instrumental track cannot be played in the browser yet.";
  }
  if (presentation?.alignment_status === "pending" || presentation?.alignment_status === "processing") {
    return "Karaoke lyrics are still processing.";
  }
  if (presentation?.alignment_status === "failed") {
    return "Karaoke lyrics could not be prepared for this song.";
  }
  return "Karaoke is not available for this song yet.";
}
