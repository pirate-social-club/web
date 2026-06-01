import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

import { getPirateNetworkConfig, type PirateStoryNetwork } from "@/lib/network-config";
import { buildStoryPortalAssetUrl } from "@/lib/story/story-portal";

type StoryAssetSummary = {
  story_ip?: string | null;
  story_royalty_registration_status?: "none" | "pending" | "registered" | "failed" | null;
} | null | undefined;

export function resolvePostStoryPortalHref(input: {
  asset?: StoryAssetSummary;
  fallbackAsset?: StoryAssetSummary;
  storyNetwork?: PirateStoryNetwork | null;
}): string | null {
  const storyAsset = input.asset ?? input.fallbackAsset;
  if (storyAsset?.story_royalty_registration_status !== "registered") {
    return null;
  }
  return buildStoryPortalAssetUrl(storyAsset.story_ip, input.storyNetwork ?? getPirateNetworkConfig().story.network);
}

export function buildPostMenu(input: {
  canModeratePost?: boolean;
  eventStatus?: string | null;
  onCancelEvent?: () => void;
  onDelete?: () => void;
  onRemove?: () => void;
  post: Pick<ApiPost["post"], "status">;
  storyPortalHref?: string | null;
  viewerIsAuthor?: boolean | null;
}) {
  const canDeletePost = input.post.status !== "deleted" && Boolean(input.viewerIsAuthor && input.onDelete);
  const canCancelEvent = input.post.status === "published"
    && input.eventStatus != null
    && input.eventStatus !== "canceled"
    && Boolean((input.viewerIsAuthor || input.canModeratePost) && input.onCancelEvent);
  const canRemovePost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && !input.viewerIsAuthor
    && Boolean(input.canModeratePost && input.onRemove);
  const canViewStoryAsset = input.post.status === "published" && Boolean(input.storyPortalHref);
  const postMenuItems = [
    ...(canViewStoryAsset ? [{ key: "view-story", label: "View on Story" }] : []),
    ...(canCancelEvent ? [{ key: "cancel-event", label: "Cancel event", destructive: true }] : []),
    ...(canDeletePost ? [{ key: "delete", label: "Delete post", destructive: true }] : []),
    ...(canRemovePost ? [{ key: "remove", label: "Remove post", destructive: true }] : []),
  ];

  return {
    hasPostMenu: postMenuItems.length > 0,
    postMenuItems,
  };
}
