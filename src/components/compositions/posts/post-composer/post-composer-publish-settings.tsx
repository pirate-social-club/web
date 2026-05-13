"use client";

import { useEffect, useState } from "react";

import { CardContent } from "@/components/primitives/card";
import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import type { PlaybackState, PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { cn } from "@/lib/utils";

import { QualifierSection } from "./post-composer-identity-section";
import { buildPostComposerPreviewContent } from "./post-composer-preview";
import type { AttachmentState } from "./post-composer.types";
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
  onPause: () => void;
  onPlay: () => Promise<void>;
  state: PlaybackState;
} {
  const audioRef = useState(() => typeof Audio === "undefined" ? null : new Audio())[0];
  const [state, setState] = useState<PlaybackState>("idle");

  useEffect(() => {
    if (!audioRef) return undefined;

    const handlePlay = () => setState("playing");
    const handlePause = () => setState(audioRef.currentTime > 0 && !audioRef.ended ? "paused" : "idle");
    const handleEnded = () => setState("ended");
    const handleWaiting = () => setState("buffering");
    const handleCanPlay = () => {
      if (!audioRef.paused) setState("playing");
    };

    audioRef.addEventListener("play", handlePlay);
    audioRef.addEventListener("pause", handlePause);
    audioRef.addEventListener("ended", handleEnded);
    audioRef.addEventListener("waiting", handleWaiting);
    audioRef.addEventListener("canplay", handleCanPlay);

    return () => {
      audioRef.pause();
      audioRef.removeEventListener("play", handlePlay);
      audioRef.removeEventListener("pause", handlePause);
      audioRef.removeEventListener("ended", handleEnded);
      audioRef.removeEventListener("waiting", handleWaiting);
      audioRef.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioRef]);

  useEffect(() => {
    if (!audioRef) return;
    audioRef.pause();
    audioRef.removeAttribute("src");
    audioRef.load();
    setState("idle");
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

  return { onPause, onPlay, state };
}

function useVideoPosterFrameUrl(file: File | null | undefined, frameSeconds: string | undefined) {
  const [posterUrl, setPosterUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file) {
      console.debug("[post-composer] publish preview poster: no video file");
      setPosterUrl(undefined);
      return;
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
        if (!cancelled) {
          setPosterUrl(undefined);
        }
      }
    }

    setPosterUrl(undefined);
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
  songPlayback?: {
    onPause?: () => void;
    onPlay?: () => void;
    state: PlaybackState;
  },
): PostCardProps {
  const { audience, commerce, fields, identity } = controller;
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

  const previewPost: PostCardProps = {
    byline: {
      author: {
        kind: "user",
        label: authorLabel,
        avatarSrc: authorAvatarSrc,
        avatarSeed: authorAvatarSeed,
      },
      timestampLabel: audience.state.visibility === "public" ? "Public" : "Community",
    },
    content: buildPostComposerPreviewContent({
      access: commerce.monetizationState.visible ? "paid" : "free",
      attachment,
      body: getPostComposerPreviewBody(controller),
      linkPreview: fields.linkPreview,
      price: commerce.monetizationState.priceUsd ?? "",
      songTitle: controller.song.state.title,
      songPlayback,
      title: fields.titleValue,
      videoPosterSrc: videoPosterPreviewUrl,
    }),
    engagement: {
      commentCount: 0,
      score: 0,
      unlock: commerce.monetizationState.visible && priceLabel
        ? { label: priceLabel, onBuy: () => undefined }
        : undefined,
    },
    identityPresentation: identity.identityMode === "anonymous" ? "anonymous_primary" : "author_primary",
    title: fields.titleValue.trim() || undefined,
    viewContext: "community",
  };

  if (attachment?.kind === "video") {
    console.debug("[post-composer] publish preview post: video content", {
      hasPoster: previewPost.content.type === "video" ? Boolean(previewPost.content.posterSrc) : false,
      hasVideoPosterPreviewUrl: Boolean(videoPosterPreviewUrl),
      posterPrefix: previewPost.content.type === "video"
        ? previewPost.content.posterSrc?.slice(0, 32)
        : undefined,
      srcPrefix: previewPost.content.type === "video"
        ? previewPost.content.src.slice(0, 32)
        : undefined,
    });
  }

  return previewPost;
}

export function PostComposerPublishSettings({
  controller,
}: PostComposerPublishSettingsProps) {
  const imagePreviewUrl = useObjectUrl(controller.media.activeImageUpload);
  const videoPreviewUrl = useObjectUrl(controller.media.videoState.primaryVideoUpload);
  const songAudioPreviewUrl = useObjectUrl(controller.song.state.primaryAudioUpload);
  const songArtworkPreviewUrl = useObjectUrl(controller.song.state.coverUpload);
  const songPlayback = useLocalAudioPreview(songAudioPreviewUrl);
  const videoPosterPreviewUrl = useVideoPosterFrameUrl(
    controller.media.videoState.primaryVideoUpload,
    controller.media.videoState.posterFrameSeconds,
  );
  const attachment = attachmentFromController(
    controller,
    imagePreviewUrl,
    videoPreviewUrl,
    songAudioPreviewUrl,
    songArtworkPreviewUrl,
  );
  const previewPost = buildPreviewPost(controller, attachment, videoPosterPreviewUrl, songPlayback);

  return (
    <CardContent className={cn("space-y-6 p-5", controller.isMobile && "px-0 pb-4 pt-3")}>
      <section className={cn("overflow-hidden border border-border-soft bg-background", controller.isMobile ? "-mx-4 border-x-0" : "rounded-[var(--radius-lg)]")}>
        <PostCard {...previewPost} />
      </section>

      {shouldShowQualifiers(controller) && controller.identity.identity ? (
        <QualifierSection
          identity={controller.identity.identity}
          onSelectedQualifierIdsChange={controller.identity.setSelectedQualifierIds}
          selectedQualifierIds={controller.identity.selectedQualifierIds}
        />
      ) : null}
    </CardContent>
  );
}
