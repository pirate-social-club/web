import type { Profile as ApiProfile } from "@pirate/api-contracts";

import type { LiveRoomParticipant } from "@/components/compositions/posts/post-card/post-card.types";
import { buildPublicProfilePathForProfile } from "@/lib/profile-routing";
import {
  resolvePublicAuthorFallback,
  resolvePublicIdentityLabel,
} from "@/app/authenticated-helpers/post-identity-presentation";
import { normalizeUserId, sameUserId } from "@/app/authenticated-helpers/user-id";

type ProfileSummary = Pick<ApiProfile, "avatar_ref" | "display_name" | "global_handle" | "primary_public_handle">;

type LiveRoomParticipantSource = {
  guest_user?: string | null;
  host_user?: string | null;
  performer_allocations?: Array<{
    role?: "host" | "guest" | string | null;
    user?: string | null;
  }>;
};

type PostIdentityMode = "public" | "anonymous";

function participantFromUser(
  role: LiveRoomParticipant["role"],
  userId: string | null | undefined,
  profile: ProfileSummary | null | undefined,
  anonymousLabel?: string | null,
): LiveRoomParticipant | null {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) return null;

  if (anonymousLabel) {
    return {
      role,
      label: anonymousLabel,
    };
  }

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
  postAnonymousLabel,
  postAuthorUserId,
  postIdentityMode,
  profilesByUserId,
}: {
  authorProfile?: ProfileSummary | null;
  liveRoom?: LiveRoomParticipantSource | null;
  postAnonymousLabel?: string | null;
  postAuthorUserId?: string | null;
  postIdentityMode?: PostIdentityMode | null;
  profilesByUserId: Record<string, ProfileSummary | null | undefined>;
}): LiveRoomParticipant[] | undefined {
  if (!liveRoom?.guest_user) return undefined;

  const participants: LiveRoomParticipant[] = [];
  const seenUserIds = new Set<string>();

  function profileForUser(userId: string | null | undefined) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return sameUserId(normalizedUserId, postAuthorUserId) && authorProfile
      ? authorProfile
      : profilesByUserId[normalizedUserId] ?? null;
  }

  function addParticipant(role: LiveRoomParticipant["role"], userId: string | null | undefined) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId || seenUserIds.has(normalizedUserId)) return;
    const isAnonymousHost = role === "host"
      && postIdentityMode === "anonymous"
      && sameUserId(normalizedUserId, postAuthorUserId)
      && Boolean(postAnonymousLabel?.trim());
    const participant = participantFromUser(
      role,
      normalizedUserId,
      profileForUser(normalizedUserId),
      isAnonymousHost ? postAnonymousLabel?.trim() : null,
    );
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
