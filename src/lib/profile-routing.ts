import type { Profile as ApiProfile } from "@pirate/api-contracts";

export function getProfileHandleLabel(profile: Pick<ApiProfile, "global_handle" | "primary_public_handle">): string {
  return profile.primary_public_handle?.label ?? profile.global_handle.label;
}

export function buildPublicProfilePath(handleLabel: string): string {
  return `/u/${encodeURIComponent(handleLabel)}`;
}

export function buildPublicProfilePathForProfile(
  profile: Pick<ApiProfile, "global_handle" | "primary_public_handle">,
): string {
  return buildPublicProfilePath(getProfileHandleLabel(profile));
}
