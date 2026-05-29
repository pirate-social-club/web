import type { LocalizedPostResponse as ApiPost } from "@pirate/api-contracts";

export function buildPostMenu(input: {
  canModeratePost?: boolean;
  eventStatus?: string | null;
  onCancelEvent?: () => void;
  onDelete?: () => void;
  onRemove?: () => void;
  onReport?: () => void;
  onSetLabel?: () => void;
  post: Pick<ApiPost["post"], "status">;
  viewerIsAuthor?: boolean | null;
}) {
  const canDeletePost = input.post.status !== "deleted" && Boolean(input.viewerIsAuthor && input.onDelete);
  const canCancelEvent = input.post.status === "published"
    && input.eventStatus != null
    && input.eventStatus !== "canceled"
    && Boolean((input.viewerIsAuthor || input.canModeratePost) && input.onCancelEvent);
  const canSetLabel = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && Boolean(input.canModeratePost && input.onSetLabel);
  const canRemovePost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && !input.viewerIsAuthor
    && Boolean(input.canModeratePost && input.onRemove);
  const canReportPost = input.post.status !== "deleted"
    && input.post.status !== "removed"
    && Boolean(input.onReport);
  const postMenuItems = [
    ...(canReportPost ? [{ key: "report", label: "Report post", destructive: true }] : []),
    ...(canCancelEvent ? [{ key: "cancel-event", label: "Cancel event", destructive: true }] : []),
    ...(canDeletePost ? [{ key: "delete", label: "Delete post", destructive: true }] : []),
    ...(canSetLabel ? [{ key: "set-label", label: "Set tag" }] : []),
    ...(canRemovePost ? [{ key: "remove", label: "Remove post", destructive: true }] : []),
  ];

  return {
    hasPostMenu: postMenuItems.length > 0,
    postMenuItems,
  };
}
