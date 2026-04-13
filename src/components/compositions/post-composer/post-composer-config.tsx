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
  ComposerReference,
  ComposerTab,
  LiveAccessMode,
  LiveRoomKind,
  LiveVisibility,
  SongComposerState,
  SongLicense,
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

export const licenseOptions: {
  value: SongLicense;
  label: string;
  description: string;
}[] = [
  {
    value: "non_commercial",
    label: "Non-commercial only",
    description: "Private listening and sharing. No commercial releases or paid derivatives.",
  },
  {
    value: "commercial_no_remix",
    label: "Commercial use (no remix)",
    description: "Monetization is allowed, but downstream remix derivatives stay closed.",
  },
  {
    value: "commercial_remix",
    label: "Commercial use + remix",
    description: "Commercial use stays open and licensed remix derivatives can flow through.",
  },
];

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

export function allowsCommercialUse(license?: SongLicense) {
  return license === "commercial_no_remix" || license === "commercial_remix";
}

export function formatLicenseLabel(license?: SongLicense) {
  switch (license) {
    case "non_commercial":
      return "Non-commercial only";
    case "commercial_no_remix":
      return "Commercial use (no remix)";
    case "commercial_remix":
      return "Commercial use + remix";
    default:
      return "Unconfigured";
  }
}

export function defaultSongState(song?: SongComposerState): SongComposerState {
  return {
    genre: song?.genre ?? "Electronic",
    primaryLanguage: song?.primaryLanguage ?? "English",
    secondaryLanguage: song?.secondaryLanguage ?? "",
    coverUpload: song?.coverUpload ?? null,
    coverLabel: song?.coverLabel,
  };
}

export function defaultMonetizationState(monetization?: MonetizationState): MonetizationState {
  return {
    visible: monetization?.visible ?? false,
    license: monetization?.license ?? "non_commercial",
    revenueSharePct: monetization?.revenueSharePct ?? 10,
    priceLabel: monetization?.priceLabel,
    priceUsd:
      monetization?.priceUsd ??
      monetization?.priceLabel?.replace(/[^0-9.]/g, "") ??
      "1.00",
    openEdition: monetization?.openEdition ?? true,
    maxSupply: monetization?.maxSupply ?? "250",
    donationAvailable: monetization?.donationAvailable ?? false,
    donationOptIn: monetization?.donationOptIn ?? false,
    donationPartnerId: monetization?.donationPartnerId,
    donationPartnerName: monetization?.donationPartnerName,
    donationSharePct: monetization?.donationSharePct ?? 10,
    rightsAttested: monetization?.rightsAttested ?? false,
  };
}

export function resolveDonationPartnerName(state: MonetizationState) {
  return state.donationPartnerName ?? "Community partner";
}

type MonetizationState = import("./post-composer.types").MonetizationState;
