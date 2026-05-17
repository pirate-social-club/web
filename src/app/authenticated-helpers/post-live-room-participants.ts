import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { LiveRoomParticipant } from "@/components/compositions/posts/post-card/post-card.types";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import {
  resolvePublicAuthorFallback,
  resolvePublicIdentityLabel,
} from "@/app/authenticated-helpers/post-identity-presentation";

type ProfileSummary = Pick<ApiProfile, "avatar_ref" | "display_name" | "global_handle" | "primary_public_handle">;

type LiveRoomParticipantSource = {
  guest_user?: string | null;
  host_user?: string | null;
  performer_allocations?: Array<{
    role?: "host" | "guest" | string | null;
    user?: string | null;
  }>;
};

function participantFromUser(
  role: LiveRoomParticipant["role"],
  userId: string | null | undefined,
  profile: ProfileSummary | null | undefined,
): LiveRoomParticipant | null {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) return null;

  return {
    role,
    label: resolvePublicIdentityLabel(profile) ?? resolvePublicAuthorFallback(normalizedUserId, profile),
    href: profile ? buildPublicProfilePathForProfile(profile) : undefined,
    avatarSrc: profile?.avatar_ref ?? undefined,
  };
}

export function buildLiveRoomParticipants({
  authorProfile,
  liveRoom,
  postAuthorUserId,
  profilesByUserId,
}: {
  authorProfile?: ProfileSummary | null;
  liveRoom?: LiveRoomParticipantSource | null;
  postAuthorUserId?: string | null;
  profilesByUserId: Record<string, ProfileSummary | null | undefined>;
}): LiveRoomParticipant[] | undefined {
  if (!liveRoom?.guest_user) return undefined;

  const participants: LiveRoomParticipant[] = [];
  const seenUserIds = new Set<string>();

  function profileForUser(userId: string | null | undefined) {
    if (!userId) return null;
    return userId === postAuthorUserId && authorProfile ? authorProfile : profilesByUserId[userId] ?? null;
  }

  function addParticipant(role: LiveRoomParticipant["role"], userId: string | null | undefined) {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId || seenUserIds.has(normalizedUserId)) return;
    const participant = participantFromUser(role, normalizedUserId, profileForUser(normalizedUserId));
    if (!participant) return;
    participants.push(participant);
    seenUserIds.add(normalizedUserId);
  }

  addParticipant("host", liveRoom.host_user);
  addParticipant("guest", liveRoom.guest_user);

  liveRoom.performer_allocations?.forEach((allocation) => {
    if (allocation.role !== "host" && allocation.role !== "guest") return;
    addParticipant(allocation.role, allocation.user);
  });

  return participants.length > 0 ? participants : undefined;
}
