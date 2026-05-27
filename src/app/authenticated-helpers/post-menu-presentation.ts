import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

export function buildPostMenu(input: {
  canModeratePost?: boolean;
  onDelete?: () => void;
  onRemove?: () => void;
  post: Pick<ApiPost["post"], "status">;
  viewerIsAuthor?: boolean | null;
}) {
  const canDeletePost = input.post.status !== "deleted" && Boolean(input.viewerIsAuthor && input.onDelete);
  const canRemovePost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && !input.viewerIsAuthor
    && Boolean(input.canModeratePost && input.onRemove);
  const postMenuItems = [
    ...(canDeletePost ? [{ key: "delete", label: "Delete post", destructive: true }] : []),
    ...(canRemovePost ? [{ key: "remove", label: "Remove post", destructive: true }] : []),
  ];

  return {
    hasPostMenu: postMenuItems.length > 0,
    postMenuItems,
  };
}
