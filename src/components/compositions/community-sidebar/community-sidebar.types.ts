import type { CommunityMembershipMode } from "@/lib/community-membership";

export type { CommunityMembershipMode };

export type ReferenceLinkPlatform =
  | "musicbrainz"
  | "genius"
  | "spotify"
  | "apple_music"
  | "wikipedia"
  | "instagram"
  | "tiktok"
  | "x"
  | "official_website"
  | "youtube"
  | "bandcamp"
  | "soundcloud"
  | "discord"
  | "other";

export interface CommunitySidebarRule {
  ruleId: string;
  title: string;
  body: string;
  position: number;
  status: "active" | "archived";
}

export interface CommunitySidebarReferenceLink {
  communityReferenceLinkId: string;
  platform: ReferenceLinkPlatform;
  url: string;
  label?: string | null;
  linkStatus: "active" | "archived";
  verified: boolean;
  metadata: {
    displayName?: string | null;
    imageUrl?: string | null;
  };
  position: number;
}

export interface CommunitySidebarFlairDefinition {
  flairId: string;
  label: string;
  colorToken?: string | null;
  status: "active" | "archived";
  position: number;
}

export interface CommunitySidebarFlairPolicy {
  flairEnabled: boolean;
  definitions: CommunitySidebarFlairDefinition[];
}

export interface CommunitySidebarModerator {
  avatarSrc?: string | null;
  displayName: string;
  handle: string;
}

export interface CommunitySidebarCharity {
  avatarSrc?: string | null;
  href?: string | null;
  name: string;
}

export interface CommunitySidebarProps {
  className?: string;
  charity?: CommunitySidebarCharity | null;
  createdAt: string;
  description?: string | null;
  displayName: string;
  flairPolicy?: CommunitySidebarFlairPolicy | null;
  memberCount?: number | null;
  membershipMode: CommunityMembershipMode;
  moderator?: CommunitySidebarModerator | null;
  referenceLinks?: CommunitySidebarReferenceLink[];
  rules?: CommunitySidebarRule[];
}
