"use client";

import { useEffect, useRef, useState } from "react";

import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import { buildPostCardTitleProps } from "@/components/compositions/posts/post-card/post-card-content-rules";
import { useVideoSourceAspectRatio } from "@/components/compositions/posts/video-preview-layout";
import { postCardReadableWidth } from "@/components/compositions/posts/post-card/post-card.styles";
import type { PlaybackState, PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { cn } from "@/lib/utils";

import { QualifierSection } from "./post-composer-identity-section";
import { buildPostComposerPreviewContent } from "./post-composer-preview";
import type { AttachmentState, ComposerEventState } from "./post-composer.types";
import { extractVideoPosterFrameDataUrl } from "./video-poster-frame";
import type { PostComposerController } from "./use-post-composer-controller";

type PostComposerPublishSettingsProps = {
  controller: PostComposerController;
};

function formatPrice(value?: string) {
  const normalized = value?.trim();
  if (!normalized) return "$1.00";
  return normalized.startsWith("$") ? normalized : `$${normalized}`;
}

function useObjectUrl(file: File | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file) {
      setObjectUrl(undefined);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return objectUrl;
}

function useLocalAudioPreview(src: string | undefined): {
  durationMs?: number;
  onPause: () => void;
  onPlay: () => Promise<void>;
  onSeek: (progressMs: number) => void;
  progressMs: number;
  state: PlaybackState;
} {
  const audioRef = useState(() => typeof Audio === "undefined" ? null : new Audio())[0];
  const [state, setState] = useState<PlaybackState>("idle");
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | undefined>();

  useEffect(() => {
    if (!audioRef) return undefined;

    const handlePlay = () => setState("playing");
    const handlePause = () => setState(audioRef.currentTime > 0 && !audioRef.ended ? "paused" : "idle");
    const handleEnded = () => setState("ended");
    const handleWaiting = () => setState("buffering");
    const handleCanPlay = () => {
      if (!audioRef.paused) setState("playing");
    };
    const updateProgress = () => {
      setProgressMs(Math.round(audioRef.currentTime * 1000));
      setDurationMs(
        Number.isFinite(audioRef.duration) && audioRef.duration > 0
          ? Math.round(audioRef.duration * 1000)
          : undefined,
      );
    };

    audioRef.addEventListener("play", handlePlay);
    audioRef.addEventListener("pause", handlePause);
    audioRef.addEventListener("ended", handleEnded);
    audioRef.addEventListener("waiting", handleWaiting);
    audioRef.addEventListener("canplay", handleCanPlay);
    audioRef.addEventListener("durationchange", updateProgress);
    audioRef.addEventListener("loadedmetadata", updateProgress);
    audioRef.addEventListener("seeked", updateProgress);
    audioRef.addEventListener("timeupdate", updateProgress);

    return () => {
      audioRef.pause();
      audioRef.removeEventListener("play", handlePlay);
      audioRef.removeEventListener("pause", handlePause);
      audioRef.removeEventListener("ended", handleEnded);
      audioRef.removeEventListener("waiting", handleWaiting);
      audioRef.removeEventListener("canplay", handleCanPlay);
      audioRef.removeEventListener("durationchange", updateProgress);
      audioRef.removeEventListener("loadedmetadata", updateProgress);
      audioRef.removeEventListener("seeked", updateProgress);
      audioRef.removeEventListener("timeupdate", updateProgress);
    };
  }, [audioRef]);

  useEffect(() => {
    if (!audioRef) return;
    audioRef.pause();
    audioRef.removeAttribute("src");
    audioRef.load();
    setState("idle");
    setProgressMs(0);
    setDurationMs(undefined);
  }, [audioRef, src]);

  async function onPlay() {
    if (!audioRef || !src) return;
    setState("buffering");
    if (audioRef.src !== src) {
      audioRef.src = src;
    }
    try {
      await audioRef.play();
    } catch {
      setState("idle");
    }
  }

  function onPause() {
    audioRef?.pause();
  }

  function onSeek(nextProgressMs: number) {
    if (!audioRef || !src) return;
    if (audioRef.src !== src) {
      audioRef.src = src;
    }
    const nextSeconds = Math.max(0, nextProgressMs / 1000);
    const seekTo = () => {
      audioRef.currentTime = Number.isFinite(audioRef.duration)
        ? Math.min(nextSeconds, audioRef.duration)
        : nextSeconds;
    };
    if (audioRef.readyState > HTMLMediaElement.HAVE_NOTHING) {
      seekTo();
    } else {
      audioRef.addEventListener("loadedmetadata", seekTo, { once: true });
    }
    setProgressMs(Math.max(0, Math.round(nextProgressMs)));
  }

  return { durationMs, onPause, onPlay, onSeek, progressMs, state };
}

function downloadLocalPreviewFile(url: string, filename: string | undefined) {
  if (typeof document === "undefined") return;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename?.trim() || "song";
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function useVideoPosterFrameUrl(file: File | null | undefined, frameSeconds: string | undefined) {
  const [posterUrl, setPosterUrl] = useState<string | undefined>();
  const previousFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!file) {
      previousFileRef.current = null;
      setPosterUrl(undefined);
      return;
    }

    const fileChanged = previousFileRef.current !== file;
    previousFileRef.current = file;
    if (fileChanged) {
      setPosterUrl(undefined);
    }

    let cancelled = false;
    const activeFile = file;

    async function extractFrame() {
      try {
        const poster = await extractVideoPosterFrameDataUrl(activeFile, frameSeconds);
        if (!cancelled) {
          setPosterUrl(poster.dataUrl);
        }
      } catch {
        // Keep the last valid frame when a new frame cannot be extracted.
      }
    }

    void extractFrame();

    return () => {
      cancelled = true;
    };
  }, [file, frameSeconds]);

  return posterUrl;
}

