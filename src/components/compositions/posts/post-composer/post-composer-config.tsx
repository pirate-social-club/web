import * as React from "react";
import {
  Image as ImageIcon,
  Link,
  Microphone,
  MusicNotes,
  TextT,
  VideoCamera,
} from "@phosphor-icons/react";
import type {
  AttachmentKind,
  AttachmentState,
  CharityContributionState,
  ComposerAudienceState,
  ComposerEventState,
  ComposerTab,
  LiveAccessMode,
  LiveComposerState,
  LiveRoomKind,
  LiveVisibility,
  AssetLicensePresetId,
  AssetLicenseState,
  SongComposerState,
  VideoComposerState,
} from "./post-composer.types";

export function deriveComposerMode(attachment: AttachmentState): ComposerTab {
  if (!attachment) return "text";
  return attachment.kind;
}

export const attachmentKinds: AttachmentKind[] = ["link", "image", "video", "song", "live"];

export const tabMeta: Record<ComposerTab, { label: string; icon: React.ReactNode }> = {
  text: { label: "Text", icon: <TextT className="size-5" /> },
  image: { label: "Image", icon: <ImageIcon className="size-5" /> },
  video: { label: "Video", icon: <VideoCamera className="size-5" /> },
  link: { label: "Link", icon: <Link className="size-5" /> },
  song: { label: "Song", icon: <MusicNotes className="size-5" /> },
  live: { label: "Live", icon: <Microphone className="size-5" /> },
};

export const attachmentActions: Array<{
  kind: AttachmentKind;
  label: string;
  icon: React.ReactNode;
}> = [
  { kind: "link", label: "Link", icon: <Link className="size-6" /> },
  { kind: "image", label: "Image", icon: <ImageIcon className="size-6" /> },
  { kind: "video", label: "Video", icon: <VideoCamera className="size-6" /> },
  { kind: "song", label: "Song", icon: <MusicNotes className="size-6" /> },
  { kind: "live", label: "Live", icon: <Microphone className="size-6" /> },
];

export const defaultTabs: ComposerTab[] = ["text", "image", "video", "link", "song", "live"];
export const anonymousEligibleTabs: ComposerTab[] = ["text", "image", "video", "link"];

export const roomKindOptions: { value: LiveRoomKind; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "duet", label: "Duet" },
];

export const accessModeOptions: { value: LiveAccessMode; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "gated", label: "Gated" },
  { value: "paid", label: "Paid" },
];

export const visibilityOptions: { value: LiveVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" },
];

export const noneLanguageValue = "__none__";

export const songGenreOptions = [
  "Electronic",
  "Hip-hop",
  "Pop",
  "R&B",
  "Rock",
  "Ambient",
] as const;

export const songLanguageOptions = [
  "English",
  "Spanish",
  "French",
  "Japanese",
  "Korean",
  "Portuguese",
] as const;

export const assetLicensePresetIds: AssetLicensePresetId[] = [
  "non-commercial",
  "commercial-use",
  "commercial-remix",
];

export function defaultSongState(song?: SongComposerState): SongComposerState {
  return {
    title: song?.title ?? "",
    genre: song?.genre ?? "Electronic",
    geniusAnnotationsUrl: song?.geniusAnnotationsUrl ?? "",
    primaryLanguage: song?.primaryLanguage ?? "English",
    secondaryLanguage: song?.secondaryLanguage ?? "",
    primaryAudioUpload: song?.primaryAudioUpload ?? null,
    primaryAudioLabel: song?.primaryAudioLabel,
    coverUpload: song?.coverUpload ?? null,
    coverLabel: song?.coverLabel,
    coverSource: song?.coverSource,
    previewStartSeconds: song?.previewStartSeconds ?? "0",
    canvasVideoUpload: song?.canvasVideoUpload ?? null,
    canvasVideoLabel: song?.canvasVideoLabel,
    instrumentalAudioUpload: song?.instrumentalAudioUpload ?? null,
    instrumentalAudioLabel: song?.instrumentalAudioLabel,
    vocalAudioUpload: song?.vocalAudioUpload ?? null,
    vocalAudioLabel: song?.vocalAudioLabel,
  };
}

export function defaultAssetLicenseState(license?: AssetLicenseState): AssetLicenseState {
  const presetId = license?.presetId ?? "non-commercial";
  return {
    presetId,
    commercialRevSharePct: presetId === "commercial-remix"
      ? license?.commercialRevSharePct ?? 10
      : undefined,
  };
}

export function defaultVideoState(video?: VideoComposerState): VideoComposerState {
  return {
    primaryVideoAspectRatio: video?.primaryVideoAspectRatio,
    primaryVideoUpload: video?.primaryVideoUpload ?? null,
    primaryVideoLabel: video?.primaryVideoLabel,
    posterFrameSeconds: video?.posterFrameSeconds ?? "0",
  };
}

export function defaultMonetizationState(monetization?: MonetizationState): MonetizationState {
  return {
    visible: monetization?.visible ?? false,
    priceLabel: monetization?.priceLabel,
    priceUsd:
      monetization?.priceUsd ??
      monetization?.priceLabel?.replace(/[^0-9.]/g, "") ??
      "0",
    regionalPricingAvailable: monetization?.regionalPricingAvailable ?? false,
    regionalPricingEnabled: monetization?.regionalPricingEnabled ?? false,
    vinylReleaseUrl: monetization?.vinylReleaseUrl ?? "",
  };
}

export function defaultAudienceState(audience?: ComposerAudienceState): ComposerAudienceState {
  return {
    visibility: audience?.visibility ?? "public",
    publicOptionEnabled: audience?.publicOptionEnabled ?? true,
    publicOptionDisabledReason: audience?.publicOptionDisabledReason,
  };
}

export function defaultCharityContributionState(contribution?: CharityContributionState): CharityContributionState {
  return {
    percentagePct: contribution?.percentagePct ?? 0,
  };
}

export function defaultEventState(event?: ComposerEventState): ComposerEventState {
  return {
    enabled: event?.enabled ?? Boolean(event?.startsAt),
    startsAt: event?.startsAt,
    endsAt: event?.endsAt,
    timezone: event?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    locationName: event?.locationName,
    address: event?.address,
    isOnline: event?.isOnline ?? false,
    eventUrl: event?.eventUrl,
    place: event?.place,
  };
}

export function defaultLiveComposerState(live?: LiveComposerState): LiveComposerState {
  return {
    roomKind: live?.roomKind ?? "solo",
    accessMode: live?.accessMode ?? "free",
    visibility: live?.visibility ?? "public",
    scheduleForLater: live?.scheduleForLater ?? Boolean(live?.scheduleAt?.trim()),
    scheduleAt: live?.scheduleAt,
    description: live?.description,
    guestUserId: live?.guestUserId,
    storeUrl: live?.storeUrl,
    storeLabel: live?.storeLabel,
    coverUpload: live?.coverUpload ?? null,
    coverLabel: live?.coverLabel,
    trackOptions: live?.trackOptions,
    setlistItems: live?.setlistItems ?? [],
    setlistStatus: live?.setlistStatus ?? "draft",
    performerAllocations: live?.performerAllocations ?? [{ userId: "", role: "host", sharePct: 100 }],
  };
}

type MonetizationState = import("./post-composer.types").MonetizationState;
