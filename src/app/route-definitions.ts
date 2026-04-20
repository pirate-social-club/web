export const SETTINGS_SECTIONS = ["profile", "wallet", "preferences", "agents"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const COMMUNITY_MODERATION_SECTIONS = [
  "profile",
  "rules",
  "links",
  "labels",
  "donations",
  "pricing",
  "namespace",
  "gates",
  "safety",
  "agents",
] as const;
export type CommunityModerationSectionName = (typeof COMMUNITY_MODERATION_SECTIONS)[number];