function attachmentFromController(
  controller: PostComposerController,
  imagePreviewUrl?: string,
  videoPreviewUrl?: string,
  videoAspectRatio?: number,
  songAudioPreviewUrl?: string,
  songArtworkPreviewUrl?: string,
): AttachmentState {
  const { fields, media, song, tabs } = controller;

  if (tabs.activeTab === "link") {
    return { kind: "link", url: fields.linkUrlValue };
  }
  if (tabs.activeTab === "image") {
    return {
      kind: "image",
      label: media.activeImageUpload?.name ?? media.imageUploadLabel ?? "Image",
      previewUrl: imagePreviewUrl,
    };
  }
  if (tabs.activeTab === "video") {
    return {
      kind: "video",
      label: media.videoState.primaryVideoUpload?.name ?? media.videoState.primaryVideoLabel ?? "Video",
      aspectRatio: videoAspectRatio,
      previewUrl: videoPreviewUrl,
    };
  }
  if (tabs.activeTab === "song") {
    return {
      kind: "song",
      artworkUrl: songArtworkPreviewUrl,
      label: song.state.title?.trim() || song.state.primaryAudioUpload?.name || song.state.primaryAudioLabel || "Song",
      previewUrl: songAudioPreviewUrl,
    };
  }
  if (tabs.activeTab === "live") {
    return { kind: "live" };
  }
  return null;
}

export function getPostComposerPreviewBody(controller: PostComposerController) {
  const { fields, tabs } = controller;
  if (tabs.activeTab === "image" || tabs.activeTab === "video") {
    return fields.captionValue;
  }
  return fields.textBodyValue;
}

function shouldShowQualifiers(controller: PostComposerController) {
  const { identity } = controller;

  return Boolean(
    identity.identity?.availableQualifiers?.some((qualifier) => !qualifier.suppressedByClubGate)
    && identity.authorMode !== "agent"
    && identity.identityMode === "anonymous"
    && identity.identity.allowQualifiersOnAnonymousPosts !== false
  );
}

