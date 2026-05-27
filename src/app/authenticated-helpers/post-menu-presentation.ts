import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

export function buildPostMenu(input: {
  canModeratePost?: boolean;
  onDelete?: () => void;
  onRemove?: () => void;
  onSetLabel?: () => void;
  post: Pick<ApiPost["post"], "status">;
  viewerIsAuthor?: boolean | null;
}) {
  const canDeletePost = input.post.status !== "deleted" && Boolean(input.viewerIsAuthor && input.onDelete);
  const canSetLabel = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && Boolean(input.canModeratePost && input.onSetLabel);
  const canRemovePost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && !input.viewerIsAuthor
    && Boolean(input.canModeratePost && input.onRemove);
  const postMenuItems = [
    ...(canDeletePost ? [{ key: "delete", label: "Delete post", destructive: true }] : []),
    ...(canSetLabel ? [{ key: "set-label", label: "Set tag" }] : []),
    ...(canRemovePost ? [{ key: "remove", label: "Remove post", destructive: true }] : []),
  ];

  return {
    hasPostMenu: postMenuItems.length > 0,
    postMenuItems,
  };
}
