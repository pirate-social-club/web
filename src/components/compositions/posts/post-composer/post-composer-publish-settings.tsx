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

  return {
    byline: {
      author: {
        kind: "user",
        label: authorLabel,
        avatarSrc: identity.identity?.publicAvatarSrc ?? undefined,
        avatarSeed: identity.identity?.publicAvatarSeed ?? undefined,
      },
      timestampLabel: audience.state.visibility === "public" ? "Public" : "Community",
    },
    content: buildPostComposerPreviewContent({
      access: commerce.monetizationState.visible ? "paid" : "free",
      attachment,
      body: previewBody(controller),
      price: commerce.monetizationState.priceUsd ?? "",
      title: fields.titleValue,
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
}

export function PostComposerPublishSettings({
  controller,
}: PostComposerPublishSettingsProps) {
  const imagePreviewUrl = useObjectUrl(controller.media.activeImageUpload);
  const videoPreviewUrl = useObjectUrl(controller.media.videoState.primaryVideoUpload);
  const attachment = attachmentFromController(controller, imagePreviewUrl, videoPreviewUrl);
  const previewPost = buildPreviewPost(controller, attachment);

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
