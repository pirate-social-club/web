"use client";

import { useEffect, useState } from "react";

import { CardContent } from "@/components/primitives/card";
import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { cn } from "@/lib/utils";

import { QualifierSection } from "./post-composer-identity-section";
import { buildPostComposerPreviewContent } from "./post-composer-preview";
import type { AttachmentState } from "./post-composer.types";
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

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadeddata" | "loadedmetadata" | "seeked",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Could not read the selected video frame."));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function parseFrameSeconds(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function useVideoPosterFrameUrl(file: File | null | undefined, frameSeconds: string | undefined) {
  const [posterUrl, setPosterUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file) {
      console.debug("[post-composer] publish preview poster: no video file");
      setPosterUrl(undefined);
      return;
    }

    const activeFile = file;
    let cancelled = false;
    const objectUrl = URL.createObjectURL(activeFile);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    async function extractFrame() {
      try {
        console.debug("[post-composer] publish preview poster: starting extraction", {
          fileName: activeFile.name,
          fileSize: activeFile.size,
          fileType: activeFile.type,
          frameSeconds,
        });
        video.src = objectUrl;
        await waitForVideoEvent(video, "loadedmetadata");
        console.debug("[post-composer] publish preview poster: metadata loaded", {
          duration: video.duration,
          readyState: video.readyState,
          videoHeight: video.videoHeight,
          videoWidth: video.videoWidth,
        });
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await waitForVideoEvent(video, "loadeddata");
          console.debug("[post-composer] publish preview poster: data loaded", {
            readyState: video.readyState,
            videoHeight: video.videoHeight,
            videoWidth: video.videoWidth,
          });
        }

        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const selectedSeconds = Math.min(Math.max(0, duration), parseFrameSeconds(frameSeconds));
        if (selectedSeconds > 0) {
          video.currentTime = selectedSeconds;
          await waitForVideoEvent(video, "seeked");
          console.debug("[post-composer] publish preview poster: seeked", {
            currentTime: video.currentTime,
            selectedSeconds,
          });
        }

        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        if (sourceWidth <= 0 || sourceHeight <= 0) {
          throw new Error("Could not read the selected video frame.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not prepare the selected video frame.");
        }
        context.drawImage(video, 0, 0, sourceWidth, sourceHeight);

        if (!cancelled) {
          const nextPosterUrl = canvas.toDataURL("image/jpeg", 0.9);
          console.debug("[post-composer] publish preview poster: extracted", {
            byteLength: nextPosterUrl.length,
            sourceHeight,
            sourceWidth,
          });
          setPosterUrl(nextPosterUrl);
        }
      } catch (error) {
        console.debug("[post-composer] publish preview poster: extraction failed", {
          error,
          fileName: activeFile.name,
          frameSeconds,
        });
        if (!cancelled) {
          setPosterUrl(undefined);
        }
      }
    }

    setPosterUrl(undefined);
    void extractFrame();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
  }, [file, frameSeconds]);

  return posterUrl;
}

function attachmentFromController(
  controller: PostComposerController,
  imagePreviewUrl?: string,
  videoPreviewUrl?: string,
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
      label: song.state.primaryAudioUpload?.name ?? song.state.primaryAudioLabel ?? "Song",
    };
  }
  if (tabs.activeTab === "live") {
    return { kind: "live" };
  }
  return null;
}

function previewBody(controller: PostComposerController) {
  const { fields, tabs } = controller;
  return tabs.activeTab === "image" || tabs.activeTab === "video"
    ? fields.captionValue
    : fields.textBodyValue;
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
      body: previewBody(controller),
      price: commerce.monetizationState.priceUsd ?? "",
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
  const videoPosterPreviewUrl = useVideoPosterFrameUrl(
    controller.media.videoState.primaryVideoUpload,
    controller.media.videoState.posterFrameSeconds,
  );
  const attachment = attachmentFromController(controller, imagePreviewUrl, videoPreviewUrl);
  const previewPost = buildPreviewPost(controller, attachment, videoPosterPreviewUrl);

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
