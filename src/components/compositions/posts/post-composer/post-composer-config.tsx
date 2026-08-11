import * as React from "react";
import {
  Image as ImageIcon,
  Link,
  Microphone,
  MusicNotes,
  VideoCamera,
} from "@phosphor-icons/react";
import type {
  AttachmentKind,
  CharityContributionState,
  ComposerAudienceState,
  ComposerEventState,
  ComposerTab,
  LiveComposerState,
  AssetLicenseState,
  AssetRoyaltySplitState,
  SongComposerState,
  VideoComposerState,
} from "./post-composer.types";

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
export const anonymousEligibleTabs: ComposerTab[] = ["text", "image", "video", "link", "song", "live"];

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

export function defaultAssetRoyaltySplitState(
  royaltySplit?: AssetRoyaltySplitState,
  currentUserWalletAddress?: string,
): AssetRoyaltySplitState {
  if (royaltySplit) return royaltySplit;
  return {
    allocations: [{
      id: "creator",
      recipientKind: "creator",
      walletAddress: currentUserWalletAddress,
      sharePct: 100,
    }],
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

export const defaultCharityContributionPct = 10;

export function defaultCharityContributionState(contribution?: CharityContributionState): CharityContributionState {
  return {
    percentagePct: contribution?.percentagePct ?? 0,
    userConfigured: contribution?.userConfigured,
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
    audienceGateMode: live?.audienceGateMode ?? "community_members",
    audienceGateTargetRefs: live?.audienceGateTargetRefs ?? [],
    visibility: live?.visibility ?? "public",
    scheduleForLater: live?.scheduleForLater ?? Boolean(live?.scheduleAt?.trim()),
    scheduleAt: live?.scheduleAt,
    description: live?.description,
    guestUserId: live?.guestUserId,
    storeUrl: live?.storeUrl,
    storeLabel: live?.storeLabel,
    coverUpload: live?.coverUpload ?? null,
    coverLabel: live?.coverLabel,
    recordingEnabled: live?.recordingEnabled ?? false,
    trackOptions: live?.trackOptions,
    setlistItems: live?.setlistItems ?? [],
    setlistStatus: live?.setlistStatus ?? "draft",
    performerAllocations: live?.performerAllocations ?? [{ userId: "", role: "host", sharePct: 100 }],
  };
}

type MonetizationState = import("./post-composer.types").MonetizationState;
