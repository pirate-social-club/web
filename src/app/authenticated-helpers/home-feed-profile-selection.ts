import type { HomeFeedItem, Profile } from "@pirate/api-contracts";

import type { ApiLiveRoomAccessResponse } from "@/lib/api/client-api-types";
import { normalizeUserId } from "@/app/authenticated-helpers/user-id";

export function selectRelevantHomeFeedProfiles(
  entry: HomeFeedItem,
  liveRoomAccess: ApiLiveRoomAccessResponse | undefined,
  profilesByUserId: Record<string, Profile | null>,
): ReadonlyArray<readonly [string, Profile | null]> {
  const userIds = new Set<string>();
  const addUserId = (userId: string | null | undefined) => {
    const normalizedUserId = normalizeUserId(userId);
    if (normalizedUserId) userIds.add(normalizedUserId);
  };

  addUserId(entry.post.post.author_user);
  addUserId(liveRoomAccess?.room.host_user);
  addUserId(liveRoomAccess?.room.guest_user);
  for (const allocation of liveRoomAccess?.room.performer_allocations ?? []) {
    addUserId(allocation.user);
  }

  return Array.from(userIds, (userId) => [userId, profilesByUserId[userId] ?? null] as const);
}
