// Publish step: renders the real PostCard in preview mode so the author sees
// exactly what the feed will show (artwork, playback, lock state, pricing),
// ported from the React post-composer-publish-settings.tsx.
import { Show } from "solid-js";

import { CardContent, Type } from "../../../design-system";
import { cn } from "../../../design-system";
import { buildPostCardTitleProps } from "../post-card/content-rules";
import { PostCard } from "../post-card/post-card";
import { postCardReadableWidth } from "../post-card/styles";
import type { PostCardProps } from "../post-card/types";

import type { PostComposerController } from "./controller";
import {
  createLocalAudioPreview,
  createObjectUrl,
  createVideoPosterFrameUrl,
  createVideoSourceAspectRatio,
  downloadLocalPreviewFile,
} from "./media-hooks";
import { buildPostComposerPreviewContent, buildPreviewEvent, resolvePreviewBody } from "./preview";
import type { AttachmentState } from "./types";

function attachmentFor(
  controller: PostComposerController,
  imagePreview: string | undefined,
  videoPreview: string | undefined,
  videoAspectRatio: number | undefined,
  songAudioPreview: string | undefined,
  songArtwork: string | undefined,
): AttachmentState {
  const { fields, media, song, tabs } = controller;
  if (tabs.activeTab === "link") return { kind: "link", url: fields.linkUrlValue };
  if (tabs.activeTab === "image") return { kind: "image", label: media.activeImageUpload?.name ?? media.imageUploadLabel ?? "Image", previewUrl: imagePreview };
  if (tabs.activeTab === "video") return { kind: "video", label: media.videoState.primaryVideoUpload?.name ?? media.videoState.primaryVideoLabel ?? "Video", aspectRatio: videoAspectRatio, previewUrl: videoPreview };
  if (tabs.activeTab === "song") return { kind: "song", label: song.state.primaryAudioUpload?.name ?? song.state.primaryAudioLabel ?? "Audio file", artworkUrl: songArtwork, previewUrl: songAudioPreview };
  if (tabs.activeTab === "live") return { kind: "live" };
  if (tabs.activeTab === "file") return { kind: "file", label: controller.generic.file.upload?.name ?? controller.generic.file.label ?? "Downloadable file" };
  return null;
}

