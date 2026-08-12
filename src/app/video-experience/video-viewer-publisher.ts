import type { VideoFeedItem } from "@/components/compositions/posts/video-feed/video-feed.types";
import { sameUserId } from "@/app/authenticated-helpers/user-id";

type ViewerGateState = {
  viewer_community_role?: string | null;
  viewer_membership_status?: "member" | "not_member" | "banned" | null;
} | null | undefined;

/**
 * Resolves the publisher relationship for a video-viewer item. Gate-state
 * payloads take precedence over the embedded community payload; both the
 * seeded-item enrichment and the ranked-item mapping must agree, so the
 * resolution lives here exactly once.
 */
export function videoViewerPublisherRelationship(input: {
  authorUserId?: string | null;
  authorWalletAddress?: string | null;
  community?: ViewerGateState;
  currentUserId?: string | null;
  gateState?: ViewerGateState;
  identityMode: "anonymous" | "public";
  joinedLabel: string;
  joinLabel: string;
}): VideoFeedItem["publisher"]["relationship"] {
  const communityRole = input.gateState?.viewer_community_role
    ?? input.community?.viewer_community_role;
  const membershipStatus = input.gateState?.viewer_membership_status
    ?? input.community?.viewer_membership_status;
  if (input.identityMode === "public" && input.authorUserId) {
    return input.authorWalletAddress ? {
      kind: "follow",
      ownProfile: sameUserId(input.authorUserId, input.currentUserId),
      targetUserId: input.authorUserId,
      targetWalletAddress: input.authorWalletAddress,
    } : undefined;
  }
  const joined = communityRole != null || membershipStatus === "member";
  return {
    active: joined,
    disabled: joined || membershipStatus === "banned",
    kind: "join",
    label: joined ? input.joinedLabel : input.joinLabel,
  };
}
