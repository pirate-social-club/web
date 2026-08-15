import { resolveApiBaseUrl } from "@/lib/api/base-url";

export function buildPostLiveRoomLaunch(input: {
  communityId?: string | null;
  liveRoomId?: string | null;
  postId?: string | null;
  seat?: "host" | "guest" | null;
}): { href: string; liveRoomId: string; shareUrl: string | null } | null {
  const liveRoomId = input.liveRoomId?.trim();
  const communityId = input.communityId?.trim();
  const postId = input.postId?.trim();
  if (!liveRoomId || !communityId) return null;
  const apiBase = resolveApiBaseUrl(typeof window === "undefined" ? null : window.location.hostname);
  const webBase = typeof window === "undefined" ? null : window.location.origin;
  const sharePath = postId ? `/p/${encodeURIComponent(postId)}` : null;
  const shareUrl = sharePath && typeof window !== "undefined"
    ? new URL(sharePath, window.location.origin).toString()
    : sharePath;
  const hrefParams = [
    `roomId=${encodeURIComponent(liveRoomId)}`,
    `communityId=${encodeURIComponent(communityId)}`,
    `apiBase=${encodeURIComponent(apiBase)}`,
  ];
  if (webBase) hrefParams.push(`webBase=${encodeURIComponent(webBase)}`);
  if (input.seat) hrefParams.push(`seat=${encodeURIComponent(input.seat)}`);
  return {
    href: `freedom://live-room?${hrefParams.join("&")}`,
    liveRoomId,
    shareUrl,
  };
}
