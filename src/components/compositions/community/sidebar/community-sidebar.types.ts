import type { CommunityMembershipMode } from "@/components/compositions/community/create-composer/create-community-composer.types";

;

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

interface CommunitySidebarFlairDefinition {
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

export interface CommunitySidebarRoleHolder {
  user: string;
  avatarSeed?: string | null;
  avatarSrc?: string | null;
  displayName: string;
  handle: string;
  nationalityBadgeCountryCode?: string | null;
  nationalityBadgeLabel?: string | null;
  role: "owner" | "admin" | "moderator";
}

export interface CommunitySidebarCharity {
  avatarSrc?: string | null;
  href?: string | null;
  name: string;
}

interface CommunitySidebarStore {
  label?: string | null;
  url: string;
}

export interface CommunitySidebarGateItem {
  detail?: string | null;
  gateId?: string | null;
  gateType: string;
  label: string;
  provider?: "self" | "very" | "passport" | null;
  status?: "unknown" | "met" | "unmet";
}

interface CommunitySidebarNamespacePanel {
  routeLabel: string;
  status: "available" | "pending" | "verified";
  onOpen?: () => void;
}

export interface CommunitySidebarProps {
  avatarSrc?: string | null;
  className?: string;
  charity?: CommunitySidebarCharity | null;
  createdAt: string | number;
  communityId?: string;
  description?: string | null;
  displayName: string;
  flairPolicy?: CommunitySidebarFlairPolicy | null;
  followerCount?: number | null;
  memberCount?: number | null;
  membershipMode: CommunityMembershipMode;
  owner?: CommunitySidebarRoleHolder | null;
  moderators: CommunitySidebarRoleHolder[];
  namespacePanel?: CommunitySidebarNamespacePanel | null;
  store?: CommunitySidebarStore | null;
  requirements?: string[];
  requirementsMode?: "all" | "any";
  gates?: CommunitySidebarGateItem[];
  gateExpressionLabel?: string | null;
  showFlatGateOrMarkers?: boolean;
  hasActionTimeCheck?: boolean;
  referenceLinks?: CommunitySidebarReferenceLink[];
  rules?: CommunitySidebarRule[];
}