export function PostComposerPublishSettings(props: { controller: PostComposerController }) {
  const controller = props.controller;
  const imagePreview = createObjectUrl(() => controller.media.activeImageUpload);
  const videoPreview = createObjectUrl(() => controller.media.videoState.primaryVideoUpload);
  const detectedVideoAspectRatio = createVideoSourceAspectRatio(videoPreview);
  const videoAspectRatio = () => detectedVideoAspectRatio() ?? controller.media.videoState.primaryVideoAspectRatio;
  const videoPosterPreview = createVideoPosterFrameUrl(
    () => controller.media.videoState.primaryVideoUpload,
    () => controller.media.videoState.posterFrameSeconds,
  );
  const songAudioPreview = createObjectUrl(() => controller.song.state.primaryAudioUpload);
  const songArtwork = createObjectUrl(() => controller.song.state.coverUpload);
  const instrumentalPreview = createObjectUrl(() => controller.song.state.instrumentalAudioUpload);
  const vocalPreview = createObjectUrl(() => controller.song.state.vocalAudioUpload);
  const liveCoverPreview = createObjectUrl(() => controller.primary.liveState.coverUpload);
  const songPlayback = createLocalAudioPreview(songAudioPreview);

  const attachment = () => attachmentFor(
    controller,
    imagePreview(),
    videoPreview(),
    videoAspectRatio(),
    songAudioPreview(),
    songArtwork(),
  );

  const authorLabel = () => controller.identity.authorMode === "agent" && controller.identity.identity?.agentLabel
    ? controller.identity.identity.agentLabel
    : controller.identity.identityMode === "anonymous"
      ? controller.identity.identity?.anonymousLabel ?? "Pseudonym"
      : controller.identity.identity?.publicHandle ?? "name.pirate";
  const authorAvatarSrc = () => controller.identity.identityMode === "anonymous"
    ? undefined
    : controller.identity.identity?.publicAvatarSrc ?? undefined;
  const authorAvatarSeed = () => controller.identity.identityMode === "anonymous"
    ? authorLabel()
    : controller.identity.identity?.publicAvatarSeed ?? undefined;

  const songDownloads = () => {
    if (attachment()?.kind !== "song") return undefined;
    const audioUrl = songAudioPreview();
    const instrumentalUrl = instrumentalPreview();
    const vocalUrl = vocalPreview();
    return {
      onOriginalDownload: audioUrl
        ? () => downloadLocalPreviewFile(audioUrl, controller.song.state.primaryAudioUpload?.name ?? controller.song.state.primaryAudioLabel ?? "original")
        : undefined,
      stems: [
        {
          kind: "instrumental" as const,
          label: "Instrumental",
          onDownload: instrumentalUrl
            ? () => downloadLocalPreviewFile(instrumentalUrl, controller.song.state.instrumentalAudioUpload?.name ?? controller.song.state.instrumentalAudioLabel ?? "instrumental")
            : undefined,
        },
        {
          kind: "vocals" as const,
          label: "Vocals",
          onDownload: vocalUrl
            ? () => downloadLocalPreviewFile(vocalUrl, controller.song.state.vocalAudioUpload?.name ?? controller.song.state.vocalAudioLabel ?? "vocals")
            : undefined,
        },
      ],
    };
  };

  const previewPost = (): PostCardProps => {
    const monetization = controller.commerce.monetizationState;
    const access = monetization.visible ? "paid" as const : "free" as const;
    const priceLabel = monetization.priceUsd?.trim() ? `$${monetization.priceUsd.trim()}` : undefined;
    const currentAttachment = attachment();
    const downloads = songDownloads();
    const content = buildPostComposerPreviewContent({
      access,
      attachment: currentAttachment,
      body: resolvePreviewBody(controller.tabs.activeTab, controller.fields),
      derivativeStep: controller.primary.derivativeState,
      linkPreview: controller.fields.linkPreview,
      liveCoverSrc: liveCoverPreview(),
      liveGuestLabel: controller.primary.liveState.guestUserId ?? undefined,
      liveHostIdentity: { label: authorLabel(), avatarSrc: authorAvatarSrc() },
      liveState: controller.primary.liveState,
      price: monetization.priceUsd ?? "",
      vinylReleaseUrl: monetization.vinylReleaseUrl,
      onSongBuy: monetization.visible ? () => undefined : undefined,
      onSongDownload: downloads?.onOriginalDownload,
      songStems: downloads?.stems,
      songTitle: controller.song.state.title,
      songPlayback: {
        durationMs: songPlayback.durationMs(),
        onPause: songPlayback.onPause,
        onPlay: () => void songPlayback.onPlay(),
        onSeek: songPlayback.onSeek,
        progressMs: songPlayback.progressMs(),
        state: songPlayback.state(),
      },
      songFeaturePreview: currentAttachment?.kind === "song"
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
      title: controller.fields.titleValue,
      videoPosterSrc: videoPosterPreview(),
    });
    const titleProps = buildPostCardTitleProps({
      content,
      title: controller.fields.titleValue.trim(),
    });
    const event = currentAttachment?.kind === "live" ? undefined : buildPreviewEvent(controller.event.state);

    return {
      byline: {
        author: {
          kind: "user",
          label: authorLabel(),
          avatarSrc: authorAvatarSrc(),
          avatarSeed: authorAvatarSeed(),
        },
        timestampLabel: "now",
      },
      content,
      engagement: {
        commentCount: 0,
        score: 0,
        unlock: currentAttachment?.kind !== "live" && monetization.visible && priceLabel
          ? { label: priceLabel, onBuy: () => undefined }
          : undefined,
      },
      identityPresentation: controller.identity.identityMode === "anonymous" ? "anonymous_primary" : "author_primary",
      event,
      previewMode: true,
      ...titleProps,
      viewContext: "post",
    };
  };

  return (
    <CardContent class={cn("space-y-5 p-5", controller.isMobile() && "px-0 pb-24 pt-1")}>
      <div class="space-y-1">
        <Type as="h2" variant="h3">Post preview</Type>
        <Type as="p" variant="caption" class="text-muted-foreground">
          Review how this post will appear before publishing.
        </Type>
      </div>
      <section
        class={cn(
          postCardReadableWidth,
          "overflow-hidden border-t border-border bg-background",
          controller.isMobile() && "-mx-4 border-y",
        )}
      >
        <PostCard {...previewPost()} class="border-b-0" />
      </section>
      <Show when={controller.audience.state.visibility === "members_only"}>
        <Type as="p" variant="caption" class="text-muted-foreground">Visible to community members only.</Type>
      </Show>
    </CardContent>
  );
}