function buildPreviewPost(
  controller: PostComposerController,
  attachment: AttachmentState,
  videoPosterPreviewUrl?: string,
  liveCoverPreviewUrl?: string,
  songPlayback?: {
    durationMs?: number;
    onPause?: () => void;
    onPlay?: () => void;
    onSeek?: (progressMs: number) => void;
    progressMs?: number;
    state: PlaybackState;
  },
  songDownloads?: {
    onOriginalDownload?: () => void;
    stems?: Array<{
      kind: "instrumental" | "vocals";
      label?: string;
      onDownload?: () => void;
    }>;
  },
): PostCardProps {
  const { commerce, fields, identity } = controller;
  const priceLabel = commerce.monetizationState.priceUsd
    ? formatPrice(commerce.monetizationState.priceUsd)
    : undefined;
  const authorLabel = identity.authorMode === "agent" && identity.identity?.agentLabel
    ? identity.identity.agentLabel
    : identity.identityMode === "anonymous"
      ? identity.identity?.anonymousLabel ?? "Pseudonym"
      : identity.identity?.publicHandle ?? "name.pirate";
  const authorAvatarSeed = identity.identityMode === "anonymous"
    ? authorLabel
    : identity.identity?.publicAvatarSeed ?? undefined;
  const authorAvatarSrc = identity.identityMode === "anonymous"
    ? undefined
    : identity.identity?.publicAvatarSrc ?? undefined;
  const content = buildPostComposerPreviewContent({
    access: commerce.monetizationState.visible ? "paid" : "free",
    attachment,
    body: getPostComposerPreviewBody(controller),
    derivativeStep: controller.primary.derivativeState,
    linkPreview: fields.linkPreview,
    liveCoverSrc: liveCoverPreviewUrl,
    liveGuestLabel: controller.primary.liveState.guestUserId ?? undefined,
    liveHostIdentity: {
      label: authorLabel,
      avatarSrc: authorAvatarSrc,
    },
    liveState: controller.primary.liveState,
    price: commerce.monetizationState.priceUsd ?? "",
    vinylReleaseUrl: commerce.monetizationState.vinylReleaseUrl,
    onSongBuy: commerce.monetizationState.visible ? () => undefined : undefined,
    onSongDownload: songDownloads?.onOriginalDownload,
    songStems: songDownloads?.stems,
    songTitle: controller.song.state.title,
    songPlayback,
    songFeaturePreview: attachment?.kind === "song"
      ? {
          karaoke: controller.fields.lyricsValue.trim()
            && (controller.song.state.instrumentalAudioUpload || controller.song.state.instrumentalAudioLabel)
            ? { previewOnly: true, status: "processing" }
            : undefined,
          study: controller.fields.lyricsValue.trim()
            ? { previewOnly: true, status: "processing" }
            : undefined,
        }
      : undefined,
    title: fields.titleValue,
    videoPosterSrc: videoPosterPreviewUrl,
  });
  const titleProps = buildPostCardTitleProps({
    content,
    title: fields.titleValue.trim(),
  });
  const event = attachment?.kind === "live" ? undefined : buildPreviewEvent(controller.event.state);

  const previewPost: PostCardProps = {
    byline: {
      author: {
        kind: "user",
        label: authorLabel,
        avatarSrc: authorAvatarSrc,
        avatarSeed: authorAvatarSeed,
      },
      timestampLabel: "now",
    },
    content,
    engagement: {
      commentCount: 0,
      score: 0,
      unlock: attachment?.kind !== "live" && commerce.monetizationState.visible && priceLabel
        ? { label: priceLabel, onBuy: () => undefined }
        : undefined,
    },
    identityPresentation: identity.identityMode === "anonymous" ? "anonymous_primary" : "author_primary",
    event,
    previewMode: true,
    ...titleProps,
    viewContext: "post",
  };

  return previewPost;
}

function buildPreviewEvent(event: ComposerEventState): PostCardProps["event"] | undefined {
  if (event.enabled !== true || !event.startsAt?.trim()) {
    return undefined;
  }
  const timezone = event.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone }).format(new Date());
  } catch {
    return undefined;
  }

  return {
    address: event.isOnline ? undefined : event.address?.trim() || undefined,
    endsAt: event.endsAt?.trim() || undefined,
    eventUrl: event.eventUrl?.trim() || undefined,
    isOnline: event.isOnline === true,
    locationName: event.isOnline ? undefined : event.locationName?.trim() || undefined,
    place: event.isOnline ? undefined : event.place,
    startsAt: event.startsAt.trim(),
    status: "scheduled",
    timezone,
  };
}

