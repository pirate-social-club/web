import * as React from "react";
import {
  CaretDown,
  Image as ImageIcon,
  Link,
  List,
  DotsThree,
  Microphone,
  MusicNote,
  Plus,
  SquaresFour,
  Tag,
  VideoCamera,
} from "@phosphor-icons/react";
import type {
  CharityContributionState,
  ComposerAudienceState,
  ComposerReference,
  ComposerTab,
  LiveAccessMode,
  LiveRoomKind,
  LiveVisibility,
  SongComposerState,
} from "./post-composer.types";

export const tabMeta: Record<ComposerTab, { label: string; icon: React.ReactNode }> = {
  text: { label: "Text", icon: <SquaresFour className="size-5" /> },
  image: { label: "Image", icon: <ImageIcon className="size-5" /> },
  video: { label: "Video", icon: <VideoCamera className="size-5" /> },
  link: { label: "Link", icon: <Link className="size-5" /> },
  song: { label: "Song", icon: <MusicNote className="size-5" /> },
  live: { label: "Live", icon: <Microphone className="size-5" /> },
};

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

export const fallbackTrackOptions: ComposerReference[] = [
  { id: "trk_01midnightwaves", title: "Midnight Waves", subtitle: "DJ Solar" },
  { id: "trk_01echoes", title: "Echoes", subtitle: "DJ Solar" },
  { id: "trk_01afterhours", title: "After Hours", subtitle: "DJ Solar" },
  { id: "trk_01blue", title: "Blue", subtitle: "Joni Mitchell" },
];

export const fallbackSourceOptions: ComposerReference[] = [
  { id: "ast_01abc", title: "Midnight Waves", subtitle: "DJ Solar" },
  { id: "ast_01def", title: "After Hours", subtitle: "DJ Solar" },
  { id: "ast_01ghi", title: "Blue", subtitle: "Joni Mitchell" },
];

export function defaultSongState(song?: SongComposerState): SongComposerState {
  return {
    genre: song?.genre ?? "Electronic",
    primaryLanguage: song?.primaryLanguage ?? "English",
    secondaryLanguage: song?.secondaryLanguage ?? "",
    primaryAudioUpload: song?.primaryAudioUpload ?? null,
    primaryAudioLabel: song?.primaryAudioLabel,
    coverUpload: song?.coverUpload ?? null,
    coverLabel: song?.coverLabel,
    previewAudioUpload: song?.previewAudioUpload ?? null,
    previewAudioLabel: song?.previewAudioLabel,
    canvasVideoUpload: song?.canvasVideoUpload ?? null,
    canvasVideoLabel: song?.canvasVideoLabel,
    instrumentalAudioUpload: song?.instrumentalAudioUpload ?? null,
    instrumentalAudioLabel: song?.instrumentalAudioLabel,
    vocalAudioUpload: song?.vocalAudioUpload ?? null,
    vocalAudioLabel: song?.vocalAudioLabel,
  };
}

export function defaultMonetizationState(monetization?: MonetizationState): MonetizationState {
  return {
    visible: monetization?.visible ?? false,
    priceLabel: monetization?.priceLabel,
    priceUsd:
      monetization?.priceUsd ??
      monetization?.priceLabel?.replace(/[^0-9.]/g, "") ??
      "1.00",
    regionalPricingAvailable: monetization?.regionalPricingAvailable ?? false,
    regionalPricingEnabled: monetization?.regionalPricingEnabled ?? false,
    rightsAttested: monetization?.rightsAttested ?? false,
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

type MonetizationState = import("./post-composer.types").MonetizationState;
