export const SETTINGS_SECTIONS = ["profile", "domains", "preferences", "agents"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const COMMUNITY_MODERATION_SECTIONS = [
  "queue",
  "profile",
  "rules",
  "links",
  "labels",
  "donations",
  "pricing",
  "requests",
  "namespace",
  "gates",
  "safety",
  "visual-policy",
  "agents",
  "machine-access",
] as const;
export type CommunityModerationSectionName = (typeof COMMUNITY_MODERATION_SECTIONS)[number];
