import { buildCommunityPath } from "@/lib/community-routing";

export type CommunityModerationSection = "queue" | "profile" | "rules" | "links" | "labels" | "donations" | "pricing" | "requests" | "gates" | "safety" | "visual-policy" | "agents" | "assistant" | "telegram" | "machine-access" | "namespace" | "handles";

export const DEFAULT_COMMUNITY_MODERATION_SECTION: CommunityModerationSection = "queue";

export function buildCommunityModerationIndexPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return `${buildCommunityPath(communityId, routeSlug)}/mod`;
}

export function buildCommunityModerationPath(
  communityId: string,
  section: CommunityModerationSection,
  routeSlug?: string | null,
): string {
  return `${buildCommunityPath(communityId, routeSlug)}/mod/${section}`;
}

export function buildDefaultCommunityModerationPath(
  communityId: string,
  routeSlug?: string | null,
): string {
  return buildCommunityModerationPath(communityId, DEFAULT_COMMUNITY_MODERATION_SECTION, routeSlug);
}

export function buildCommunityModerationEntryPath(
  communityId: string,
  isMobileWeb: boolean,
  routeSlug?: string | null,
): string {
  return isMobileWeb
    ? buildCommunityModerationIndexPath(communityId, routeSlug)
    : buildDefaultCommunityModerationPath(communityId, routeSlug);
}
