export const SETTINGS_SECTIONS = ["profile", "domains", "preferences", "agents"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const COMMUNITY_MODERATION_SECTIONS = [
  "queue",
  "rights",
  "profile",
  "rules",
  "links",
  "labels",
  "donations",
  "pricing",
  "requests",
  "namespace",
  "handles",
  "gates",
  "safety",
  "visual-policy",
  "agents",
  "integrations",
  "assistant",
  "karaoke",
  "study",
  "telegram",
  "machine-access",
  "archive",
] as const;
export type CommunityModerationSectionName = (typeof COMMUNITY_MODERATION_SECTIONS)[number];
