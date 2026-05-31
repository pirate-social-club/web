import { resolveApiBaseUrl } from "@/lib/api/base-url";

export function buildLiveRoomFreedomHref(input: {
  communityId?: string | null;
  liveRoomId?: string | null;
  postId?: string | null;
  seat?: "host" | "guest" | null;
}): string | undefined {
  const liveRoomId = input.liveRoomId?.trim();
  const communityId = input.communityId?.trim();
  if (!liveRoomId || !communityId) return undefined;
  const apiBase = resolveApiBaseUrl(typeof window === "undefined" ? null : window.location.hostname);
  const webBase = typeof window === "undefined" ? null : window.location.origin;
  const params = [
    `roomId=${encodeURIComponent(liveRoomId)}`,
    `communityId=${encodeURIComponent(communityId)}`,
    `apiBase=${encodeURIComponent(apiBase)}`,
  ];
  if (webBase) params.push(`webBase=${encodeURIComponent(webBase)}`);
  if (input.seat) params.push(`seat=${encodeURIComponent(input.seat)}`);
  if (input.postId?.trim()) params.push(`postId=${encodeURIComponent(input.postId.trim())}`);
  return `freedom://live-room?${params.join("&")}`;
}
