// Shared deterministic fixtures for the post-card stories. All imagery is an
// inline SVG data URI derived from the seed, so stories render fully offline
// (the React stories hotlinked picsum/pravatar).

import type {
  PostCardByline,
  PostCardEvent,
  PostCardMenuItem,
  PostCardProps,
  PostCardShareAction,
  SongContentSpec,
} from "./types";

export function fixtureImage(seed: string, width = 600, height = 400): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const hue = hash % 360;
  const accentHue = (hue + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${hue} 45% 32%)"/><circle cx="${Math.round(width * 0.7)}" cy="${Math.round(height * 0.3)}" r="${Math.round(Math.min(width, height) * 0.25)}" fill="hsl(${accentHue} 60% 55%)" opacity="0.7"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const noop = () => undefined;

export const shareActionsFixture: PostCardShareAction[] = [
  { key: "crosspost", label: "Crosspost", icon: "crosspost", onSelect: noop },
  { key: "copy-link", label: "Copy link", icon: "link", onSelect: noop },
  { key: "native-share", label: "Share...", icon: "share", onSelect: noop },
];

export const ineligibleShareActionsFixture: PostCardShareAction[] = [
  { key: "copy-link", label: "Copy link", icon: "link", onSelect: noop },
  { key: "native-share", label: "Share...", icon: "share", onSelect: noop },
];

const menuItemsFixture: PostCardMenuItem[] = [
  { key: "save", label: "Save post" },
  { key: "hide", label: "Hide post" },
  { key: "report", label: "Report", destructive: true },
];

const baseBylineFixture: PostCardByline = {
  community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: fixtureImage("avatar-community", 100, 100) },
  author: { kind: "user", label: "u/kevin.tameimpala", href: "#", avatarSrc: fixtureImage("avatar-author", 100, 100) },
  timestampLabel: "9d",
};

/** Base post from the React post-card stories, minus `content`. */
export const basePostFixture: Omit<PostCardProps, "content"> = {
  viewContext: "home",
  byline: baseBylineFixture,
  title: "What's everyone listening to this week?",
  engagement: { score: 342, commentCount: 47 },
  shareActions: shareActionsFixture,
  menuItems: menuItemsFixture,
};

export const cityEventBylineFixture: PostCardByline = {
  community: { kind: "community", label: "c/tbilisi", href: "#", avatarSrc: fixtureImage("tbilisi-community", 80, 80) },
  author: { kind: "user", label: "u/nino", href: "#", avatarSrc: fixtureImage("avatar-nino", 100, 100) },
  timestampLabel: "18m",
};

export const communityMeetupEventFixture: PostCardEvent = {
  address: "14 Merab Kostava St",
  endsAt: "2026-06-05T18:00:00+04:00",
  locationName: "Auditorium Books",
  startsAt: "2026-06-05T16:30:00+04:00",
  status: "scheduled",
  timezone: "Asia/Tbilisi",
};

export const ticketedLinkEventFixture: PostCardEvent = {
  eventUrl: "https://ra.co/events/example-tbilisi",
  endsAt: "2026-06-12T23:30:00+04:00",
  locationName: "Left Bank",
  startsAt: "2026-06-12T20:00:00+04:00",
  status: "scheduled",
  timezone: "Asia/Tbilisi",
};

export const fabrikaPlaceFixture: NonNullable<PostCardEvent["place"]> = {
  address: "8 Egnate Ninoshvili St, Tbilisi",
  city: "Tbilisi",
  countryCode: "ge",
  label: "Fabrika",
  lat: 41.70982,
  lon: 44.80398,
  providerPlaceId: "geoapify:fabrika-tbilisi-storybook",
  source: "geoapify",
};

export const longTextPostBodyFixture = Array.from({ length: 26 }, (_, index) => (
  `Paragraph ${index + 1}: this field report is intentionally long so feed cards prove they do not occupy the entire viewport. It should preview enough text to be useful, then hand off to the full post page.`
)).join("\n\n");

/** Base song card content from the React song stories. */
export const baseSongFixture: SongContentSpec = {
  type: "song",
  title: "Midnight Waves",
  caption: "Built this around a late-night synth pass and a vocal chop from the bridge.",
  // artist omitted — same as post author (kevin.tameimpala), shown in byline
  artworkSrc: fixtureImage("pirate-song", 240, 240),
  durationLabel: "3:47",
  durationMs: 227000,
  accessMode: "public",
  playbackState: "idle",
};

/** Song-story post shell (community context, menu + share wired). */
export const songPostFixture: Omit<PostCardProps, "content"> = {
  viewContext: "community",
  byline: {
    community: { kind: "community", label: "c/tameimpala", href: "#", avatarSrc: fixtureImage("avatar-community", 100, 100) },
    author: { kind: "user", label: "u/kevin.tameimpala", href: "#" },
    timestampLabel: "5h",
  },
  title: "Just dropped this track - let me know what you think",
  engagement: { score: 891, commentCount: 63 },
  shareActions: shareActionsFixture,
  menuItems: [
    { key: "copy-link", label: "Copy link", icon: "link" },
    { key: "report", label: "Report", icon: "flag", destructive: true, separatorBefore: true },
  ],
  onMenuAction: noop,
};