export function PostComposerPublishSettings({
  controller,
}: PostComposerPublishSettingsProps) {
  const imagePreviewUrl = useObjectUrl(controller.media.activeImageUpload);
  const videoPreviewUrl = useObjectUrl(controller.media.videoState.primaryVideoUpload);
  const detectedVideoAspectRatio = useVideoSourceAspectRatio(videoPreviewUrl);
  const videoAspectRatio = detectedVideoAspectRatio ?? controller.media.videoState.primaryVideoAspectRatio;
  const songAudioPreviewUrl = useObjectUrl(controller.song.state.primaryAudioUpload);
  const songArtworkPreviewUrl = useObjectUrl(controller.song.state.coverUpload);
  const instrumentalAudioPreviewUrl = useObjectUrl(controller.song.state.instrumentalAudioUpload);
  const vocalAudioPreviewUrl = useObjectUrl(controller.song.state.vocalAudioUpload);
  const liveCoverPreviewUrl = useObjectUrl(controller.primary.liveState.coverUpload);
  const songPlayback = useLocalAudioPreview(songAudioPreviewUrl);
  const videoPosterPreviewUrl = useVideoPosterFrameUrl(
    controller.media.videoState.primaryVideoUpload,
    controller.media.videoState.posterFrameSeconds,
  );
  const attachment = attachmentFromController(
    controller,
    imagePreviewUrl,
    videoPreviewUrl,
    videoAspectRatio,
    songAudioPreviewUrl,
    songArtworkPreviewUrl,
  );

  useEffect(() => {
    if (typeof detectedVideoAspectRatio !== "number") {
      return;
    }
    if (controller.media.videoState.primaryVideoAspectRatio === detectedVideoAspectRatio) {
      return;
    }

    controller.media.updateVideoState((current) => current.primaryVideoAspectRatio === detectedVideoAspectRatio
      ? current
      : { ...current, primaryVideoAspectRatio: detectedVideoAspectRatio });
  }, [
    controller.media.updateVideoState,
    controller.media.videoState.primaryVideoAspectRatio,
    detectedVideoAspectRatio,
  ]);
  const songDownloads = {
    onOriginalDownload: songAudioPreviewUrl
      ? () => downloadLocalPreviewFile(
        songAudioPreviewUrl,
        controller.song.state.primaryAudioUpload?.name ?? controller.song.state.primaryAudioLabel ?? "original",
      )
      : undefined,
    stems: [
      {
        kind: "instrumental" as const,
        label: "Instrumental",
        onDownload: instrumentalAudioPreviewUrl
          ? () => downloadLocalPreviewFile(
            instrumentalAudioPreviewUrl,
            controller.song.state.instrumentalAudioUpload?.name ?? controller.song.state.instrumentalAudioLabel ?? "instrumental",
          )
          : undefined,
      },
      {
        kind: "vocals" as const,
        label: "Vocals",
        onDownload: vocalAudioPreviewUrl
          ? () => downloadLocalPreviewFile(
            vocalAudioPreviewUrl,
            controller.song.state.vocalAudioUpload?.name ?? controller.song.state.vocalAudioLabel ?? "vocals",
          )
          : undefined,
      },
    ],
  };
  const previewPost = buildPreviewPost(
    controller,
    attachment,
    videoPosterPreviewUrl,
    liveCoverPreviewUrl,
    songPlayback,
    attachment?.kind === "song" ? songDownloads : undefined,
  );

  return (
    <div className={cn("space-y-6 pb-5", controller.isMobile && "pb-4 pt-3")}>
      <section
        className={cn(
          postCardReadableWidth,
          "overflow-hidden border-t border-border bg-background",
          controller.isMobile && "-mx-4 border-y",
        )}
      >
        <PostCard {...previewPost} className="border-b-0" />
      </section>

      {shouldShowQualifiers(controller) && controller.identity.identity ? (
        <QualifierSection
          identity={controller.identity.identity}
          onSelectedQualifierIdsChange={controller.identity.setSelectedQualifierIds}
          selectedQualifierIds={controller.identity.selectedQualifierIds}
        />
      ) : null}
    </div>
  );
}
